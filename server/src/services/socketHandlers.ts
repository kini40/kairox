// ─────────────────────────────────────────────────────────────
//  KAIROX – Socket.io Handlers  (complete social edition)
// ─────────────────────────────────────────────────────────────

import type { Server as SocketIOServer, Socket } from 'socket.io'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { roundManager }        from './roundManager.js'
import { priceFeedService }    from './priceFeedService.js'
import { feedService }         from './feedService.js'
import { rivalService }        from './rivalService.js'
import { notificationService } from './notificationService.js'
import { leaderboardService }  from './leaderboardService.js'
import { supabaseAdmin }       from '../config/supabase.js'
import { rollChest, calcLoginStreak, canUseGhost } from '../utils/gameLogic.js'
import { isWhale, WHALE_THRESHOLD_LAMPORTS }       from './solanaService.js'
import type { SubmitPredictionPayload, ClaimChestPayload } from '../types/game.js'

const chestCounters = new Map<string, number>()
const whaleCooldowns = new Map<string, number>()
// socketId → userId (for online tracking)
const socketUserMap = new Map<string, string>()

export function registerSocketHandlers(io: SocketIOServer) {

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] +  ${socket.id}`)
    chestCounters.set(socket.id, 0)

    roundManager.sendCurrentState(socket.id)
    socket.emit('price:current', { price: priceFeedService.lastPrice, timestamp: Date.now() })

    // Send recent feed entries on connect
    socket.emit('feed:history', feedService.getRecent(30))

    // ── USER:IDENTIFY ──────────────────────────────────────────
    // Called after wallet connect / auth to register user as online
    socket.on('user:identify', async (
      payload: { userId: string; username: string; xp: number; streak: number; rank: string },
      ack?: (r: unknown) => void,
    ) => {
      socketUserMap.set(socket.id, payload.userId)

      rivalService.registerOnline(payload.userId, socket.id, {
        xp:       payload.xp,
        username: payload.username,
        streak:   payload.streak,
        rank:     payload.rank,
      })

      // Assign rival
      const rival = await rivalService.assignRival(payload.userId, payload.xp)

      // Pending notifications
      const notifs = notificationService.getQueue(payload.userId)
      const unread  = notificationService.unreadCount(payload.userId)

      ack?.({ ok: true, rival, notifications: notifs, unreadCount: unread })
    })

    // ── RIVAL:GET ──────────────────────────────────────────────
    socket.on('rival:get', async (
      payload: { userId: string; userXP: number },
      ack?: (r: unknown) => void,
    ) => {
      const rival = await rivalService.assignRival(payload.userId, payload.userXP)
      ack?.({ rival })
    })

    // ── PREDICTION:SUBMIT ──────────────────────────────────────
    socket.on('prediction:submit', (
      payload: SubmitPredictionPayload,
      ack?: (r: unknown) => void,
    ) => {
      if (!payload.direction || !['UP','DOWN'].includes(payload.direction)) {
        return ack?.({ ok: false, error: 'Invalid direction' })
      }
      if (!payload.wager || payload.wager <= 0 || !isFinite(payload.wager)) {
        return ack?.({ ok: false, error: 'Invalid wager amount' })
      }
      if (!payload.roundId) {
        return ack?.({ ok: false, error: 'Missing roundId' })
      }

      const result = roundManager.submitPrediction(socket.id, payload)
      if (!result.ok) return ack?.({ ok: false, error: result.error })

      // Chest counter
      const count = (chestCounters.get(socket.id) ?? 0) + 1
      chestCounters.set(socket.id, count)
      const chestReady = count % 5 === 0

      // Notify chest
      if (chestReady) {
        const uid = socketUserMap.get(socket.id)
        if (uid) notificationService.notifyChestReady(uid)
      }

      ack?.({ ok: true, entryPrice: result.entryPrice, chestCount: count, chestReady })

      // Whale detection
      const wagerLamports   = payload.wager * LAMPORTS_PER_SOL
      const isWhalePred     = payload.mode === 'LIVE' ? isWhale(wagerLamports) : payload.wager >= 500
      const walletKey       = payload.userId ?? socket.id
      const lastWhaleTs     = whaleCooldowns.get(walletKey) ?? 0

      if (isWhalePred && Date.now() - lastWhaleTs > 30_000) {
        whaleCooldowns.set(walletKey, Date.now())
        const short = payload.userId
          ? `${payload.userId.slice(0,4)}…${payload.userId.slice(-4)}`
          : `${socket.id.slice(0,4)}…`
        io.emit('whale:alert', {
          wallet: short, amountSol: payload.wager,
          direction: payload.direction, mode: payload.mode, timestamp: Date.now(),
        })
      }

      // Feed entry
      const username = payload.userId ? (payload.userId.slice(0,4) + '…') : 'Anon'
      feedService.addEntry({
        socketId:  socket.id,
        userId:    payload.userId ?? null,
        username,
        direction: payload.direction,
        wager:     payload.wager,
        mode:      payload.mode,
        isGhost:   payload.isGhost,
        isWhale:   isWhalePred,
        timestamp: Date.now(),
      })
    })

    // ── CHEST:CLAIM ────────────────────────────────────────────
    socket.on('chest:claim', (payload: ClaimChestPayload, ack?: (r: unknown) => void) => {
      const count = chestCounters.get(socket.id) ?? 0
      if (count === 0 || count % 5 !== 0) return ack?.({ ok: false, error: 'Chest not ready' })

      const reward = rollChest(payload.mode)
      if (payload.userId) {
        supabaseAdmin.from('chest_rewards').insert({
          user_id:     payload.userId,
          reward_type: reward.type,
          xp_awarded:  reward.xp,
          credits:     reward.credits,
          sol:         reward.sol,
        }).then(() => {
          if (reward.xp > 0) {
            supabaseAdmin.rpc('add_user_xp', { p_user_id: payload.userId, p_xp: reward.xp }).catch(console.error)
          }
        }).catch(console.error)
      }

      ack?.({ ok: true, reward })
    })

    // ── LEADERBOARD:GET ────────────────────────────────────────
    socket.on('leaderboard:get', async (
      payload: { period: string },
      ack?: (r: unknown) => void,
    ) => {
      const period = (payload.period || 'weekly') as 'daily' | 'weekly' | 'alltime'
      const snapshot = await leaderboardService.fetch(period)
      ack?.({ ok: true, snapshot })
    })

    // ── NOTIFICATIONS:GET ──────────────────────────────────────
    socket.on('notifications:get', (
      payload: { userId: string },
      ack?: (r: unknown) => void,
    ) => {
      const notifs  = notificationService.getQueue(payload.userId)
      const unread  = notificationService.unreadCount(payload.userId)
      ack?.({ notifs, unread })
    })

    socket.on('notifications:read', (payload: { userId: string; notifId?: string }) => {
      if (payload.notifId) notificationService.markRead(payload.userId, payload.notifId)
      else                  notificationService.markAllRead(payload.userId)
    })

    // ── GHOST:CHECK ────────────────────────────────────────────
    socket.on('ghost:check', (
      payload: { userId: string | null; lastGhostDate: string | null },
      ack?: (r: unknown) => void,
    ) => {
      const sess   = roundManager.getSession(socket.id)
      const canUse = canUseGhost(payload.lastGhostDate) && !sess.ghostUsedToday
      ack?.({ canUse })
    })

    // ── DAILY:LOGIN ────────────────────────────────────────────
    socket.on('daily:login', async (
      payload: { userId: string; lastLoginDate: string | null; currentStreak: number },
      ack?: (r: unknown) => void,
    ) => {
      const result = calcLoginStreak(payload.lastLoginDate, payload.currentStreak)
      if (result.xpAwarded > 0 && payload.userId) {
        await supabaseAdmin.rpc('record_daily_login', {
          p_user_id:    payload.userId,
          p_new_streak: result.newStreak,
          p_xp_awarded: result.xpAwarded,
        }).catch(console.error)
      }
      ack?.({ ok: true, ...result, isDay7: result.newStreak % 7 === 0 && result.xpAwarded > 0 })
    })

    // ── STREAK:SYNC ────────────────────────────────────────────
    socket.on('streak:sync', (payload: { streak: number }) => {
      const sess  = roundManager.getSession(socket.id)
      sess.streak = typeof payload.streak === 'number' ? payload.streak : 0
      // Update rival service
      const uid = socketUserMap.get(socket.id)
      if (uid) {
        for (const [otherId] of rivalService['rivalSessions']?.entries?.() ?? []) {
          rivalService.updateRivalStreak(otherId, sess.streak)
        }
      }
    })

    socket.on('streak:get', (_: unknown, ack?: (r: unknown) => void) => {
      ack?.({ streak: roundManager.getSession(socket.id).streak })
    })

    // ── DISCONNECT ─────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      console.log(`[Socket] -  ${socket.id} (${reason})`)
      const uid = socketUserMap.get(socket.id)
      if (uid) {
        rivalService.unregisterOnline(uid)
        socketUserMap.delete(socket.id)
      }
      chestCounters.delete(socket.id)
      roundManager.removeSession(socket.id)
    })
  })

  // ── Round settled: flash feed results + broadcast round summary ──
  // Hooked into roundManager events after settlement
}

// Called by roundManager after each round settles
export function onRoundSettled(
  io: SocketIOServer,
  results: Array<{ socketId: string; userId: string | null; outcome: string; payout: number; wager: number; streakBroken: boolean; previousStreak: number }>
) {
  // Flash feed entries
  for (const r of results) {
    feedService.flashResult(r.socketId, r.outcome as never, r.payout)
  }

  // Round summary toast
  const summary = feedService.getRoundSummary()
  notificationService.broadcastRoundResult(summary)

  feedService.clearRound()

  // Rival outcome comparisons
  for (const r of results) {
    if (!r.userId) continue
    const userWon = r.outcome === 'WIN'
    const rivalResult = rivalService.recordRoundOutcome(r.userId, userWon)
    if (rivalResult) {
      const online = rivalService['onlineUsers']?.get?.(r.userId)
      if (online?.socketId) {
        io.to(online.socketId).emit('rival:round_result', rivalResult)
        // Rivalry dominated bonus
        if (rivalResult.dominated) {
          notificationService.notifyRivalryDominated(r.userId, rivalResult.rivalName ?? 'Rival')
          // Award XP
          supabaseAdmin.rpc('add_user_xp', { p_user_id: r.userId, p_xp: 200 }).catch(console.error)
          io.to(online.socketId).emit('rival:dominated', { xpBonus: 200, rivalName: rivalResult.rivalName })
        }
      }
    }
  }

  // Refresh leaderboard after round
  leaderboardService.refreshNow().catch(console.error)
}
