// ─────────────────────────────────────────────────────────────
//  KAIROX – Weekly Loss Bonus Cron Service
// ─────────────────────────────────────────────────────────────

import type { Server as SocketIOServer } from 'socket.io'
import { supabaseAdmin }    from '../config/supabase.js'
import { calcWeeklyLossBonus } from '../utils/gameLogic.js'

class WeeklyLossBonusService {
  private io:       SocketIOServer | null = null
  private interval: ReturnType<typeof setInterval> | null = null

  start(io: SocketIOServer) {
    this.io = io
    this.scheduleNextMonday()
    console.log('[WeeklyBonus] Scheduler started')
  }

  stop() {
    if (this.interval) clearInterval(this.interval)
  }

  // ── Schedule ──────────────────────────────────────────────────

  private scheduleNextMonday() {
    const msUntilMonday = this.msUntilNextMonday()
    console.log(`[WeeklyBonus] Next payout in ${Math.round(msUntilMonday / 3600000)}h`)

    // Use a one-shot timeout to land exactly on Monday 00:00 UTC,
    // then switch to weekly interval
    setTimeout(() => {
      this.runPayout()
      this.interval = setInterval(() => this.runPayout(), 7 * 24 * 60 * 60 * 1000)
    }, msUntilMonday)
  }

  private msUntilNextMonday(): number {
    const now  = new Date()
    const next = new Date(now)
    // Advance to next Monday 00:00 UTC
    const daysUntil = (8 - now.getUTCDay()) % 7 || 7  // 1=Mon … 0=Sun
    next.setUTCDate(now.getUTCDate() + daysUntil)
    next.setUTCHours(0, 0, 0, 0)
    return next.getTime() - now.getTime()
  }

  // ── Main payout logic ─────────────────────────────────────────

  async runPayout() {
    console.log('[WeeklyBonus] Running payout calculation...')

    try {
      // Get all users with losses in the past 7 days
      const weekStart = new Date()
      weekStart.setUTCDate(weekStart.getUTCDate() - 7)
      weekStart.setUTCHours(0, 0, 0, 0)

      const { data: lossRows, error } = await supabaseAdmin
        .from('predictions')
        .select('user_id, sol_wagered, sol_won, users!inner(id, username)')
        .eq('outcome', 'LOSS')
        .gte('created_at', weekStart.toISOString())

      if (error) throw error
      if (!lossRows?.length) {
        console.log('[WeeklyBonus] No losers this week')
        return
      }

      // Aggregate losses per user
      const lossMap = new Map<string, number>()
      for (const row of lossRows) {
        const uid  = row.user_id as string
        const loss = (row.sol_wagered as number) - (row.sol_won as number)
        lossMap.set(uid, (lossMap.get(uid) ?? 0) + Math.max(0, loss))
      }

      // Determine bonuses and credit
      for (const [userId, totalLoss] of lossMap.entries()) {
        const bonus = calcWeeklyLossBonus(totalLoss, 'LIVE')
        if (!bonus.eligible) continue

        // Record in weekly_loss_pool
        const weekStartStr = weekStart.toISOString().slice(0, 10)
        const { error: insertErr } = await supabaseAdmin
          .from('weekly_loss_pool')
          .upsert({
            user_id:       userId,
            week_start:    weekStartStr,
            total_lost:    totalLoss,
            bonus_claimed: true,
            bonus_amount:  bonus.bonusAmount,
          }, { onConflict: 'user_id,week_start' })

        if (insertErr) { console.error('[WeeklyBonus] upsert error', insertErr); continue }

        // Credit the bonus as SOL won to the user (in a real system this would
        // create a withdrawal request or deposit SOL on-chain)
        await supabaseAdmin.rpc('credit_weekly_bonus', {
          p_user_id: userId,
          p_amount:  bonus.bonusAmount,
        }).catch(console.error)

        // Notify via socket if user is online
        this.notifyUser(userId, bonus.bonusAmount, bonus.tier)

        console.log(`[WeeklyBonus] Credited ${bonus.bonusAmount.toFixed(4)} SOL (${bonus.tier}) to ${userId}`)
      }

      console.log(`[WeeklyBonus] Payout complete. Processed ${lossMap.size} users.`)
    } catch (err) {
      console.error('[WeeklyBonus] Error during payout:', err)
    }
  }

  private notifyUser(userId: string, amount: number, tier: string) {
    this.io?.emit(`user:${userId}:bonus`, {
      type:    'weekly_cashback',
      amount,
      tier,
      message: `Weekly cashback! You received ${amount.toFixed(4)} SOL back (${tier} tier)`,
    })
  }

  // ── Manual trigger (for admin / testing) ─────────────────────

  async triggerManual() {
    await this.runPayout()
  }

  // ── Next payout countdown ─────────────────────────────────────

  getNextPayoutMs(): number {
    return this.msUntilNextMonday()
  }
}

export const weeklyLossBonusService = new WeeklyLossBonusService()
