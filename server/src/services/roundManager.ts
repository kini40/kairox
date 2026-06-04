// ─────────────────────────────────────────────────────────────
//  KAIROX – Round Manager  (security-hardened edition)
//
//  KEY SECURITY PROPERTIES:
//  1. Server timestamps every prediction on receipt
//  2. Entry price fetched server-side — client value ignored
//  3. Round lock enforced server-side — client timing irrelevant
//  4. One prediction per socket per round — hard enforced
//  5. All settlement computed server-side only
// ─────────────────────────────────────────────────────────────

import { v4 as uuidv4 }     from 'uuid'
import type { Server as SocketIOServer } from 'socket.io'
import { priceFeedService }  from './priceFeedService.js'
import { supabaseAdmin }     from '../config/supabase.js'
import { securityLogger }    from '../security/securityLogger.js'
import { botDetector }       from '../security/botDetector.js'
import { throttleSocket, cleanupSocketThrottle } from '../middleware/rateLimiter.js'
import {
  determineOutcome, calcPayout, updateStreak, rollChest,
  ROUND_DURATION_MS, LOCK_BEFORE_END_MS, SETTLE_DELAY_MS, NEXT_ROUND_DELAY_MS,
  calcMovementPct,
} from '../utils/gameLogic.js'
import type {
  Round, PendingPrediction, SettlementResult,
  RoundNewPayload, RoundTickPayload, RoundSettledPayload,
  PoolUpdatePayload, PredictionResultPayload, SubmitPredictionPayload,
} from '../types/game.js'

class RoundManager {
  currentRound: Round | null = null
  private io:   SocketIOServer | null = null

  // socketId → prediction (one per round)
  private predictions = new Map<string, PendingPrediction>()

  // socketId → session state
  private sessions = new Map<string, {
    streak:         number
    ghostUsedToday: boolean
    lastGhostDate:  string | null
    roundOpenedAt:  number   // for bot timing analysis
  }>()

  private tickTimer:  ReturnType<typeof setInterval> | null = null
  private roundTimer: ReturnType<typeof setTimeout>  | null = null

  // ── Lifecycle ──────────────────────────────────────────────

  start(io: SocketIOServer) {
    this.io = io
    setTimeout(() => this.openNewRound(), 3000)
  }

  stop() {
    if (this.tickTimer)  clearInterval(this.tickTimer)
    if (this.roundTimer) clearTimeout(this.roundTimer)
  }

  // ── Session helpers ────────────────────────────────────────

  getSession(socketId: string) {
    if (!this.sessions.has(socketId)) {
      this.sessions.set(socketId, {
        streak: 0, ghostUsedToday: false,
        lastGhostDate: null, roundOpenedAt: 0,
      })
    }
    return this.sessions.get(socketId)!
  }

  removeSession(socketId: string) {
    this.sessions.delete(socketId)
    this.predictions.delete(socketId)
    cleanupSocketThrottle(socketId)
    botDetector.cleanup(socketId)
  }

  // ── Round open ─────────────────────────────────────────────

  private openNewRound() {
    if (this.tickTimer)  { clearInterval(this.tickTimer);  this.tickTimer  = null }
    if (this.roundTimer) { clearTimeout(this.roundTimer);  this.roundTimer = null }

    const now        = Date.now()
    // SECURITY: startPrice is fetched server-side — never from client
    const startPrice = priceFeedService.lastPrice || 150

    this.currentRound = {
      id:         uuidv4(),
      startPrice,
      endPrice:   null,
      startTime:  now,
      endTime:    now + ROUND_DURATION_MS,
      lockTime:   now + ROUND_DURATION_MS - LOCK_BEFORE_END_MS,
      duration:   ROUND_DURATION_MS / 1000,
      status:     'OPEN',
      poolUp:     0,
      poolDown:   0,
      totalPreds: 0,
    }

    this.predictions.clear()

    // Record round open time in all sessions (for bot timing analysis)
    for (const sess of this.sessions.values()) {
      sess.roundOpenedAt = now
    }

    console.log(`[Round] OPEN  ${this.currentRound.id.slice(0,8)} @ $${startPrice.toFixed(2)}`)

    this.io?.emit('round:new', {
      id:         this.currentRound.id,
      startPrice: this.currentRound.startPrice,
      startTime:  this.currentRound.startTime,
      endTime:    this.currentRound.endTime,
      lockTime:   this.currentRound.lockTime,
      duration:   this.currentRound.duration,
      status:     'OPEN',
    } as RoundNewPayload)

    this.persistRoundOpen(this.currentRound).catch(console.error)
    this.startTick()

    // Lock at T-10s
    setTimeout(() => this.lockRound(), ROUND_DURATION_MS - LOCK_BEFORE_END_MS)
    this.roundTimer = setTimeout(() => this.closeRound(), ROUND_DURATION_MS)
  }

  private lockRound() {
    if (!this.currentRound || this.currentRound.status !== 'OPEN') return
    this.currentRound.status = 'LOCKED'
    this.io?.emit('round:locked', { roundId: this.currentRound.id })
  }

  private closeRound() {
    if (!this.currentRound) return
    this.currentRound.status = 'CLOSED'
    if (this.tickTimer) { clearInterval(this.tickTimer); this.tickTimer = null }
    this.io?.emit('round:status', {
      roundId: this.currentRound.id, status: 'CLOSED',
      timeRemaining: 0, isLocked: true,
    } as RoundTickPayload)
    setTimeout(() => this.settleRound(), SETTLE_DELAY_MS)
  }

  private async settleRound() {
    if (!this.currentRound) return

    // SECURITY: exit price fetched server-side only
    const exitPrice = priceFeedService.lastPrice || this.currentRound.startPrice
    const movePct   = calcMovementPct(this.currentRound.startPrice, exitPrice)
    const direction = Math.abs(movePct) <= 0.05 ? 'FLAT' : movePct > 0 ? 'UP' : 'DOWN'

    this.currentRound.endPrice = exitPrice
    this.currentRound.status   = 'SETTLED'

    console.log(`[Round] SETTLED ${this.currentRound.id.slice(0,8)} $${this.currentRound.startPrice.toFixed(2)} → $${exitPrice.toFixed(2)} (${movePct.toFixed(3)}%)`)

    this.io?.emit('round:settled', {
      roundId:    this.currentRound.id,
      startPrice: this.currentRound.startPrice,
      endPrice:   exitPrice,
      movement:   +Math.abs(movePct).toFixed(4),
      direction:  direction as never,
    } as RoundSettledPayload)

    const results = this.settlePredictions(exitPrice)

    for (const result of results) {
      const socket = this.io?.sockets.sockets.get(result.socketId)
      if (socket) {
        const prev: number = result.streakAfter - (result.outcome === 'WIN' ? 1 : 0)
        socket.emit('prediction:result', {
          socketId:       result.socketId,
          roundId:        result.roundId,
          outcome:        result.outcome,
          direction:      result.direction,
          entryPrice:     result.entryPrice,
          exitPrice:      result.exitPrice,
          payout:         result.payout,
          multiplier:     result.multiplier,
          streakAfter:    result.streakAfter,
          xpAwarded:      result.xpAwarded,
          isNearMiss:     result.isNearMiss,
          streakBroken:   prev > 0 && result.streakAfter === 0,
          previousStreak: prev,
        } as PredictionResultPayload)
      }
      this.persistPrediction(result).catch(console.error)
    }

    await this.persistRoundSettle(this.currentRound).catch(console.error)

    // Import here to avoid circular deps
    const { onRoundSettled } = await import('./socketHandlers.js')
    if (this.io) {
      onRoundSettled(this.io, results.map(r => ({
        socketId:       r.socketId,
        userId:         r.userId,
        outcome:        r.outcome,
        payout:         r.payout,
        wager:          r.wager,
        streakBroken:   r.streakAfter === 0 && r.outcome === 'LOSS',
        previousStreak: r.streakAfter,
      })))
    }

    setTimeout(() => this.openNewRound(), NEXT_ROUND_DELAY_MS)
  }

  private settlePredictions(exitPrice: number): SettlementResult[] {
    const results: SettlementResult[] = []
    for (const [socketId, pred] of this.predictions.entries()) {
      const sess = this.getSession(socketId)
      // SECURITY: outcome computed server-side from server-fetched exit price
      const { outcome, isNearMiss } = determineOutcome(pred.direction, pred.entryPrice, exitPrice)
      const { payout, multiplier, streakBonus, xpAwarded } = calcPayout(
        pred.wager, outcome, pred.streak, pred.isDegen, pred.isGhost,
      )
      const newStreak = updateStreak(sess.streak, outcome)
      sess.streak     = newStreak

      // Run bot win-rate check async
      botDetector.checkWinRate({
        socketId, userId: pred.userId, ip: '',
        won: outcome === 'WIN',
      }).catch(console.error)

      results.push({
        socketId, userId: pred.userId, roundId: pred.roundId,
        direction: pred.direction, entryPrice: pred.entryPrice, exitPrice,
        outcome: outcome === 'NEAR_MISS' ? 'NEAR_MISS' : outcome,
        wager: pred.wager, payout, multiplier,
        streakAfter: newStreak, streakBonus, xpAwarded,
        isDegen: pred.isDegen, isGhost: pred.isGhost, isNearMiss,
      })
    }
    return results
  }

  // ── Prediction submission (security-hardened) ──────────────

  submitPrediction(socketId: string, payload: SubmitPredictionPayload, ip = ''): {
    ok: boolean; error?: string; entryPrice?: number
  } {
    const round = this.currentRound

    // SECURITY: Socket throttle — reject if >2 events/second
    if (!throttleSocket(socketId)) {
      securityLogger.log({
        eventType: 'RATE_LIMIT_SOCKET',
        socketId,
        ip,
        details: { roundId: payload.roundId },
      })
      return { ok: false, error: 'Too many requests. Slow down.' }
    }

    if (!round) return { ok: false, error: 'No active round' }

    // SECURITY: Server enforces lock window — client timestamp ignored
    const now = Date.now()
    if (now >= round.lockTime || round.status !== 'OPEN') {
      securityLogger.log({
        eventType: 'ROUND_LOCKED_VIOLATION',
        socketId,
        ip,
        details:   { roundId: round.id, status: round.status, msOverLock: now - round.lockTime },
      })
      return { ok: false, error: 'ROUND_LOCKED' }
    }

    if (round.id !== payload.roundId) {
      securityLogger.log({
        eventType: 'INVALID_ROUND_ID',
        socketId, ip,
        details:   { expected: round.id, received: payload.roundId },
      })
      return { ok: false, error: 'Round ID mismatch' }
    }

    // SECURITY: One prediction per round — hard enforced server-side
    if (this.predictions.has(socketId)) {
      securityLogger.log({
        eventType: 'DOUBLE_PREDICTION',
        socketId, ip,
        details:   { roundId: round.id },
      })
      return { ok: false, error: 'Already submitted prediction this round' }
    }

    // Ghost daily limit — server-validated
    const sess = this.getSession(socketId)
    if (payload.isGhost) {
      if (sess.ghostUsedToday) {
        securityLogger.log({
          eventType: 'GHOST_USED_TODAY',
          socketId,
          userId:    payload.userId,
          ip,
        })
        return { ok: false, error: 'GHOST_USED_TODAY' }
      }
    }

    // Degen balance pre-check
    if (payload.isDegen && payload.wager <= 0) {
      securityLogger.log({
        eventType: 'DEGEN_BALANCE_VIOLATION',
        socketId,
        userId:    payload.userId,
        ip,
      })
      return { ok: false, error: 'Invalid degen wager' }
    }

    // SECURITY: Entry price from server's last known price — client value ignored
    const entryPrice = priceFeedService.lastPrice || round.startPrice

    // SECURITY: Server records submission timestamp
    const prediction: PendingPrediction = {
      socketId,
      userId:      payload.userId ?? null,
      roundId:     round.id,
      direction:   payload.direction,
      entryPrice,                    // ← server-fetched, not client-supplied
      wager:       payload.wager,
      mode:        payload.mode,
      isDegen:     payload.isDegen,
      isGhost:     payload.isGhost,
      streak:      payload.streak ?? sess.streak,
      submittedAt: now,              // ← server timestamp
    }

    this.predictions.set(socketId, prediction)

    if (payload.isGhost) {
      const today      = new Date().toISOString().slice(0, 10)
      sess.ghostUsedToday = true
      sess.lastGhostDate  = today
    }

    // Bot timing analysis — run async so it doesn't slow the response
    botDetector.recordPrediction({
      socketId,
      userId:       payload.userId ?? null,
      ip,
      roundOpenedAt: sess.roundOpenedAt || round.startTime,
      submittedAt:  now,
      direction:    payload.direction,
    }).catch(console.error)

    // Pool update (non-ghost)
    if (!payload.isGhost) {
      if (payload.direction === 'UP') round.poolUp   += payload.wager
      else                            round.poolDown += payload.wager
      round.totalPreds++

      const total  = round.poolUp + round.poolDown
      this.io?.emit('round:pool:update', {
        roundId:  round.id,
        poolUp:   round.poolUp,
        poolDown: round.poolDown,
        total,
        upPct:    total > 0 ? (round.poolUp   / total) * 100 : 50,
        downPct:  total > 0 ? (round.poolDown / total) * 100 : 50,
      } as PoolUpdatePayload)
    }

    return { ok: true, entryPrice }
  }

  // ── Tick ───────────────────────────────────────────────────

  private startTick() {
    if (this.tickTimer) clearInterval(this.tickTimer)
    this.tickTimer = setInterval(() => {
      if (!this.currentRound) return
      const remaining = Math.max(0, Math.floor((this.currentRound.endTime - Date.now()) / 1000))
      const isLocked  = Date.now() >= this.currentRound.lockTime
      this.io?.emit('round:tick', {
        roundId:       this.currentRound.id,
        status:        isLocked && this.currentRound.status === 'OPEN' ? 'LOCKED' : this.currentRound.status,
        timeRemaining: remaining,
        isLocked,
      } as RoundTickPayload)
      if (remaining === 0) { clearInterval(this.tickTimer!); this.tickTimer = null }
    }, 1000)
  }

  sendCurrentState(socketId: string) {
    if (!this.currentRound) return
    const socket    = this.io?.sockets.sockets.get(socketId)
    if (!socket)    return
    const remaining = Math.max(0, Math.floor((this.currentRound.endTime - Date.now()) / 1000))
    socket.emit('round:new', {
      id: this.currentRound.id, startPrice: this.currentRound.startPrice,
      startTime: this.currentRound.startTime, endTime: this.currentRound.endTime,
      lockTime: this.currentRound.lockTime, duration: this.currentRound.duration,
      status: this.currentRound.status,
    } as RoundNewPayload)
    socket.emit('round:tick', {
      roundId: this.currentRound.id, status: this.currentRound.status,
      timeRemaining: remaining, isLocked: Date.now() >= this.currentRound.lockTime,
    } as RoundTickPayload)
    socket.emit('round:pool:update', {
      roundId: this.currentRound.id,
      poolUp:  this.currentRound.poolUp, poolDown: this.currentRound.poolDown,
      total:   this.currentRound.poolUp + this.currentRound.poolDown,
      upPct:   this.currentRound.poolUp + this.currentRound.poolDown > 0
        ? (this.currentRound.poolUp / (this.currentRound.poolUp + this.currentRound.poolDown)) * 100 : 50,
      downPct: this.currentRound.poolUp + this.currentRound.poolDown > 0
        ? (this.currentRound.poolDown / (this.currentRound.poolUp + this.currentRound.poolDown)) * 100 : 50,
    } as PoolUpdatePayload)
  }

  // ── DB persistence ─────────────────────────────────────────

  private async persistRoundOpen(round: Round) {
    await supabaseAdmin.from('rounds').insert({
      id: round.id, start_price: round.startPrice,
      start_time: new Date(round.startTime).toISOString(),
      end_time:   new Date(round.endTime).toISOString(),
      lock_time:  new Date(round.lockTime).toISOString(),
      status:     'OPEN',
    })
  }

  private async persistRoundSettle(round: Round) {
    await supabaseAdmin.from('rounds').update({
      end_price: round.endPrice, status: 'SETTLED',
    }).eq('id', round.id)
  }

  private async persistPrediction(r: SettlementResult) {
    if (!r.userId) return
    // Store submission_timestamp + server_entry_price as audit trail
    await supabaseAdmin.from('predictions').insert({
      user_id:            r.userId,
      round_id:           r.roundId,
      direction:          r.direction,
      entry_price:        r.entryPrice,   // server-fetched
      result_price:       r.exitPrice,    // server-fetched
      outcome:            r.outcome,
      sol_wagered:        r.wager,
      sol_won:            r.payout,
      multiplier:         r.multiplier,
      streak_at_sub:      r.streakAfter - (r.outcome === 'WIN' ? 1 : 0),
      streak_bonus:       r.streakBonus,
      xp_awarded:         r.xpAwarded,
      is_degen:           r.isDegen,
      is_ghost:           r.isGhost,
      is_near_miss:       r.isNearMiss,
    })

    // Update user stats via stored procedure
    await supabaseAdmin.rpc('update_user_prediction_stats', {
      p_user_id:  r.userId,
      p_won:      r.outcome === 'WIN',
      p_xp:       r.xpAwarded,
      p_sol_won:  r.payout,
      p_sol_lost: r.outcome === 'WIN' ? 0 : r.wager,
      p_streak:   r.streakAfter,
    })
  }

  get roundIsOpen()    { return this.currentRound?.status === 'OPEN' }
  get predictionCount(){ return this.predictions.size }
}

export const roundManager = new RoundManager()
