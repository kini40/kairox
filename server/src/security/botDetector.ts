// ─────────────────────────────────────────────────────────────
//  KAIROX Security – Bot Detection Service
//
//  ATTACK PREVENTED: Automated prediction bots
//  Bots can exploit prediction games by:
//    1. Submitting faster than humans are capable of
//    2. Maintaining impossibly high win rates through
//       external price feeds or API sniping
//    3. Creating many accounts to multiply profits
//
//  DETECTION METHODS:
//    1. Submission timing analysis — bots submit in tight
//       millisecond windows; humans have natural variance
//    2. Win rate anomaly — statistical threshold flagging
//    3. IP-based multi-account detection
//    4. Consistent pattern detection across rounds
// ─────────────────────────────────────────────────────────────

import { supabaseAdmin }  from '../config/supabase.js'
import { securityLogger } from './securityLogger.js'

// Threshold constants
const BOT_TIMING_WINDOW_MS = 500    // suspicious if submitted within 500ms of round open
const BOT_TIMING_ROUNDS    = 10     // flag after 10 consecutive fast submissions
const HIGH_WINRATE_PCT      = 75    // >75% win rate is suspicious
const HIGH_WINRATE_MIN_PREDS = 20   // only flag after 20+ predictions
const MULTI_ACCOUNT_IP_LIMIT = 3    // warn at >3 accounts per IP

interface TimingRecord {
  submittedAt:   number   // epoch ms
  roundOpenedAt: number   // epoch ms
  elapsed:       number   // ms since round opened
}

interface UserBotProfile {
  timingHistory:  TimingRecord[]
  totalPreds:     number
  wins:           number
  flagged:        boolean
  flaggedAt:      number | null
  flagReason:     string | null
}

// In-memory bot profiles — socketId keyed for speed, persisted on flag
const profiles = new Map<string, UserBotProfile>()

// IP → account count tracker
const ipAccounts = new Map<string, Set<string>>()

class BotDetector {
  // ── Record a prediction and check for bot patterns ───────

  async recordPrediction(opts: {
    socketId:     string
    userId:       string | null
    ip:           string
    roundOpenedAt: number
    submittedAt:   number
    direction:     string
  }): Promise<{ flagged: boolean; reason?: string }> {
    const { socketId, userId, ip, roundOpenedAt, submittedAt } = opts
    const elapsed = submittedAt - roundOpenedAt

    // Get or create profile
    if (!profiles.has(socketId)) {
      profiles.set(socketId, {
        timingHistory:  [],
        totalPreds:     0,
        wins:           0,
        flagged:        false,
        flaggedAt:      null,
        flagReason:     null,
      })
    }

    const profile = profiles.get(socketId)!
    profile.totalPreds++

    // Record timing
    profile.timingHistory.push({ submittedAt, roundOpenedAt, elapsed })
    // Keep last 20 rounds
    if (profile.timingHistory.length > 20) profile.timingHistory.shift()

    // ── Check 1: Timing consistency ──────────────────────────
    // A bot typically submits in a very narrow time window after
    // each round opens. Humans have natural variance of seconds.
    if (profile.timingHistory.length >= BOT_TIMING_ROUNDS) {
      const recent    = profile.timingHistory.slice(-BOT_TIMING_ROUNDS)
      const fastCount = recent.filter(r => r.elapsed < BOT_TIMING_WINDOW_MS).length

      if (fastCount >= BOT_TIMING_ROUNDS) {
        return await this.flagUser({
          socketId, userId, ip,
          reason: `TIMING: ${fastCount}/${BOT_TIMING_ROUNDS} submissions within ${BOT_TIMING_WINDOW_MS}ms of round open`,
          eventType: 'BOT_TIMING_FLAG',
        })
      }
    }

    return { flagged: false }
  }

  // ── Check win rate after prediction settles ───────────────

  async checkWinRate(opts: {
    socketId: string
    userId:   string | null
    ip:       string
    won:      boolean
  }): Promise<{ flagged: boolean; reason?: string }> {
    const { socketId, userId, ip, won } = opts
    const profile = profiles.get(socketId)
    if (!profile) return { flagged: false }

    if (won) profile.wins++

    if (profile.totalPreds >= HIGH_WINRATE_MIN_PREDS) {
      const winRate = (profile.wins / profile.totalPreds) * 100
      if (winRate > HIGH_WINRATE_PCT && !profile.flagged) {
        return await this.flagUser({
          socketId, userId, ip,
          reason: `WIN_RATE: ${winRate.toFixed(1)}% over ${profile.totalPreds} predictions`,
          eventType: 'HIGH_WIN_RATE_FLAG',
        })
      }
    }

    return { flagged: false }
  }

  // ── IP-based multi-account detection ─────────────────────
  // Warns when >3 distinct userIds connect from the same IP.
  // Does NOT auto-ban (legitimate household/VPN use cases),
  // but flags for manual review.

  checkMultiAccount(ip: string, userId: string): boolean {
    if (!ip || ip === '127.0.0.1' || ip === '::1') return false  // ignore localhost

    if (!ipAccounts.has(ip)) ipAccounts.set(ip, new Set())
    const accounts = ipAccounts.get(ip)!

    if (userId) accounts.add(userId)

    if (accounts.size > MULTI_ACCOUNT_IP_LIMIT) {
      securityLogger.log({
        eventType: 'MULTI_ACCOUNT_IP',
        userId,
        ip,
        details:   { accountCount: accounts.size, ip },
        severity:  'MEDIUM',
      })
      return true
    }

    return false
  }

  // ── Flag a user ───────────────────────────────────────────

  private async flagUser(opts: {
    socketId:  string
    userId:    string | null
    ip:        string
    reason:    string
    eventType: 'BOT_TIMING_FLAG' | 'HIGH_WIN_RATE_FLAG'
  }): Promise<{ flagged: boolean; reason: string }> {
    const profile = profiles.get(opts.socketId)
    if (profile) {
      profile.flagged   = true
      profile.flaggedAt = Date.now()
      profile.flagReason = opts.reason
    }

    securityLogger.log({
      eventType: opts.eventType,
      userId:    opts.userId,
      ip:        opts.ip,
      socketId:  opts.socketId,
      details:   { reason: opts.reason },
      severity:  'HIGH',
    })

    // Persist flag to DB
    if (opts.userId) {
      await supabaseAdmin.from('users').update({
        bot_flag:        true,
        bot_flag_reason: opts.reason,
        bot_flagged_at:  new Date().toISOString(),
      }).eq('id', opts.userId).catch(console.error)
    }

    return { flagged: true, reason: opts.reason }
  }

  // ── Check if user is banned ───────────────────────────────

  async isBanned(userId: string): Promise<boolean> {
    const { data } = await supabaseAdmin
      .from('users')
      .select('banned')
      .eq('id', userId)
      .single()
    return data?.banned === true
  }

  getProfile(socketId: string): UserBotProfile | null {
    return profiles.get(socketId) ?? null
  }

  cleanup(socketId: string) {
    profiles.delete(socketId)
  }
}

export const botDetector = new BotDetector()
