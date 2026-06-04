// ─────────────────────────────────────────────────────────────
//  KAIROX – Leaderboard Service (DB + real-time refresh)
// ─────────────────────────────────────────────────────────────

import type { Server as SocketIOServer } from 'socket.io'
import { supabaseAdmin } from '../config/supabase.js'

export type LBPeriod = 'daily' | 'weekly' | 'alltime'

export interface LBEntry {
  rank:              number
  userId:            string
  username:          string
  oracleRank:        string
  totalPredictions:  number
  correctPredictions:number
  winRate:           number
  solWon:            number
  solLost:           number
  xp:                number
  streak:            number
  walletAddress:     string | null
}

export interface LBSnapshot {
  period:    LBPeriod
  entries:   LBEntry[]
  updatedAt: number
  biggestWinToday:  { username: string; amount: number } | null
  biggestLossToday: { username: string; amount: number } | null
}

// Cache snapshots to avoid hammering DB every 30s
const cache = new Map<LBPeriod, { snapshot: LBSnapshot; cachedAt: number }>()
const CACHE_TTL = 29_000  // 29s

class LeaderboardService {
  private io:           SocketIOServer | null = null
  private refreshTimer: ReturnType<typeof setInterval> | null = null

  start(io: SocketIOServer) {
    this.io = io
    // Auto-refresh every 30s and broadcast to all clients
    this.refreshTimer = setInterval(() => this.refreshAndBroadcast(), 30_000)
  }

  stop() {
    if (this.refreshTimer) clearInterval(this.refreshTimer)
  }

  // ── Fetch leaderboard ─────────────────────────────────────

  async fetch(period: LBPeriod, forceRefresh = false): Promise<LBSnapshot> {
    const cached = cache.get(period)
    if (!forceRefresh && cached && Date.now() - cached.cachedAt < CACHE_TTL) {
      return cached.snapshot
    }

    try {
      const snapshot = await this.buildSnapshot(period)
      cache.set(period, { snapshot, cachedAt: Date.now() })
      return snapshot
    } catch (err) {
      console.error('[LB] fetch error:', err)
      return cached?.snapshot ?? this.emptySnapshot(period)
    }
  }

  private async buildSnapshot(period: LBPeriod): Promise<LBSnapshot> {
    let query = supabaseAdmin
      .from('leaderboard')
      .select(`
        rank, score, user_id,
        users!inner(
          id, username, rank, xp,
          total_predictions, correct_predictions,
          streak_current, wallet_address
        )
      `)
      .eq('period', period)
      .order('rank', { ascending: true })
      .limit(100)

    const { data: lbRows, error } = await query
    if (error) throw error

    // Get SOL won/lost per user for the period
    const userIds = (lbRows ?? []).map((r: any) => r.user_id)
    let solMap: Record<string, { won: number; lost: number }> = {}

    if (userIds.length > 0) {
      const since = period === 'daily'
        ? new Date(Date.now() - 86_400_000).toISOString()
        : period === 'weekly'
        ? new Date(Date.now() - 7 * 86_400_000).toISOString()
        : '2000-01-01'

      const { data: preds } = await supabaseAdmin
        .from('predictions')
        .select('user_id, sol_wagered, sol_won, outcome')
        .in('user_id', userIds)
        .gte('created_at', since)

      for (const p of preds ?? []) {
        if (!solMap[p.user_id]) solMap[p.user_id] = { won: 0, lost: 0 }
        solMap[p.user_id].won  += p.sol_won ?? 0
        if (p.outcome === 'LOSS') {
          solMap[p.user_id].lost += Math.max(0, (p.sol_wagered ?? 0) - (p.sol_won ?? 0))
        }
      }
    }

    const entries: LBEntry[] = (lbRows ?? []).map((row: any) => {
      const u   = row.users as any
      const sol = solMap[row.user_id] ?? { won: 0, lost: 0 }
      return {
        rank:              row.rank,
        userId:            row.user_id,
        username:          u.username,
        oracleRank:        u.rank,
        totalPredictions:  u.total_predictions,
        correctPredictions:u.correct_predictions,
        winRate:           u.total_predictions > 0
          ? +((u.correct_predictions / u.total_predictions) * 100).toFixed(1)
          : 0,
        solWon:            +sol.won.toFixed(4),
        solLost:           +sol.lost.toFixed(4),
        xp:                u.xp,
        streak:            u.streak_current,
        walletAddress:     u.wallet_address,
      }
    })

    // Biggest win/loss today
    const since24h = new Date(Date.now() - 86_400_000).toISOString()

    const { data: bigWinRow } = await supabaseAdmin
      .from('predictions')
      .select('sol_won, users!inner(username)')
      .eq('outcome', 'WIN')
      .gte('created_at', since24h)
      .order('sol_won', { ascending: false })
      .limit(1)

    const { data: bigLossRow } = await supabaseAdmin
      .from('predictions')
      .select('sol_wagered, sol_won, users!inner(username)')
      .eq('outcome', 'LOSS')
      .gte('created_at', since24h)
      .order('sol_wagered', { ascending: false })
      .limit(1)

    const bigWin  = bigWinRow?.[0]
      ? { username: (bigWinRow[0] as any).users.username, amount: (bigWinRow[0] as any).sol_won }
      : null
    const bigLoss = bigLossRow?.[0]
      ? { username: (bigLossRow[0] as any).users.username, amount: (bigLossRow[0] as any).sol_wagered - (bigLossRow[0] as any).sol_won }
      : null

    return { period, entries, updatedAt: Date.now(), biggestWinToday: bigWin, biggestLossToday: bigLoss }
  }

  private emptySnapshot(period: LBPeriod): LBSnapshot {
    return { period, entries: [], updatedAt: Date.now(), biggestWinToday: null, biggestLossToday: null }
  }

  // ── Broadcast on schedule ─────────────────────────────────

  private async refreshAndBroadcast() {
    for (const period of ['daily','weekly','alltime'] as LBPeriod[]) {
      const snapshot = await this.fetch(period, true)
      this.io?.emit(`leaderboard:update:${period}`, snapshot)
    }
  }

  async refreshNow() {
    await this.refreshAndBroadcast()
  }
}

export const leaderboardService = new LeaderboardService()
