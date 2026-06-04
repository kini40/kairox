// ─────────────────────────────────────────────────────────────
//  KAIROX – Solana Transaction Utilities
// ─────────────────────────────────────────────────────────────

import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  TransactionSignature,
  Commitment,
  clusterApiUrl,
  TransactionInstruction,
} from '@solana/web3.js'
import type { WalletContextState } from '@solana/wallet-adapter-react'

// ─── Network config ──────────────────────────────────────────

export type SolanaNetwork = 'mainnet-beta' | 'devnet' | 'testnet'

export const NETWORK: SolanaNetwork =
  (import.meta.env.VITE_SOLANA_NETWORK as SolanaNetwork) || 'devnet'

export const RPC_URL: string =
  import.meta.env.VITE_SOLANA_RPC_URL ||
  (NETWORK === 'mainnet-beta'
    ? 'https://mainnet.helius-rpc.com/?api-key=YOUR_KEY'
    : clusterApiUrl('devnet'))

export const EXPLORER_BASE =
  NETWORK === 'mainnet-beta'
    ? 'https://solscan.io'
    : 'https://explorer.solana.com'

export const EXPLORER_CLUSTER = NETWORK === 'mainnet-beta' ? '' : `?cluster=${NETWORK}`

// ─── Program / PDA constants ─────────────────────────────────

export const PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_PROGRAM_ID || 'KRXescrow11111111111111111111111111111111111'
)

export const SEEDS = {
  GAME_STATE:   Buffer.from('game_state'),
  PLAYER_VAULT: Buffer.from('player_vault'),
  ROUND_VAULT:  Buffer.from('round_vault'),
}

export const MIN_DEPOSIT_SOL  = 0.1
export const MIN_WAGER_SOL    = 0.001
export const MAX_WAGER_SOL    = 10
export const WHALE_THRESHOLD  = 1.0   // SOL

// ─── Connection singleton ─────────────────────────────────────

let _connection: Connection | null = null

export function getConnection(commitment: Commitment = 'confirmed'): Connection {
  if (!_connection) {
    _connection = new Connection(RPC_URL, {
      commitment,
      wsEndpoint:         import.meta.env.VITE_SOLANA_WS_URL,
      confirmTransactionInitialTimeout: 30_000,
    })
  }
  return _connection
}

// ─── PDA derivation ───────────────────────────────────────────

export async function getGameStatePDA(): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddressSync([SEEDS.GAME_STATE], PROGRAM_ID)
}

export async function getPlayerVaultPDA(player: PublicKey): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddressSync(
    [SEEDS.PLAYER_VAULT, player.toBuffer()],
    PROGRAM_ID,
  )
}

export async function getRoundVaultPDA(roundId: string): Promise<[PublicKey, number]> {
  const roundBytes = Buffer.alloc(32)
  Buffer.from(roundId).copy(roundBytes)
  return PublicKey.findProgramAddressSync([SEEDS.ROUND_VAULT, roundBytes], PROGRAM_ID)
}

// ─── Balance helpers ──────────────────────────────────────────

export async function getSOLBalance(pubkey: PublicKey): Promise<number> {
  const conn = getConnection()
  const lamports = await conn.getBalance(pubkey, 'confirmed')
  return lamports / LAMPORTS_PER_SOL
}

export async function getVaultBalance(player: PublicKey): Promise<number> {
  const conn = getConnection()
  const [vaultPDA] = PublicKey.findProgramAddressSync(
    [SEEDS.PLAYER_VAULT, player.toBuffer()],
    PROGRAM_ID,
  )
  try {
    const info = await conn.getAccountInfo(vaultPDA, 'confirmed')
    if (!info) return 0
    // Balance is at offset 40 (8 discriminator + 32 pubkey) — 8 bytes u64 little-endian
    const balance = info.data.readBigUInt64LE(40)
    return Number(balance) / LAMPORTS_PER_SOL
  } catch {
    return 0
  }
}

// ─── SOL ↔ lamports ───────────────────────────────────────────

export const toLamports = (sol: number) => Math.floor(sol * LAMPORTS_PER_SOL)
export const toSOL      = (lamports: number | bigint) => Number(lamports) / LAMPORTS_PER_SOL

// ─── Explorer links ───────────────────────────────────────────

export function txExplorerUrl(sig: string): string {
  return NETWORK === 'mainnet-beta'
    ? `${EXPLORER_BASE}/tx/${sig}`
    : `${EXPLORER_BASE}/tx/${sig}${EXPLORER_CLUSTER}`
}

export function addressExplorerUrl(addr: string): string {
  return NETWORK === 'mainnet-beta'
    ? `${EXPLORER_BASE}/account/${addr}`
    : `${EXPLORER_BASE}/address/${addr}${EXPLORER_CLUSTER}`
}

// ─── Transaction confirmation ─────────────────────────────────

export interface ConfirmedTx {
  signature: string
  slot:      number
  err:       unknown
}

export async function confirmTx(
  sig:        TransactionSignature,
  timeout_ms: number = 30_000,
): Promise<ConfirmedTx> {
  const conn = getConnection()
  const start = Date.now()

  while (Date.now() - start < timeout_ms) {
    const status = await conn.getSignatureStatus(sig, {
      searchTransactionHistory: true,
    })
    if (status.value) {
      const { confirmationStatus, err, slot } = status.value
      if (err)  throw new Error(`Transaction failed: ${JSON.stringify(err)}`)
      if (confirmationStatus === 'confirmed' || confirmationStatus === 'finalized') {
        return { signature: sig, slot: slot ?? 0, err: null }
      }
    }
    await sleep(1500)
  }
  throw new Error(`Transaction not confirmed within ${timeout_ms}ms: ${sig}`)
}

// ─── Send & confirm helper ────────────────────────────────────

export async function sendAndConfirm(
  wallet:      WalletContextState,
  transaction: Transaction,
): Promise<string> {
  if (!wallet.publicKey || !wallet.sendTransaction) {
    throw new Error('Wallet not connected')
  }

  const conn = getConnection()

  // Get fresh blockhash
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash('confirmed')
  transaction.recentBlockhash = blockhash
  transaction.feePayer        = wallet.publicKey

  const sig = await wallet.sendTransaction(transaction, conn, {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  })

  // Wait for confirmation
  await conn.confirmTransaction(
    { signature: sig, blockhash, lastValidBlockHeight },
    'confirmed',
  )

  return sig
}

// ─── High-level actions (call server for program instruction) ─

export interface DepositResult {
  signature: string
  newBalance: number
}

/**
 * Deposit SOL into player vault.
 * Creates a simple system transfer to the vault PDA —
 * in production this calls the Anchor `deposit` instruction.
 */
export async function depositSOL(
  wallet:        WalletContextState,
  amountSol:     number,
): Promise<DepositResult> {
  if (!wallet.publicKey) throw new Error('Wallet not connected')
  if (amountSol < MIN_DEPOSIT_SOL) throw new Error(`Minimum deposit is ${MIN_DEPOSIT_SOL} SOL`)

  const lamports   = toLamports(amountSol)
  const [vaultPDA] = PublicKey.findProgramAddressSync(
    [SEEDS.PLAYER_VAULT, wallet.publicKey.toBuffer()],
    PROGRAM_ID,
  )

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey:   vaultPDA,
      lamports,
    })
  )

  const sig = await sendAndConfirm(wallet, tx)

  // Fetch updated vault balance
  const newBalance = await getVaultBalance(wallet.publicKey)

  return { signature: sig, newBalance }
}

/**
 * Request withdrawal — server validates and calls Anchor `withdraw`.
 * Client sends a signed "intent" message; server builds + submits the program tx.
 */
export async function requestWithdrawal(
  wallet:    WalletContextState,
  amountSol: number,
): Promise<{ requestId: string }> {
  if (!wallet.publicKey || !wallet.signMessage) throw new Error('Wallet not connected')

  const msg     = `KAIROX_WITHDRAW:${amountSol}:${Date.now()}`
  const msgBytes = new TextEncoder().encode(msg)
  const sig      = await wallet.signMessage(msgBytes)
  const sigHex   = Buffer.from(sig).toString('hex')

  // Call server API — server executes on-chain tx
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/wallet/withdraw`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      walletAddress: wallet.publicKey.toBase58(),
      amountSol,
      signedMessage: sigHex,
      message: msg,
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Withdrawal failed')
  }

  return res.json()
}

// ─── Utility ──────────────────────────────────────────────────

export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export function truncateAddress(addr: string, chars = 4): string {
  return `${addr.slice(0, chars)}...${addr.slice(-chars)}`
}

export function isWhale(amountSol: number): boolean {
  return amountSol >= WHALE_THRESHOLD
}

export function formatSOL(lamports: number): string {
  return (lamports / LAMPORTS_PER_SOL).toFixed(4)
}
