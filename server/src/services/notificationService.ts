// ─────────────────────────────────────────────────────────────
//  KAIROX – In-App Notification Service
// ─────────────────────────────────────────────────────────────

import type { Server as SocketIOServer } from 'socket.io'
import { onlineUsers } from './rivalService.js'

export type NotificationType =
  | 'rival_online'
  | 'cashback_ready'
  | 'streak_expiring'
  | 'rank_up'
  | 'chest_ready'
  | 'round_result'
  | 'rivalry_dominated'

export interface Notification {
  id:        string
  type:      NotificationType
  title:     string
  message:   string
  icon:      string
  timestamp: number
  read:      boolean
  meta?:     Record<string, unknown>
}

// Per-userId notification queue (in-memory, non-persistent)
const queues = new Map<string, Notification[]>()

class NotificationService {
  private io: SocketIOServer | null = null

  start(io: SocketIOServer) {
    this.io = io
  }

  // ── Push to a specific user ───────────────────────────────

  push(userId: string, notif: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
    const full: Notification = {
      ...notif,
      id:        `n_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      read:      false,
    }

    // Add to queue
    const q = queues.get(userId) ?? []
    q.unshift(full)
    if (q.length > 30) q.splice(30)  // cap at 30
    queues.set(userId, q)

    // Emit to socket if online
    const online = onlineUsers.get(userId)
    if (online?.socketId) {
      this.io?.to(online.socketId).emit('notification:new', full)
    }
  }

  // ── Broadcast round results to ALL connected clients ──────

  broadcastRoundResult(payload: {
    topWinners: Array<{ username: string; payout: number; direction: string }>
    biggestLoser: { username: string; lost: number } | null
  }) {
    this.io?.emit('round:top_results', payload)
  }

  // ── Getters ───────────────────────────────────────────────

  getQueue(userId: string): Notification[] {
    return queues.get(userId) ?? []
  }

  markRead(userId: string, notifId: string) {
    const q = queues.get(userId)
    if (!q) return
    const n = q.find(x => x.id === notifId)
    if (n) n.read = true
  }

  markAllRead(userId: string) {
    const q = queues.get(userId)
    if (q) q.forEach(n => { n.read = true })
  }

  unreadCount(userId: string): number {
    return (queues.get(userId) ?? []).filter(n => !n.read).length
  }

  // ── Typed helpers ─────────────────────────────────────────

  notifyRivalOnline(userId: string, rivalName: string) {
    this.push(userId, {
      type:    'rival_online',
      title:   'Rival Online!',
      message: `${rivalName} just joined the arena`,
      icon:    '⚔️',
    })
  }

  notifyCashbackReady(userId: string, amount: number) {
    this.push(userId, {
      type:    'cashback_ready',
      title:   'Weekly Cashback Ready!',
      message: `Claim your ${amount.toFixed(4)} SOL bonus`,
      icon:    '💰',
    })
  }

  notifyStreakExpiring(userId: string, hoursLeft: number) {
    this.push(userId, {
      type:    'streak_expiring',
      title:   'Login Streak Expiring!',
      message: `Only ${hoursLeft}h left to keep your streak`,
      icon:    '🔥',
    })
  }

  notifyRankUp(userId: string, newRank: string) {
    this.push(userId, {
      type:    'rank_up',
      title:   'Rank Up!',
      message: `You reached ${newRank}. Keep climbing!`,
      icon:    '🏆',
    })
  }

  notifyChestReady(userId: string) {
    this.push(userId, {
      type:    'chest_ready',
      title:   'Loot Chest Ready!',
      message: '5 predictions reached — open your chest',
      icon:    '🎁',
    })
  }

  notifyRivalryDominated(userId: string, rivalName: string) {
    this.push(userId, {
      type:    'rivalry_dominated',
      title:   'RIVALRY DOMINATED!',
      message: `You crushed ${rivalName} — +200 XP bonus awarded`,
      icon:    '👑',
      meta:    { xpBonus: 200 },
    })
  }
}

export const notificationService = new NotificationService()
