// ─────────────────────────────────────────────────────────────
//  KAIROX – Server-side Solana Service
//  Handles: withdrawal execution, balance queries, on-chain
//  settlement calls (pay_winner via Anchor CPI)
// ─────────────────────────────────────────────────────────────

import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  clusterApiUrl,
  TransactionInstruction,
} from '@solana/web3.js'
import bs58 from 'bs58'

// ─── Config ───────────────────────────────────────────────────

const NETWORK    = (process.env.SOLANA_NETWORK ?? 'devnet') as 'mainnet-beta' | 'devnet'
const RPC_URL    = process.env.SOLANA_RPC_URL ?? clusterApiUrl(NETWORK)
const PROGRAM_ID = new PublicKey(
  process.env.PROGRAM_ID ?? 'KRXescrow11111111111111111111111111111111111'
)

export const WHALE_THRESHOLD_LAMPORTS = 1_000_000_000  // 1 SOL
export const MIN_WITHDRAW_LAMPORTS    =    10_000_000  // 0.01 SOL
export const MIN_DEPOSIT_LAMPORTS     =   100_000_000  // 0.1  SOL

// ─── Seeds (must match on-chain program) ─────────────────────

const SEEDS = {
  GAME_STATE:   Buffer.from('game_state'),
  PLAYER_VAULT: Buffer.from('player_vault'),
  ROUND_VAULT:  Buffer.from('round_vault'),
}

// ─── Singleton connection ─────────────────────────────────────

let _conn: Connection | null = null

export function getConnection(): Connection {
  if (!_conn) {
    _conn = new Connection(RPC_URL, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 30_000,
    })
    console.log(`[Solana] Connected to ${NETWORK} via ${RPC_URL.slice(0, 40)}…`)
  }
  return _conn
}

// ─── Authority keypair (server wallet) ───────────────────────
// In production, load from a KMS / secret manager — NEVER commit.

function getAuthorityKeypair(): Keypair {
  const key = process.env.AUTHORITY_PRIVATE_KEY
  if (!key) {
    console.warn('[Solana] AUTHORITY_PRIVATE_KEY not set — using ephemeral keypair (devnet only!)')
    return Keypair.generate()
  }
  return Keypair.fromSecretKey(bs58.decode(key))
}

// ─── PDA helpers ──────────────────────────────────────────────

export function getGameStatePDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([SEEDS.GAME_STATE], PROGRAM_ID)
}

export function getPlayerVaultPDA(player: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([SEEDS.PLAYER_VAULT, player.toBuffer()], PROGRAM_ID)
}

export function getRoundVaultPDA(roundId: string): [PublicKey, number] {
  const b = Buffer.alloc(32)
  Buffer.from(roundId).copy(b)
  return PublicKey.findProgramAddressSync([SEEDS.ROUND_VAULT, b], PROGRAM_ID)
}

// ─── Balance queries ──────────────────────────────────────────

export async function getPlayerVaultBalance(walletAddress: string): Promise<number> {
  try {
    const conn     = getConnection()
    const player   = new PublicKey(walletAddress)
    const [vault]  = getPlayerVaultPDA(player)
    const info     = await conn.getAccountInfo(vault, 'confirmed')
    if (!info) return 0
    // Vault.balance offset: 8 (discriminator) + 32 (pubkey) = 40
    const lamports = info.data.readBigUInt64LE(40)
    return Number(lamports) / LAMPORTS_PER_SOL
  } catch (err) {
    console.error('[Solana] getPlayerVaultBalance error:', err)
    return 0
  }
}

export async function getNativeBalance(walletAddress: string): Promise<number> {
  try {
    const conn   = getConnection()
    const pk     = new PublicKey(walletAddress)
    const lamps  = await conn.getBalance(pk, 'confirmed')
    return lamps / LAMPORTS_PER_SOL
  } catch {
    return 0
  }
}

// ─── Withdrawal (server-authorised) ──────────────────────────
// Player signs a message "KAIROX_WITHDRAW:amount:ts",
// server verifies signature then executes the on-chain tx.

export interface WithdrawRequest {
  walletAddress:  string
  amountSol:      number
  signedMessage:  string   // hex-encoded Ed25519 signature
  message:        string   // the original message string
}

export interface WithdrawResult {
  requestId:  string
  signature:  string | null
  status:     'instant' | 'queued' | 'failed'
  estimatedMs: number
}

export async function processWithdrawal(req: WithdrawRequest): Promise<WithdrawResult> {
  const { walletAddress, amountSol } = req
  const requestId = `wd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  if (amountSol * LAMPORTS_PER_SOL < MIN_WITHDRAW_LAMPORTS) {
    throw new Error(`Minimum withdrawal is ${MIN_WITHDRAW_LAMPORTS / LAMPORTS_PER_SOL} SOL`)
  }

  // Verify message signature (Ed25519)
  const msgBytes = new TextEncoder().encode(req.message)
  const sigBytes = Buffer.from(req.signedMessage, 'hex')
  const pkBytes  = new PublicKey(walletAddress).toBytes()

  const { verify } = await import('@noble/ed25519')
  const valid = await verify(sigBytes, msgBytes, pkBytes)
  if (!valid) throw new Error('Invalid signature — withdrawal rejected')

  // Validate message content (replay protection)
  const parts = req.message.split(':')  // KAIROX_WITHDRAW:amount:ts
  if (parts[0] !== 'KAIROX_WITHDRAW') throw new Error('Invalid message format')
  const ts = parseInt(parts[2], 10)
  if (Date.now() - ts > 5 * 60 * 1000) throw new Error('Message expired (> 5 min)')

  // For amounts < 1 SOL: execute immediately
  // For larger amounts: queue (can add a manual review step)
  const isLarge     = amountSol >= 1
  const estimatedMs = isLarge ? 120_000 : 5_000

  if (isLarge) {
    // Queue for async processing (in production: job queue / DB record)
    console.log(`[Solana] Queuing large withdrawal: ${amountSol} SOL to ${walletAddress}`)
    // TODO: insert into withdrawal_queue table, process in background worker
    return { requestId, signature: null, status: 'queued', estimatedMs }
  }

  // Execute on-chain via Anchor withdraw instruction
  try {
    const sig = await executeOnChainWithdrawal(walletAddress, amountSol)
    return { requestId, signature: sig, status: 'instant', estimatedMs: 0 }
  } catch (err: any) {
    console.error('[Solana] Withdrawal execution failed:', err)
    throw new Error(`Withdrawal failed: ${err.message}`)
  }
}

// ─── On-chain withdrawal ──────────────────────────────────────
// In a full Anchor setup, this would use the generated IDL client.
// Here we build a raw instruction matching the on-chain discriminator.

async function executeOnChainWithdrawal(walletAddress: string, amountSol: number): Promise<string> {
  const conn       = getConnection()
  const authority  = getAuthorityKeypair()
  const player     = new PublicKey(walletAddress)
  const lamports   = Math.floor(amountSol * LAMPORTS_PER_SOL)

  const [gameStatePDA] = getGameStatePDA()
  const [vaultPDA]     = getPlayerVaultPDA(player)

  // Anchor instruction discriminator: sha256("global:withdraw")[0:8]
  // Pre-computed: [183, 18, 70, 156, 148, 109, 161, 34]
  const discriminator = Buffer.from([183, 18, 70, 156, 148, 109, 161, 34])

  // Encode amount as little-endian u64
  const amountBuf = Buffer.alloc(8)
  amountBuf.writeBigUInt64LE(BigInt(lamports))

  const data = Buffer.concat([discriminator, amountBuf])

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: gameStatePDA, isSigner: false, isWritable: false },
      { pubkey: vaultPDA,     isSigner: false, isWritable: true  },
      { pubkey: authority.publicKey, isSigner: true, isWritable: false },
      { pubkey: player,       isSigner: true, isWritable: true   },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  })

  const tx = new Transaction().add(ix)
  const sig = await sendAndConfirmTransaction(conn, tx, [authority], {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  })

  console.log(`[Solana] Withdrawal ${amountSol} SOL → ${walletAddress}: ${sig}`)
  return sig
}

// ─── Payout winner after round settle ────────────────────────

export async function payWinnerOnChain(
  winnerAddress: string,
  roundId:       string,
  payoutSol:     number,
): Promise<string> {
  const conn      = getConnection()
  const authority = getAuthorityKeypair()
  const winner    = new PublicKey(winnerAddress)
  const lamports  = Math.floor(payoutSol * LAMPORTS_PER_SOL)

  const [gameStatePDA]  = getGameStatePDA()
  const [vaultPDA]      = getPlayerVaultPDA(winner)
  const [roundVaultPDA] = getRoundVaultPDA(roundId)

  // Anchor discriminator for pay_winner
  const discriminator = Buffer.from([152, 75, 213, 191, 31, 20, 108, 5])
  const roundBytes    = Buffer.alloc(32); Buffer.from(roundId).copy(roundBytes)
  const payoutBuf     = Buffer.alloc(8);  payoutBuf.writeBigUInt64LE(BigInt(lamports))
  const data          = Buffer.concat([discriminator, roundBytes, payoutBuf])

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: gameStatePDA,         isSigner: false, isWritable: true  },
      { pubkey: roundVaultPDA,        isSigner: false, isWritable: true  },
      { pubkey: vaultPDA,             isSigner: false, isWritable: true  },
      { pubkey: winner,               isSigner: false, isWritable: false },
      { pubkey: authority.publicKey,  isSigner: true,  isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  })

  const tx = new Transaction().add(ix)
  const sig = await sendAndConfirmTransaction(conn, tx, [authority], { commitment: 'confirmed' })

  console.log(`[Solana] Paid winner ${payoutSol} SOL → ${winnerAddress} (round ${roundId.slice(0,8)}): ${sig}`)
  return sig
}

// ─── Detect whale wager ───────────────────────────────────────

export function isWhale(lamports: number): boolean {
  return lamports >= WHALE_THRESHOLD_LAMPORTS
}
