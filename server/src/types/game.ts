// ─────────────────────────────────────────────────────────────
//  KAIROX  –  Shared game types (server-side)
// ─────────────────────────────────────────────────────────────

export type Direction    = 'UP' | 'DOWN'
export type RoundStatus  = 'OPEN' | 'LOCKED' | 'CLOSED' | 'SETTLING' | 'SETTLED'
export type OutcomeType  = 'WIN' | 'LOSS' | 'DRAW' | 'NEAR_MISS'
export type GameMode     = 'BETA' | 'LIVE'
export type RankTier     = 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND' | 'ORACLE'

// ─── Round ───────────────────────────────────────────────────

export interface Round {
  id:          string
  startPrice:  number
  endPrice:    number | null
  startTime:   number        // epoch ms
  endTime:     number        // epoch ms
  lockTime:    number        // endTime - 10 000 ms
  duration:    number        // seconds
  status:      RoundStatus
  poolUp:      number        // aggregate SOL/credits wagered UP
  poolDown:    number        // aggregate SOL/credits wagered DOWN
  totalPreds:  number
}

// ─── Prediction (in-memory, submitted by a socket) ───────────

export interface PendingPrediction {
  socketId:     string
  userId:       string | null   // null = beta anon
  roundId:      string
  direction:    Direction
  entryPrice:   number
  wager:        number          // SOL or credits (normalised)
  mode:         GameMode
  isDegen:      boolean
  isGhost:      boolean
  streak:       number          // streak at time of submission (for bonus calc)
  submittedAt:  number
}

// ─── Settlement result (per prediction) ─────────────────────

export interface SettlementResult {
  socketId:    string
  userId:      string | null
  roundId:     string
  direction:   Direction
  entryPrice:  number
  exitPrice:   number
  outcome:     OutcomeType
  wager:       number
  payout:      number           // net credit/SOL back to user (0 on LOSS)
  multiplier:  number
  streakAfter: number
  streakBonus: number           // fractional bonus applied (e.g. 0.10)
  xpAwarded:   number
  isDegen:     boolean
  isGhost:     boolean
  isNearMiss:  boolean
}

// ─── Chest ───────────────────────────────────────────────────

export type ChestRewardType = 'EMPTY' | 'XP_SMALL' | 'XP_LARGE' | 'CREDITS_SMALL' | 'CREDITS_LARGE' | 'SOL_SMALL' | 'SOL_LARGE'

export interface ChestReward {
  type:         ChestRewardType
  xp:           number
  credits:      number
  sol:          number
  label:        string
}

// ─── Socket event payloads (server → client) ────────────────

export interface RoundNewPayload {
  id:         string
  startPrice: number
  startTime:  number
  endTime:    number
  lockTime:   number
  duration:   number
  status:     RoundStatus
}

export interface RoundTickPayload {
  roundId:      string
  status:       RoundStatus
  timeRemaining: number
  isLocked:     boolean
}

export interface RoundSettledPayload {
  roundId:    string
  startPrice: number
  endPrice:   number
  movement:   number       // absolute %
  direction:  Direction | 'FLAT'
}

export interface PredictionResultPayload {
  socketId:    string
  roundId:     string
  outcome:     OutcomeType
  direction:   Direction
  entryPrice:  number
  exitPrice:   number
  payout:      number
  multiplier:  number
  streakAfter: number
  xpAwarded:   number
  isNearMiss:  boolean
  streakBroken: boolean
  previousStreak: number
}

export interface PoolUpdatePayload {
  roundId:  string
  poolUp:   number
  poolDown: number
  total:    number
  upPct:    number
  downPct:  number
}

// ─── Socket event payloads (client → server) ────────────────

export interface SubmitPredictionPayload {
  roundId:    string
  direction:  Direction
  wager:      number
  isDegen:    boolean
  isGhost:    boolean
  mode:       GameMode
  userId?:    string
  streak?:    number
}

export interface ClaimChestPayload {
  userId:    string | null
  socketId:  string
  mode:      GameMode
}
