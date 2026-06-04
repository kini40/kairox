// ─────────────────────────────────────────────────────────────
//  KAIROX – Live Feed Service
//  Tracks round predictions in-memory; emits win/loss flashes
//  after settlement so the feed entries update in real time.
// ─────────────────────────────────────────────────────────────

import type { Server as SocketIOServer } from 'socket.io'

export interface FeedEntry {
  id:        string
  socketId:  string
  userId:    string | null
  username:  string
  direction: 'UP' | 'DOWN'
  wager:     number
  mode:      'BETA' | 'LIVE'
  isGhost:   boolean
  isWhale:   boolean
  timestamp: number
  outcome:   'WIN' | 'LOSS' | 'DRAW' | 'NEAR_MISS' | null
  payout:    number
}

class FeedService {
  private io:      SocketIOServer | null = null
  private entries: FeedEntry[]           = []

  start(io: SocketIOServer) {
    this.io = io
  }

  // ── Add entry when prediction is submitted ────────────────

  addEntry(entry: Omit<FeedEntry, 'id' | 'outcome' | 'payout'>) {
    const full: FeedEntry = { ...entry, id: `fe_${Date.now()}_${entry.socketId.slice(0,4)}`, outcome: null, payout: 0 }
    this.entries.unshift(full)
    if (this.entries.length > 200) this.entries.splice(200)

    // Broadcast (ghost entries go as anonymous)
    const broadcast = entry.isGhost
      ? { ...full, username: '???', direction: 'UP' as const, wager: 0, isGhost: true }
      : full

    this.io?.emit('feed:new', broadcast)
    return full.id
  }

  // ── Flash result after round settles ─────────────────────

  flashResult(socketId: string, outcome: 'WIN' | 'LOSS' | 'DRAW' | 'NEAR_MISS', payout: number) {
    const entry = this.entries.find(e => e.socketId === socketId && e.outcome === null)
    if (!entry) return

    entry.outcome = outcome
    entry.payout  = payout

    // Emit a targeted flash event — all clients update their feed entries
    this.io?.emit('feed:result', {
      id:      entry.id,
      socketId,
      outcome,
      payout,
    })
  }

  // ── Round results summary (top 3 winners + biggest loser) ─

  getRoundSummary(): {
    topWinners:   Array<{ username: string; payout: number; direction: string }>
    biggestLoser: { username: string; lost: number } | null
  } {
    const settled = this.entries.filter(e => e.outcome !== null)

    const winners = settled
      .filter(e => e.outcome === 'WIN')
      .sort((a, b) => b.payout - a.payout)
      .slice(0, 3)
      .map(e => ({ username: e.isGhost ? '???' : e.username, payout: e.payout, direction: e.direction }))

    const losers = settled
      .filter(e => e.outcome === 'LOSS')
      .sort((a, b) => b.wager - a.wager)

    const biggestLoser = losers[0]
      ? { username: losers[0].isGhost ? '???' : losers[0].username, lost: losers[0].wager }
      : null

    return { topWinners: winners, biggestLoser }
  }

  clearRound() {
    // Keep last 50 for the display; clear outcome flags for new round
    this.entries = this.entries.slice(0, 50)
  }

  getRecent(limit = 50): FeedEntry[] {
    return this.entries.slice(0, limit)
  }
}

export const feedService = new FeedService()
