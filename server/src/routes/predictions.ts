// ─────────────────────────────────────────────────────────────
//  KAIROX – Predictions REST routes
// ─────────────────────────────────────────────────────────────

import { Router } from 'express'
import { supabaseAdmin } from '../config/supabase.js'
import { calcWeeklyLossBonus } from '../utils/gameLogic.js'
import { weeklyLossBonusService } from '../services/weeklyLossBonus.js'

export const predictionsRouter = Router()

// GET /api/predictions/:userId — prediction history
predictionsRouter.get('/:userId', async (req, res) => {
  const { userId } = req.params
  const limit  = Math.min(parseInt(req.query.limit as string || '50'), 200)
  const offset = parseInt(req.query.offset as string || '0')

  const { data, error } = await supabaseAdmin
    .from('predictions')
    .select('*, rounds(start_price, end_price, start_time, end_time)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ data, total: data?.length ?? 0 })
})

// GET /api/predictions/:userId/stats — aggregated stats
predictionsRouter.get('/:userId/stats', async (req, res) => {
  const { userId } = req.params
  const period = (req.query.period as string) || 'all'

  let query = supabaseAdmin
    .from('predictions')
    .select('outcome, sol_wagered, sol_won, is_degen, is_ghost, created_at')
    .eq('user_id', userId)

  if (period === 'week') {
    const wk = new Date(); wk.setUTCDate(wk.getUTCDate() - 7)
    query = query.gte('created_at', wk.toISOString())
  } else if (period === 'month') {
    const mo = new Date(); mo.setUTCMonth(mo.getUTCMonth() - 1)
    query = query.gte('created_at', mo.toISOString())
  }

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })

  const rows = data ?? []
  const wins   = rows.filter(r => r.outcome === 'WIN').length
  const losses = rows.filter(r => r.outcome === 'LOSS').length
  const draws  = rows.filter(r => r.outcome === 'DRAW').length
  const total  = rows.length
  const solWon  = rows.reduce((a, r) => a + (r.sol_won  as number), 0)
  const solLost = rows.reduce((a, r) => a + Math.max(0, (r.sol_wagered as number) - (r.sol_won as number)), 0)

  res.json({
    total,
    wins,
    losses,
    draws,
    winRate:  total ? +((wins / total) * 100).toFixed(1) : 0,
    solWon:   +solWon.toFixed(6),
    solLost:  +solLost.toFixed(6),
    netPnl:   +(solWon - solLost).toFixed(6),
  })
})

// GET /api/predictions/:userId/weekly-bonus — cashback eligibility
predictionsRouter.get('/:userId/weekly-bonus', async (req, res) => {
  const { userId } = req.params

  const wk = new Date(); wk.setUTCDate(wk.getUTCDate() - 7); wk.setUTCHours(0,0,0,0)

  const { data, error } = await supabaseAdmin
    .from('predictions')
    .select('sol_wagered, sol_won')
    .eq('user_id', userId)
    .eq('outcome', 'LOSS')
    .gte('created_at', wk.toISOString())

  if (error) return res.status(500).json({ error: error.message })

  const totalLost = (data ?? []).reduce((a, r) => a + Math.max(0, (r.sol_wagered as number) - (r.sol_won as number)), 0)
  const bonus     = calcWeeklyLossBonus(totalLost, 'LIVE')

  res.json({
    totalLost:     +totalLost.toFixed(6),
    eligible:      bonus.eligible,
    bonusAmount:   bonus.bonusAmount,
    bonusPct:      bonus.bonusPct,
    tier:          bonus.tier,
    nextPayoutMs:  weeklyLossBonusService.getNextPayoutMs(),
  })
})

// GET /api/predictions/:userId/chest-history
predictionsRouter.get('/:userId/chests', async (req, res) => {
  const { userId } = req.params
  const { data, error } = await supabaseAdmin
    .from('chest_rewards')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ data })
})
