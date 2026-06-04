// ─────────────────────────────────────────────────────────────
//  KAIROX – Wallet REST routes
// ─────────────────────────────────────────────────────────────

import { Router } from 'express'
import { supabaseAdmin }      from '../config/supabase.js'
import {
  processWithdrawal,
  getPlayerVaultBalance,
  getNativeBalance,
} from '../services/solanaService.js'

export const walletRouter = Router()

// GET /api/wallet/balance/:address
walletRouter.get('/balance/:address', async (req, res) => {
  const { address } = req.params
  try {
    const [native, vault] = await Promise.all([
      getNativeBalance(address),
      getPlayerVaultBalance(address),
    ])
    res.json({ native, vault, address })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/wallet/withdraw
walletRouter.post('/withdraw', async (req, res) => {
  const { walletAddress, amountSol, signedMessage, message } = req.body

  if (!walletAddress || !amountSol || !signedMessage || !message) {
    return res.status(400).json({ error: 'Missing required fields' })
  }
  if (typeof amountSol !== 'number' || amountSol <= 0) {
    return res.status(400).json({ error: 'Invalid amount' })
  }

  try {
    const result = await processWithdrawal({ walletAddress, amountSol, signedMessage, message })

    // Log to DB
    await supabaseAdmin.from('withdrawal_requests').insert({
      wallet_address: walletAddress,
      amount_sol:     amountSol,
      status:         result.status,
      tx_signature:   result.signature,
      request_id:     result.requestId,
    }).then(() => {}).catch(console.error)

    res.json(result)
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// GET /api/wallet/transactions/:address
walletRouter.get('/transactions/:address', async (req, res) => {
  const { address } = req.params
  const limit = Math.min(parseInt(req.query.limit as string || '20'), 100)

  const { data, error } = await supabaseAdmin
    .from('withdrawal_requests')
    .select('*')
    .eq('wallet_address', address)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ data })
})
