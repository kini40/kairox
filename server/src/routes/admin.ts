// ─────────────────────────────────────────────────────────────
//  KAIROX – Admin Routes  (password-protected, ops only)
// ─────────────────────────────────────────────────────────────

import { Router, type Request, type Response, type NextFunction } from 'express'
import { supabaseAdmin }          from '../config/supabase.js'
import { roundManager }           from '../services/roundManager.js'
import { priceFeedService }       from '../services/priceFeedService.js'
import { weeklyLossBonusService } from '../services/weeklyLossBonus.js'
import { securityLogger }         from '../security/securityLogger.js'

export const adminRouter = Router()

// ── Admin authentication middleware ──────────────────────────
// Uses a simple shared secret from env. In production, replace
// with short-lived JWT + MFA or IP allowlisting.
function adminAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers['x-admin-key'] as string
  const secret = process.env.ADMIN_SECRET_KEY

  if (!secret || token !== secret) {
    securityLogger.log({
      eventType: 'BANNED_USER_ATTEMPT',
      ip:        req.ip,
      details:   { route: req.path, reason: 'Invalid admin key' },
      severity:  'HIGH',
    })
    return res.status(403).json({ error: 'Forbidden' })
  }

  securityLogger.log({
    eventType: 'ADMIN_LOGIN',
    ip:        req.ip,
    details:   { path: req.path },
    severity:  'LOW',
  })
  next()
}
adminRouter.use(adminAuth)

// ── GET /api/admin/status — live game state ───────────────────
adminRouter.get('/status', (_req, res) => {
  res.json({
    round:        roundManager.currentRound,
    price:        priceFeedService.lastPrice,
    nextBonus:    weeklyLossBonusService.getNextPayoutMs(),
    serverTime:   Date.now(),
  })
})

// ── GET /api/admin/flags — flagged users queue ────────────────
adminRouter.get('/flags', async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id,username,wallet_address,bot_flag,bot_flag_reason,bot_flagged_at,banned,created_at,xp,total_predictions,correct_predictions')
    .eq('bot_flag', true)
    .order('bot_flagged_at', { ascending: false })
    .limit(100)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ data, count: data?.length ?? 0 })
})

// ── GET /api/admin/security-events — recent security log ──────
adminRouter.get('/security-events', async (req, res) => {
  const limit    = Math.min(parseInt(req.query.limit as string || '100'), 500)
  const severity = req.query.severity as string

  let query = supabaseAdmin
    .from('security_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (severity) query = query.eq('severity', severity.toUpperCase())

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json({ data })
})

// ── POST /api/admin/ban — ban a user ─────────────────────────
adminRouter.post('/ban', async (req, res) => {
  const { userId, reason } = req.body
  if (!userId) return res.status(400).json({ error: 'userId required' })

  const { error } = await supabaseAdmin
    .from('users')
    .update({ banned: true, ban_reason: reason ?? 'Admin action', banned_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) return res.status(500).json({ error: error.message })

  securityLogger.log({
    eventType: 'ADMIN_BAN_USER',
    ip:        req.ip,
    userId,
    details:   { reason },
    severity:  'HIGH',
  })

  // In production: kick active socket connection here
  res.json({ ok: true, message: `User ${userId} banned` })
})

// ── POST /api/admin/unban ─────────────────────────────────────
adminRouter.post('/unban', async (req, res) => {
  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: 'userId required' })

  await supabaseAdmin.from('users').update({
    banned: false, ban_reason: null, bot_flag: false, bot_flag_reason: null,
  }).eq('id', userId)

  res.json({ ok: true })
})

// ── GET /api/admin/house-pl — today's house profit/loss ───────
adminRouter.get('/house-pl', async (_req, res) => {
  const since = new Date()
  since.setUTCHours(0, 0, 0, 0)

  const { data, error } = await supabaseAdmin
    .from('predictions')
    .select('outcome, sol_wagered, sol_won')
    .gte('created_at', since.toISOString())

  if (error) return res.status(500).json({ error: error.message })

  const rows = data ?? []
  const totalWagered = rows.reduce((a, r) => a + (r.sol_wagered ?? 0), 0)
  const totalPaidOut = rows.reduce((a, r) => a + (r.sol_won    ?? 0), 0)
  const houseEdge    = totalWagered - totalPaidOut
  const predictions  = rows.length
  const wins         = rows.filter(r => r.outcome === 'WIN').length

  res.json({
    date:          since.toISOString().slice(0, 10),
    predictions,
    wins,
    totalWagered:  +totalWagered.toFixed(6),
    totalPaidOut:  +totalPaidOut.toFixed(6),
    houseEdge:     +houseEdge.toFixed(6),
    houseEdgePct:  totalWagered > 0 ? +((houseEdge / totalWagered) * 100).toFixed(2) : 0,
  })
})

// ── GET /api/admin/cashback-pool — weekly cashback liability ──
adminRouter.get('/cashback-pool', async (_req, res) => {
  const weekStart = new Date()
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay())
  weekStart.setUTCHours(0, 0, 0, 0)

  const { data } = await supabaseAdmin
    .from('predictions')
    .select('sol_wagered, sol_won, outcome')
    .gte('created_at', weekStart.toISOString())
    .eq('outcome', 'LOSS')

  const totalLoss    = (data ?? []).reduce((a, r) => a + Math.max(0, (r.sol_wagered ?? 0) - (r.sol_won ?? 0)), 0)
  const pendingPayout15 = totalLoss * 0.15
  const pendingPayout20 = totalLoss * 0.20

  res.json({
    weekStart:      weekStart.toISOString().slice(0, 10),
    totalLoss:      +totalLoss.toFixed(6),
    pendingAt15Pct: +pendingPayout15.toFixed(6),
    pendingAt20Pct: +pendingPayout20.toFixed(6),
    nextPayoutMs:   weeklyLossBonusService.getNextPayoutMs(),
  })
})

// ── GET /api/admin/processed-txns — double-spend audit ────────
adminRouter.get('/processed-txns', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string || '50'), 200)
  const { data, error } = await supabaseAdmin
    .from('processed_transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ data })
})

// ── POST /api/admin/weekly-bonus/trigger — manual payout ──────
adminRouter.post('/weekly-bonus/trigger', async (_req, res) => {
  await weeklyLossBonusService.triggerManual()
  res.json({ ok: true, message: 'Weekly bonus payout triggered' })
})

// ── GET /api/admin/weekly-bonus/next ──────────────────────────
adminRouter.get('/weekly-bonus/next', (_req, res) => {
  res.json({ nextPayoutMs: weeklyLossBonusService.getNextPayoutMs() })
})
