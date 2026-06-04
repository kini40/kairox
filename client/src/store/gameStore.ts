// ─────────────────────────────────────────────────────────────
//  KAIROX – Game Store  (complete game engine, client-side)
// ─────────────────────────────────────────────────────────────

import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'

// ─── Constants (must match server) ───────────────────────────

export const BASE_PAYOUT_MULT     = 1.85
export const DEGEN_WIN_MULT       = 2.0
export const GHOST_WIN_MULT       = 3.0
export const DRAW_THRESHOLD_PCT   = 0.05
export const NEAR_MISS_PCT        = 0.10
export const LOCK_BEFORE_END_SEC  = 10
export const CHEST_EVERY_N        = 5

export const STREAK_BONUSES: Record<number, number> = { 3: 0.10, 5: 0.20, 7: 0.35 }

export const RANK_THRESHOLDS: Record<string, number> = {
  BRONZE: 0, SILVER: 500, GOLD: 1500, DIAMOND: 4000, ORACLE: 10000,
}

// ─── Types ────────────────────────────────────────────────────

export type GameMode      = 'BETA' | 'LIVE'
export type Direction     = 'UP' | 'DOWN'
export type RoundStatus   = 'OPEN' | 'LOCKED' | 'CLOSED' | 'SETTLING' | 'SETTLED' | 'WAITING'
export type OutcomeType   = 'WIN' | 'LOSS' | 'DRAW' | 'NEAR_MISS' | null
export type ChestRewardType = 'EMPTY' | 'XP_SMALL' | 'XP_LARGE' | 'CREDITS_SMALL' | 'CREDITS_LARGE' | 'SOL_SMALL' | 'SOL_LARGE'

export interface Round {
  id:         string
  startPrice: number
  endPrice:   number | null
  startTime:  number
  endTime:    number
  lockTime:   number
  duration:   number
  status:     RoundStatus
  poolUp:     number
  poolDown:   number
  totalPreds: number
}

export interface Prediction {
  id:          string
  roundId:     string
  direction:   Direction
  entryPrice:  number
  resultPrice: number | null
  outcome:     OutcomeType
  wager:       number
  payout:      number
  multiplier:  number
  streakAtSub: number
  streakBonus: number
  xpAwarded:   number
  isDegen:     boolean
  isGhost:     boolean
  isNearMiss:  boolean
  timestamp:   number
}

export interface ChestReward {
  type:    ChestRewardType
  xp:      number
  credits: number
  sol:     number
  label:   string
}

export interface PricePoint { timestamp: number; price: number }

export interface ResultState {
  outcome:        OutcomeType
  entryPrice:     number
  exitPrice:      number
  movePct:        number
  payout:         number
  multiplier:     number
  streakAfter:    number
  xpAwarded:      number
  isNearMiss:     boolean
  streakBroken:   boolean
  previousStreak: number
  isDegen:        boolean
  isGhost:        boolean
}

export interface LoginStreakState {
  streak:        number
  xpAwarded:     number
  dayMultiplier: number
  isDay7:        boolean
  isReset:       boolean
}

// ─── Game Store Interface ─────────────────────────────────────

interface GameState {
  // Mode
  mode:        GameMode
  betaCredits: number

  // Price
  currentPrice:   number
  previousPrice:  number
  priceHistory:   PricePoint[]
  lastPriceUpdate: number

  // Round
  currentRound:   Round | null
  timeRemaining:  number

  // Active prediction
  userPrediction: Prediction | null
  wagerAmount:    number
  isDegenMode:    boolean
  isGhostMode:    boolean
  ghostUsedToday: boolean

  // Streak
  streak:     number
  bestStreak: number

  // Results
  lastResult:  ResultState | null
  showResult:  boolean

  // Chest
  predCount:    number   // total preds this session (mod 5 → chest)
  chestReady:   boolean
  pendingChest: ChestReward | null

  // Daily login
  loginStreak:  LoginStreakState | null

  // Rank + XP
  xp:   number
  rank: string

  // History
  predictionHistory: Prediction[]

  // UI flags
  degenWarningShown: boolean
  showRankUp:        boolean
  prevRank:          string
}

interface GameActions {
  // Mode
  setMode:     (mode: GameMode) => void
  addCredits:  (amount: number) => void

  // Price
  updatePrice:       (price: number) => void
  appendPriceHistory:(point: PricePoint) => void

  // Round
  setCurrentRound:    (round: Round) => void
  updateRoundStatus:  (status: RoundStatus) => void
  setRoundLocked:     () => void
  setTimeRemaining:   (sec: number) => void
  updatePool:         (poolUp: number, poolDown: number, total: number, upPct: number, downPct: number) => void

  // Prediction (client-side optimistic)
  setWager:       (amount: number) => void
  toggleDegen:    () => void
  toggleGhost:    () => void
  markDegenSeen:  () => void

  submitPrediction: (direction: Direction) => void

  // Result (from server)
  applyResult: (result: {
    outcome:        OutcomeType
    entryPrice:     number
    exitPrice:      number
    payout:         number
    multiplier:     number
    streakAfter:    number
    xpAwarded:      number
    isNearMiss:     boolean
    streakBroken:   boolean
    previousStreak: number
  }) => void
  dismissResult: () => void

  // Chest
  incrementPredCount: () => void
  openChest:          (reward: ChestReward) => void
  dismissChest:       () => void

  // Login streak
  applyLoginStreak: (state: LoginStreakState) => void
  dismissLoginStreak: () => void

  // Rank up
  dismissRankUp: () => void

  // Ghost
  setGhostUsedToday: (used: boolean) => void

  // Sync from server/DB
  syncStreak: (streak: number) => void
  syncXP:     (xp: number) => void

  // Reset
  resetSession: () => void
}

// ─── Helpers ──────────────────────────────────────────────────

export function rankFromXP(xp: number): string {
  const tiers = Object.entries(RANK_THRESHOLDS).sort(([,a],[,b]) => b - a)
  for (const [rank, threshold] of tiers) {
    if (xp >= threshold) return rank
  }
  return 'BRONZE'
}

export function nextRankInfo(xp: number): { next: string | null; threshold: number; progress: number } {
  const ordered = ['BRONZE','SILVER','GOLD','DIAMOND','ORACLE']
  const current = rankFromXP(xp)
  const idx     = ordered.indexOf(current)
  if (idx === ordered.length - 1) return { next: null, threshold: 0, progress: 100 }
  const next   = ordered[idx + 1]
  const cur    = RANK_THRESHOLDS[current]
  const nxt    = RANK_THRESHOLDS[next]
  return { next, threshold: nxt, progress: Math.min(Math.floor(((xp - cur) / (nxt - cur)) * 100), 99) }
}

export function calcClientPayout(wager: number, outcome: OutcomeType, streak: number, isDegen: boolean, isGhost: boolean): number {
  if (outcome !== 'WIN') return outcome === 'DRAW' ? wager : 0
  let mult = BASE_PAYOUT_MULT
  const tiers = [7, 5, 3] as const
  for (const t of tiers) {
    if (streak >= t) { mult += STREAK_BONUSES[t]; break }
  }
  if (isDegen) mult *= DEGEN_WIN_MULT
  if (isGhost) mult  = GHOST_WIN_MULT
  return +(wager * mult).toFixed(4)
}

export function streakBonus(streak: number): number {
  const tiers = [7, 5, 3] as const
  for (const t of tiers) {
    if (streak >= t) return STREAK_BONUSES[t]
  }
  return 0
}

// ─── Store ────────────────────────────────────────────────────

const BETA_START = 1000

export const useGameStore = create<GameState & GameActions>()(
  devtools(
    subscribeWithSelector((set, get) => ({

      // ── Initial state ──────────────────────────────────────

      mode:        'BETA',
      betaCredits: BETA_START,

      currentPrice:    0,
      previousPrice:   0,
      priceHistory:    [],
      lastPriceUpdate: 0,

      currentRound:  null,
      timeRemaining: 0,

      userPrediction: null,
      wagerAmount:    25,
      isDegenMode:    false,
      isGhostMode:    false,
      ghostUsedToday: false,

      streak:     0,
      bestStreak: 0,

      lastResult:  null,
      showResult:  false,

      predCount:    0,
      chestReady:   false,
      pendingChest: null,

      loginStreak: null,

      xp:   0,
      rank: 'BRONZE',

      predictionHistory: [],

      degenWarningShown: false,
      showRankUp:        false,
      prevRank:          'BRONZE',

      // ── Mode ───────────────────────────────────────────────

      setMode: (mode) => set({ mode }, false, 'setMode'),

      addCredits: (amount) => set((s) => ({
        betaCredits: +(s.betaCredits + amount).toFixed(4),
      }), false, 'addCredits'),

      // ── Price ──────────────────────────────────────────────

      updatePrice: (price) => set((s) => ({
        previousPrice:   s.currentPrice,
        currentPrice:    price,
        lastPriceUpdate: Date.now(),
      }), false, 'updatePrice'),

      appendPriceHistory: (point) => set((s) => ({
        priceHistory: [...s.priceHistory.slice(-300), point],
      }), false, 'appendPriceHistory'),

      // ── Round ──────────────────────────────────────────────

      setCurrentRound: (round) => set({
        currentRound:  round,
        userPrediction: null,
        showResult:     false,
        lastResult:     null,
      }, false, 'setCurrentRound'),

      updateRoundStatus: (status) => set((s) => ({
        currentRound: s.currentRound ? { ...s.currentRound, status } : null,
      }), false, 'updateRoundStatus'),

      setRoundLocked: () => set((s) => ({
        currentRound: s.currentRound ? { ...s.currentRound, status: 'LOCKED' } : null,
      }), false, 'setRoundLocked'),

      setTimeRemaining: (sec) => set({ timeRemaining: sec }, false, 'setTimeRemaining'),

      updatePool: (poolUp, poolDown, total, upPct, downPct) => set((s) => ({
        currentRound: s.currentRound
          ? { ...s.currentRound, poolUp, poolDown, totalPreds: s.currentRound.totalPreds }
          : null,
      }), false, 'updatePool'),

      // ── Prediction ─────────────────────────────────────────

      setWager: (amount) => set({ wagerAmount: Math.max(1, amount) }, false, 'setWager'),

      toggleDegen: () => set((s) => {
        const newVal = !s.isDegenMode
        // Cannot enable if balance < 2× wager
        if (newVal && s.mode === 'BETA' && s.betaCredits < s.wagerAmount * 2) {
          return {}
        }
        return { isDegenMode: newVal }
      }, false, 'toggleDegen'),

      toggleGhost: () => set((s) => {
        if (!s.isGhostMode && s.ghostUsedToday) return {}  // already used
        return { isGhostMode: !s.isGhostMode }
      }, false, 'toggleGhost'),

      markDegenSeen: () => set({ degenWarningShown: true }, false, 'markDegenSeen'),

      submitPrediction: (direction) => {
        const s = get()
        if (!s.currentRound) return
        if (s.userPrediction) return
        if (s.currentRound.status !== 'OPEN') return

        const actualWager = s.isDegenMode ? s.wagerAmount * 2 : s.wagerAmount
        if (s.mode === 'BETA' && s.betaCredits < actualWager) return

        // Deduct immediately (optimistic)
        const newCredits = s.mode === 'BETA' ? +(s.betaCredits - actualWager).toFixed(4) : s.betaCredits

        const pred: Prediction = {
          id:          `p_${Date.now()}`,
          roundId:     s.currentRound.id,
          direction,
          entryPrice:  s.currentPrice,
          resultPrice: null,
          outcome:     null,
          wager:       actualWager,
          payout:      0,
          multiplier:  0,
          streakAtSub: s.streak,
          streakBonus: streakBonus(s.streak),
          xpAwarded:   0,
          isDegen:     s.isDegenMode,
          isGhost:     s.isGhostMode,
          isNearMiss:  false,
          timestamp:   Date.now(),
        }

        set({
          userPrediction: pred,
          betaCredits:    newCredits,
          ghostUsedToday: s.isGhostMode ? true : s.ghostUsedToday,
          isGhostMode:    false,  // auto-reset after use
        }, false, 'submitPrediction')
      },

      // ── Result ─────────────────────────────────────────────

      applyResult: (result) => {
        const s = get()

        // Update prediction record
        const updatedPred: Prediction | null = s.userPrediction
          ? {
              ...s.userPrediction,
              resultPrice: result.exitPrice,
              outcome:     result.outcome,
              payout:      result.payout,
              multiplier:  result.multiplier,
              xpAwarded:   result.xpAwarded,
              isNearMiss:  result.isNearMiss,
            }
          : null

        // Credit payout to beta balance
        const newCredits = s.mode === 'BETA' && result.payout > 0
          ? +(s.betaCredits + result.payout).toFixed(4)
          : s.betaCredits

        // Update XP and rank
        const newXP   = s.xp + result.xpAwarded
        const newRank = rankFromXP(newXP)
        const ranked  = newRank !== s.rank

        const resultState: ResultState = {
          outcome:        result.outcome,
          entryPrice:     result.entryPrice,
          exitPrice:      result.exitPrice,
          movePct:        ((result.exitPrice - result.entryPrice) / result.entryPrice) * 100,
          payout:         result.payout,
          multiplier:     result.multiplier,
          streakAfter:    result.streakAfter,
          xpAwarded:      result.xpAwarded,
          isNearMiss:     result.isNearMiss,
          streakBroken:   result.streakBroken,
          previousStreak: result.previousStreak,
          isDegen:        updatedPred?.isDegen ?? false,
          isGhost:        updatedPred?.isGhost ?? false,
        }

        set((s2) => ({
          lastResult:        resultState,
          showResult:        true,
          betaCredits:       newCredits,
          streak:            result.streakAfter,
          bestStreak:        Math.max(s2.bestStreak, result.streakAfter),
          xp:                newXP,
          rank:              newRank,
          prevRank:          s2.rank,
          showRankUp:        ranked,
          predCount:         s2.predCount + 1,
          chestReady:        (s2.predCount + 1) % CHEST_EVERY_N === 0,
          userPrediction:    updatedPred,
          predictionHistory: updatedPred
            ? [updatedPred, ...s2.predictionHistory.slice(0, 49)]
            : s2.predictionHistory,
        }), false, 'applyResult')
      },

      dismissResult: () => set({
        showResult:     false,
        lastResult:     null,
        userPrediction: null,
      }, false, 'dismissResult'),

      // ── Chest ──────────────────────────────────────────────

      incrementPredCount: () => set((s) => {
        const n = s.predCount + 1
        return { predCount: n, chestReady: n % CHEST_EVERY_N === 0 }
      }, false, 'incrementPredCount'),

      openChest: (reward) => set({
        pendingChest: reward,
        chestReady:   false,
      }, false, 'openChest'),

      dismissChest: () => {
        const s = get()
        const reward = s.pendingChest
        if (!reward) return set({ pendingChest: null }, false, 'dismissChest')

        // Apply reward
        const newCredits = s.mode === 'BETA'
          ? +(s.betaCredits + reward.credits).toFixed(4)
          : s.betaCredits
        const newXP   = s.xp + reward.xp
        const newRank = rankFromXP(newXP)

        set((s2) => ({
          pendingChest: null,
          betaCredits:  newCredits,
          xp:           newXP,
          rank:         newRank,
          prevRank:     s2.rank,
          showRankUp:   newRank !== s2.rank,
        }), false, 'dismissChest')
      },

      // ── Login streak ───────────────────────────────────────

      applyLoginStreak: (state) => set({ loginStreak: state }, false, 'applyLoginStreak'),
      dismissLoginStreak: () => set({ loginStreak: null }, false, 'dismissLoginStreak'),

      // ── Rank up ─────────────────────────────────────────────

      dismissRankUp: () => set({ showRankUp: false }, false, 'dismissRankUp'),

      // ── Ghost ──────────────────────────────────────────────

      setGhostUsedToday: (used) => set({ ghostUsedToday: used, isGhostMode: used ? false : get().isGhostMode }, false, 'setGhostUsedToday'),

      // ── Sync ───────────────────────────────────────────────

      syncStreak: (streak) => set((s) => ({
        streak,
        bestStreak: Math.max(s.bestStreak, streak),
      }), false, 'syncStreak'),

      syncXP: (xp) => set({
        xp,
        rank: rankFromXP(xp),
      }, false, 'syncXP'),

      // ── Reset ──────────────────────────────────────────────

      resetSession: () => set({
        betaCredits:       BETA_START,
        userPrediction:    null,
        lastResult:        null,
        showResult:        false,
        streak:            0,
        predCount:         0,
        chestReady:        false,
        pendingChest:      null,
        loginStreak:       null,
        degenWarningShown: false,
        predictionHistory: [],
      }, false, 'resetSession'),

    })),
    { name: 'KAIROX-Game' }
  )
)
