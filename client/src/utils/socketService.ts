// ─────────────────────────────────────────────────────────────
//  KAIROX – Socket Service  (complete social edition)
// ─────────────────────────────────────────────────────────────

import { io, Socket } from 'socket.io-client'
import { useGameStore }   from '../store/gameStore'
import { useUIStore }     from '../store/uiStore'
import { useWalletStore } from '../store/walletStore'
import { useSocialStore } from '../store/socialStore'

class SocketService {
  private socket: Socket | null = null
  private reconnects = 0
  private readonly MAX_RECONNECTS = 8

  connect() {
    if (this.socket?.connected) return
    const url = import.meta.env.VITE_WS_URL || 'http://localhost:4000'
    this.socket = io(url, {
      transports: ['websocket','polling'],
      reconnectionAttempts: this.MAX_RECONNECTS,
      reconnectionDelay: 1500,
      timeout: 12000,
      withCredentials: true,
    })
    this.register()
  }

  disconnect() {
    this.socket?.disconnect()
    this.socket = null
  }

  private register() {
    if (!this.socket) return
    const sock = this.socket

    // ── Connection ────────────────────────────────────────────
    sock.on('connect', () => {
      console.log('[Socket] connected', sock.id)
      this.reconnects = 0
      const streak = useGameStore.getState().streak
      if (streak > 0) sock.emit('streak:sync', { streak })
    })

    sock.on('disconnect', (reason) => {
      console.warn('[Socket] disconnected:', reason)
    })

    sock.on('connect_error', () => {
      this.reconnects++
      if (this.reconnects >= this.MAX_RECONNECTS) {
        useUIStore.getState().addToast({
          type: 'error', title: 'Connection failed',
          message: 'Unable to reach game server.',
        })
      }
    })

    // ── Price ─────────────────────────────────────────────────
    sock.on('price:update', ({ price, timestamp }: { price: number; timestamp: number }) => {
      useGameStore.getState().updatePrice(price)
      useGameStore.getState().appendPriceHistory({ price, timestamp })
    })
    sock.on('price:current', ({ price, timestamp }: { price: number; timestamp: number }) => {
      useGameStore.getState().updatePrice(price)
      useGameStore.getState().appendPriceHistory({ price, timestamp })
    })

    // ── Round ─────────────────────────────────────────────────
    sock.on('round:new', (data: any) => {
      useGameStore.getState().setCurrentRound({
        id: data.id, startPrice: data.startPrice, endPrice: null,
        startTime: data.startTime, endTime: data.endTime,
        lockTime: data.lockTime, duration: data.duration,
        status: 'OPEN', poolUp: 0, poolDown: 0, totalPreds: 0,
      })
    })
    sock.on('round:tick', (data: any) => {
      useGameStore.getState().setTimeRemaining(data.timeRemaining)
      if (data.isLocked) useGameStore.getState().setRoundLocked()
      else useGameStore.getState().updateRoundStatus(data.status)
    })
    sock.on('round:locked', ({ roundId }: { roundId: string }) => {
      const { currentRound, setRoundLocked } = useGameStore.getState()
      if (currentRound?.id === roundId) setRoundLocked()
    })
    sock.on('round:settled', () => {
      useGameStore.getState().updateRoundStatus('SETTLED')
    })
    sock.on('round:pool:update', (data: any) => {
      useGameStore.getState().updatePool(data.poolUp, data.poolDown, data.total, data.upPct, data.downPct)
    })

    // ── Prediction result ─────────────────────────────────────
    sock.on('prediction:result', (data: any) => {
      useGameStore.getState().applyResult({
        outcome: data.outcome, entryPrice: data.entryPrice,
        exitPrice: data.exitPrice, payout: data.payout,
        multiplier: data.multiplier, streakAfter: data.streakAfter,
        xpAwarded: data.xpAwarded, isNearMiss: data.isNearMiss,
        streakBroken: data.streakBroken, previousStreak: data.previousStreak,
      })
    })

    // ── Live feed ─────────────────────────────────────────────
    sock.on('feed:new', (entry: any) => {
      useSocialStore.getState().addFeedEntry(entry)
    })
    sock.on('feed:history', (entries: any[]) => {
      useSocialStore.getState().prependFeed(entries)
    })
    sock.on('feed:result', ({ id, outcome, payout }: { id: string; outcome: string; payout: number }) => {
      useSocialStore.getState().flashFeedResult(id, outcome, payout)
    })

    // ── Round summary ─────────────────────────────────────────
    sock.on('round:top_results', (data: any) => {
      useSocialStore.getState().setRoundSummary({ ...data, timestamp: Date.now() })
    })

    // ── Rival ─────────────────────────────────────────────────
    sock.on('rival:online', (data: any) => {
      useSocialStore.getState().updateRivalOnline(true)
      useSocialStore.getState().addNotification({
        id: `riv_${Date.now()}`, type: 'rival_online',
        title: 'Rival Online!', message: data.message ?? 'Your rival just joined',
        icon: '⚔️', timestamp: Date.now(), read: false,
      })
    })
    sock.on('rival:round_result', (result: any) => {
      useSocialStore.getState().setRivalResult(result)
    })
    sock.on('rival:dominated', (data: any) => {
      useSocialStore.getState().setRivalDominated(true)
      useUIStore.getState().addToast({
        type: 'win' as never, title: '👑 RIVALRY DOMINATED!',
        message: `+${data.xpBonus} XP bonus awarded`,
      })
    })

    // ── Notifications ─────────────────────────────────────────
    sock.on('notification:new', (notif: any) => {
      useSocialStore.getState().addNotification(notif)
    })

    // ── Leaderboard real-time push ───────────────────────────
    sock.on('leaderboard:update:daily',   (data: any) => useSocialStore.getState().setLBSnapshot(data))
    sock.on('leaderboard:update:weekly',  (data: any) => useSocialStore.getState().setLBSnapshot(data))
    sock.on('leaderboard:update:alltime', (data: any) => useSocialStore.getState().setLBSnapshot(data))

    // ── Whale ─────────────────────────────────────────────────
    sock.on('whale:alert', (data: any) => {
      useWalletStore.getState().triggerWhaleAlert(data.wallet, data.amountSol, data.direction)
    })

    // ── Weekly bonus ──────────────────────────────────────────
    sock.on('user:bonus', (data: any) => {
      useUIStore.getState().addToast({
        type: 'win' as never, title: '💰 Weekly Cashback!', message: data.message,
      })
      useSocialStore.getState().addNotification({
        id: `bonus_${Date.now()}`, type: 'cashback_ready',
        title: 'Weekly Cashback!', message: data.message,
        icon: '💰', timestamp: Date.now(), read: false,
      })
    })
  }

  // ── Emit helpers ──────────────────────────────────────────

  identify(payload: { userId: string; username: string; xp: number; streak: number; rank: string },
    cb?: (r: any) => void) {
    this.socket?.emit('user:identify', payload, cb)
  }

  getRival(payload: { userId: string; userXP: number }, cb?: (r: any) => void) {
    this.socket?.emit('rival:get', payload, cb)
  }

  getLeaderboard(period: string, cb?: (r: any) => void) {
    this.socket?.emit('leaderboard:get', { period }, cb)
  }

  getNotifications(userId: string, cb?: (r: any) => void) {
    this.socket?.emit('notifications:get', { userId }, cb)
  }

  markNotificationsRead(userId: string, notifId?: string) {
    this.socket?.emit('notifications:read', { userId, notifId })
  }

  submitPrediction(payload: any, cb?: (r: any) => void) {
    this.socket?.emit('prediction:submit', payload, cb)
  }

  claimChest(payload: any, cb?: (r: any) => void) {
    this.socket?.emit('chest:claim', payload, cb)
  }

  checkGhost(payload: any, cb?: (r: any) => void) {
    this.socket?.emit('ghost:check', payload, cb)
  }

  triggerDailyLogin(payload: any, cb?: (r: any) => void) {
    this.socket?.emit('daily:login', payload, cb)
  }

  syncStreak(streak: number) {
    this.socket?.emit('streak:sync', { streak })
  }

  get isConnected() { return this.socket?.connected ?? false }
  get id()          { return this.socket?.id }
}

export const socketService = new SocketService()
