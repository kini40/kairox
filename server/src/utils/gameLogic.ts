// ─────────────────────────────────────────────────────────────
//  KAIROX – Pure game-logic functions (no side effects)
// ─────────────────────────────────────────────────────────────

import type {
  Direction, OutcomeType, ChestReward, ChestRewardType, GameMode,
} from '../types/game.js'

// ─── Constants ───────────────────────────────────────────────

export const ROUND_DURATION_MS    = 60_000
export const LOCK_BEFORE_END_MS   = 10_000   // predictions lock at T-10s
export const SETTLE_DELAY_MS      = 2_500    // pause between close and settle
export const NEXT_ROUND_DELAY_MS  = 3_000    // pause between settle and next open

export const BASE_PAYOUT_MULT     = 1.85     // house keeps 7.5%
export const DEGEN_WIN_MULT       = 2.0      // degen doubles total payout
export const GHOST_WIN_MULT       = 3.0      // ghost triples total payout
export const DRAW_THRESHOLD_PCT   = 0.05     // ≤ 0.05% = DRAW
export const NEAR_MISS_PCT        = 0.10     // ≤ 0.10% against = near miss

// Streak bonus multipliers (additive on top of base)
export const STREAK_BONUSES: Record<number, number> = {
  3: 0.10,   // +10%
  5: 0.20,   // +20%
  7: 0.35,   // +35%
}

// XP values
export const XP = {
  WIN:         100,
  LOSS:        10,
  DRAW:        20,
  NEAR_MISS:   25,
  DAILY_LOGIN: 100,
  CHEST_MIN:   50,
  CHEST_MAX:   100,
} as const

// Rank XP thresholds
export const RANK_THRESHOLDS: Record<string, number> = {
  BRONZE:  0,
  SILVER:  500,
  GOLD:    1500,
  DIAMOND: 4000,
  ORACLE:  10000,
}

// Weekly loss bonus tiers
export const LOSS_BONUS_TIERS = [
  { threshold: 1.0,   bonusPct: 0.20, creditThreshold: 1000, label: '20%' },
  { threshold: 0.5,   bonusPct: 0.15, creditThreshold: 500,  label: '15%' },
] as const

// Chest reward weights (must sum to 100)
const CHEST_TABLE: Array<{ type: ChestRewardType; weight: number }> = [
  { type: 'EMPTY',         weight: 40 },
  { type: 'XP_SMALL',      weight: 20 },
  { type: 'XP_LARGE',      weight: 10 },
  { type: 'CREDITS_SMALL', weight: 20 },
  { type: 'CREDITS_LARGE', weight: 7  },
  { type: 'SOL_SMALL',     weight: 2  },
  { type: 'SOL_LARGE',     weight: 1  },
]

// ─── Price movement helpers ───────────────────────────────────

export function calcMovementPct(entry: number, exit: number): number {
  if (!entry) return 0
  return ((exit - entry) / entry) * 100
}

export function determineDirection(entry: number, exit: number): Direction | 'FLAT' {
  const pct = calcMovementPct(entry, exit)
  if (Math.abs(pct) <= DRAW_THRESHOLD_PCT) return 'FLAT'
  return pct > 0 ? 'UP' : 'DOWN'
}

// ─── Outcome determination ────────────────────────────────────

export interface OutcomeResult {
  outcome:    OutcomeType
  isNearMiss: boolean
  movePct:    number
  direction:  Direction | 'FLAT'
}

export function determineOutcome(
  prediction: Direction,
  entryPrice: number,
  exitPrice:  number,
): OutcomeResult {
  const movePct   = calcMovementPct(entryPrice, exitPrice)
  const absMove   = Math.abs(movePct)
  const direction = determineDirection(entryPrice, exitPrice)

  if (direction === 'FLAT') {
    return { outcome: 'DRAW', isNearMiss: false, movePct, direction }
  }

  const won = direction === prediction

  if (won) {
    return { outcome: 'WIN', isNearMiss: false, movePct, direction }
  }

  // Near miss: price moved against them by < NEAR_MISS_PCT
  const isNearMiss = absMove < NEAR_MISS_PCT
  return { outcome: isNearMiss ? 'NEAR_MISS' : 'LOSS', isNearMiss, movePct, direction }
}

// ─── Payout calculation ───────────────────────────────────────

export interface PayoutResult {
  payout:      number   // amount returned to player (0 on loss)
  multiplier:  number   // final multiplier applied
  streakBonus: number   // fractional bonus (e.g. 0.10)
  xpAwarded:   number
}

export function calcPayout(
  wager:      number,
  outcome:    OutcomeType,
  streak:     number,
  isDegen:    boolean,
  isGhost:    boolean,
): PayoutResult {
  // Base multiplier
  let mult     = BASE_PAYOUT_MULT
  let streakBonus = 0

  if (outcome === 'WIN') {
    // Apply streak bonus (highest applicable tier)
    const tiers = [7, 5, 3] as const
    for (const t of tiers) {
      if (streak >= t) {
        streakBonus = STREAK_BONUSES[t]
        mult += streakBonus
        break
      }
    }

    // Degen doubles the base (not the streak bonus)
    if (isDegen) mult = mult * DEGEN_WIN_MULT

    // Ghost triples the TOTAL (applied last, mutually exclusive with degen in practice
    // but spec says ghost triples – apply if ghost)
    if (isGhost) mult = GHOST_WIN_MULT  // ghost overrides to flat 3×

    const payout    = +(wager * mult).toFixed(6)
    const xpAwarded = XP.WIN + Math.floor(streak * 10)
    return { payout, multiplier: mult, streakBonus, xpAwarded }

  } else if (outcome === 'DRAW') {
    return { payout: wager, multiplier: 1, streakBonus: 0, xpAwarded: XP.DRAW }

  } else {
    // LOSS / NEAR_MISS — no payout; degen doubles the loss (already deducted at submit)
    return {
      payout:     0,
      multiplier: 0,
      streakBonus: 0,
      xpAwarded:  outcome === 'NEAR_MISS' ? XP.NEAR_MISS : XP.LOSS,
    }
  }
}

// ─── Streak management ────────────────────────────────────────

export function updateStreak(current: number, outcome: OutcomeType): number {
  if (outcome === 'WIN')  return current + 1
  if (outcome === 'DRAW') return current  // draw doesn't reset streak
  return 0                                // LOSS / NEAR_MISS resets
}

export function isStreakOnFire(streak: number): boolean {
  return streak >= 3
}

// ─── Degen mode validation ────────────────────────────────────

export function validateDegen(
  balance:  number,
  wager:    number,
): { ok: boolean; reason?: string } {
  if (balance < wager * 2) {
    return { ok: false, reason: `Insufficient balance. Degen mode requires ${(wager * 2).toFixed(2)} (2× wager).` }
  }
  return { ok: true }
}

// ─── Ghost mode validation ────────────────────────────────────

export function canUseGhost(lastGhostDate: string | null): boolean {
  if (!lastGhostDate) return true
  const last = new Date(lastGhostDate)
  const now  = new Date()
  // Reset at midnight UTC
  return (
    last.getUTCFullYear() !== now.getUTCFullYear() ||
    last.getUTCMonth()    !== now.getUTCMonth()    ||
    last.getUTCDate()     !== now.getUTCDate()
  )
}

// ─── Loot chest ───────────────────────────────────────────────

export function rollChest(mode: GameMode): ChestReward {
  const roll = Math.random() * 100
  let cumulative = 0
  let picked: ChestRewardType = 'EMPTY'

  for (const entry of CHEST_TABLE) {
    cumulative += entry.weight
    if (roll < cumulative) { picked = entry.type; break }
  }

  const rewards: Record<ChestRewardType, ChestReward> = {
    EMPTY:         { type: 'EMPTY',         xp: 25,  credits: 0,   sol: 0,     label: 'Better luck next time...' },
    XP_SMALL:      { type: 'XP_SMALL',      xp: 50,  credits: 0,   sol: 0,     label: '+50 XP' },
    XP_LARGE:      { type: 'XP_LARGE',      xp: 100, credits: 0,   sol: 0,     label: '+100 XP' },
    CREDITS_SMALL: { type: 'CREDITS_SMALL', xp: 0,   credits: mode === 'BETA' ? 50  : 0, sol: mode === 'LIVE' ? 0.005 : 0, label: mode === 'BETA' ? '+50 Credits' : '+0.005 SOL' },
    CREDITS_LARGE: { type: 'CREDITS_LARGE', xp: 0,   credits: mode === 'BETA' ? 100 : 0, sol: mode === 'LIVE' ? 0.01  : 0, label: mode === 'BETA' ? '+100 Credits' : '+0.01 SOL' },
    SOL_SMALL:     { type: 'SOL_SMALL',     xp: 0,   credits: mode === 'BETA' ? 50  : 0, sol: mode === 'LIVE' ? 0.005 : 0, label: mode === 'BETA' ? '+50 Credits' : '+0.005 SOL' },
    SOL_LARGE:     { type: 'SOL_LARGE',     xp: 0,   credits: mode === 'BETA' ? 100 : 0, sol: mode === 'LIVE' ? 0.01  : 0, label: mode === 'BETA' ? '+100 Credits' : '+0.01 SOL' },
  }

  return rewards[picked]
}

// ─── Daily login ─────────────────────────────────────────────

export interface LoginStreakResult {
  newStreak:      number
  xpAwarded:      number
  dayMultiplier:  number  // 1 normally, 10 on day-7
  isReset:        boolean
}

export function calcLoginStreak(
  lastLoginDate: string | null,
  currentStreak: number,
): LoginStreakResult {
  const now     = new Date()
  const todayUTC = `${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}-${String(now.getUTCDate()).padStart(2,'0')}`

  if (!lastLoginDate) {
    return { newStreak: 1, xpAwarded: XP.DAILY_LOGIN, dayMultiplier: 1, isReset: false }
  }

  const last    = new Date(lastLoginDate)
  const lastUTC = `${last.getUTCFullYear()}-${String(last.getUTCMonth()+1).padStart(2,'0')}-${String(last.getUTCDate()).padStart(2,'0')}`

  if (lastUTC === todayUTC) {
    // Already logged in today — no change
    return { newStreak: currentStreak, xpAwarded: 0, dayMultiplier: 1, isReset: false }
  }

  // Check if yesterday
  const yesterday = new Date(now)
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  const yUTC = `${yesterday.getUTCFullYear()}-${String(yesterday.getUTCMonth()+1).padStart(2,'0')}-${String(yesterday.getUTCDate()).padStart(2,'0')}`

  if (lastUTC !== yUTC) {
    // Missed a day — reset to 1
    return { newStreak: 1, xpAwarded: XP.DAILY_LOGIN, dayMultiplier: 1, isReset: true }
  }

  const newStreak = currentStreak + 1
  const dayMult   = newStreak % 7 === 0 ? 10 : 1   // every 7th day
  const xp        = XP.DAILY_LOGIN * (dayMult === 10 ? 10 : 1)

  return { newStreak, xpAwarded: xp, dayMultiplier: dayMult, isReset: false }
}

// ─── Weekly loss bonus ────────────────────────────────────────

export interface LossBonusResult {
  eligible:    boolean
  bonusPct:    number
  bonusAmount: number
  tier:        string
}

export function calcWeeklyLossBonus(totalLoss: number, mode: GameMode): LossBonusResult {
  for (const tier of LOSS_BONUS_TIERS) {
    const threshold = mode === 'LIVE' ? tier.threshold : tier.creditThreshold
    if (totalLoss >= threshold) {
      return {
        eligible:    true,
        bonusPct:    tier.bonusPct,
        bonusAmount: +(totalLoss * tier.bonusPct).toFixed(6),
        tier:        tier.label,
      }
    }
  }
  return { eligible: false, bonusPct: 0, bonusAmount: 0, tier: '' }
}

// ─── Rank from XP ─────────────────────────────────────────────

export function rankFromXP(xp: number): string {
  const tiers = Object.entries(RANK_THRESHOLDS).sort(([,a],[,b]) => b - a)
  for (const [rank, threshold] of tiers) {
    if (xp >= threshold) return rank
  }
  return 'BRONZE'
}

export function nextRankXP(xp: number): { next: string | null; threshold: number; progress: number } {
  const ordered = ['BRONZE','SILVER','GOLD','DIAMOND','ORACLE']
  const current = rankFromXP(xp)
  const idx     = ordered.indexOf(current)
  if (idx === ordered.length - 1) return { next: null, threshold: 0, progress: 100 }
  const next      = ordered[idx + 1]
  const curThresh = RANK_THRESHOLDS[current]
  const nxtThresh = RANK_THRESHOLDS[next]
  const progress  = Math.floor(((xp - curThresh) / (nxtThresh - curThresh)) * 100)
  return { next, threshold: nxtThresh, progress: Math.min(progress, 99) }
}
