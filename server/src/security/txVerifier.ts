// ─────────────────────────────────────────────────────────────
//  KAIROX Security – On-Chain Transaction Verifier
//
//  ATTACK PREVENTED: Double-spend / replay of deposit tx
//  An attacker could capture their deposit transaction
//  signature and submit it to our API multiple times to
//  credit their balance more than once. We prevent this by
//  storing every processed signature and rejecting duplicates.
//
//  ATTACK PREVENTED: Crediting unconfirmed transactions
//  Solana can revert transactions under certain conditions.
//  We require at least 1 confirmed block before crediting.
//
//  ATTACK PREVENTED: Crediting wrong-amount transactions
//  We verify the actual lamports transferred on-chain match
//  the claimed amount, preventing clients from lying about
//  how much they deposited.
// ─────────────────────────────────────────────────────────────

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { supabaseAdmin }  from '../config/supabase.js'
import { securityLogger } from './securityLogger.js'
import { getConnection }  from '../services/solanaService.js'

export interface VerifiedDeposit {
  valid:      boolean
  lamports:   number
  solAmount:  number
  error?:     string
}

// ── Duplicate signature check ─────────────────────────────────

export async function isSignatureProcessed(signature: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('processed_transactions')
    .select('signature')
    .eq('signature', signature)
    .single()
  return !!data
}

export async function markSignatureProcessed(
  signature:     string,
  userId:        string | null,
  amountLamports: number,
  txType:        'deposit' | 'withdrawal' | 'payout',
) {
  await supabaseAdmin.from('processed_transactions').insert({
    signature,
    user_id:        userId,
    amount_lamports: amountLamports,
    tx_type:        txType,
  })
}

// ── Transaction verification ──────────────────────────────────

export async function verifyDepositTransaction(opts: {
  signature:       string
  expectedPayer:   string   // wallet address that should have sent the SOL
  expectedReceiver: string  // vault PDA that should have received it
  expectedLamports: number  // claimed deposit amount
  userId:          string | null
}): Promise<VerifiedDeposit> {
  const { signature, expectedPayer, expectedReceiver, expectedLamports, userId } = opts

  // 1. Duplicate check — MUST happen before any other processing
  const alreadyProcessed = await isSignatureProcessed(signature)
  if (alreadyProcessed) {
    securityLogger.log({
      eventType: 'TX_DOUBLE_SPEND',
      userId,
      details:   { signature, expectedPayer },
      severity:  'CRITICAL',
    })
    return { valid: false, lamports: 0, solAmount: 0, error: 'Transaction already processed' }
  }

  const conn = getConnection()

  try {
    // 2. Fetch the transaction with confirmation status
    const tx = await conn.getTransaction(signature, {
      commitment:                 'confirmed',
      maxSupportedTransactionVersion: 0,
    })

    if (!tx) {
      return { valid: false, lamports: 0, solAmount: 0, error: 'Transaction not found on-chain' }
    }

    // 3. Check confirmation — require at least 1 confirmed slot
    if (!tx.meta || tx.meta.err) {
      securityLogger.log({
        eventType: 'TX_UNCONFIRMED',
        userId,
        details:   { signature, error: tx.meta?.err },
      })
      return { valid: false, lamports: 0, solAmount: 0, error: 'Transaction failed or not confirmed' }
    }

    // 4. Verify payer and receiver in account keys
    const accountKeys = tx.transaction.message.staticAccountKeys ?? []
    const payerIdx    = accountKeys.findIndex(k => k.toBase58() === expectedPayer)
    const receiverIdx = accountKeys.findIndex(k => k.toBase58() === expectedReceiver)

    if (payerIdx === -1) {
      return { valid: false, lamports: 0, solAmount: 0, error: 'Expected payer not in transaction' }
    }
    if (receiverIdx === -1) {
      return { valid: false, lamports: 0, solAmount: 0, error: 'Expected receiver not in transaction' }
    }

    // 5. Verify transferred lamports match claim
    //    Balance delta for receiver = postBalances[i] - preBalances[i]
    const preBalance  = tx.meta.preBalances[receiverIdx]  ?? 0
    const postBalance = tx.meta.postBalances[receiverIdx] ?? 0
    const actualLamports = postBalance - preBalance

    if (actualLamports <= 0) {
      return { valid: false, lamports: 0, solAmount: 0, error: 'No SOL transferred to vault' }
    }

    // Allow 1% slippage for rounding/fees
    const slippageBuffer = expectedLamports * 0.01
    if (Math.abs(actualLamports - expectedLamports) > slippageBuffer) {
      securityLogger.log({
        eventType: 'SERVER_PRICE_MISMATCH',
        userId,
        details:   { signature, expectedLamports, actualLamports },
        severity:  'HIGH',
      })
      return { valid: false, lamports: 0, solAmount: 0, error: `Amount mismatch: expected ${expectedLamports}, got ${actualLamports}` }
    }

    // 6. All checks passed — mark as processed
    await markSignatureProcessed(signature, userId, actualLamports, 'deposit')

    return {
      valid:     true,
      lamports:  actualLamports,
      solAmount: actualLamports / LAMPORTS_PER_SOL,
    }

  } catch (err: any) {
    console.error('[TxVerifier]', err)
    return { valid: false, lamports: 0, solAmount: 0, error: `Verification error: ${err.message}` }
  }
}

// ── Withdrawal signature proof ────────────────────────────────
// Player must sign a message to prove wallet ownership.
// This prevents a server-side attacker from draining vaults.

import { PublicKey as PK } from '@solana/web3.js'

export async function verifyWithdrawalSignature(opts: {
  walletAddress: string
  message:       string
  signatureHex:  string
}): Promise<{ valid: boolean; error?: string }> {
  try {
    const { verify }  = await import('@noble/ed25519')
    const msgBytes    = new TextEncoder().encode(opts.message)
    const sigBytes    = Buffer.from(opts.signatureHex, 'hex')
    const pubKeyBytes = new PK(opts.walletAddress).toBytes()

    const valid = await verify(sigBytes, msgBytes, pubKeyBytes)
    if (!valid) {
      securityLogger.log({
        eventType: 'WITHDRAWAL_SIGNATURE_INVALID',
        details:   { walletAddress: opts.walletAddress },
        severity:  'CRITICAL',
      })
    }
    return { valid }
  } catch (err: any) {
    return { valid: false, error: err.message }
  }
}
