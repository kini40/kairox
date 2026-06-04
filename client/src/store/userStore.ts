import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRank =
  | 'ROOKIE'
  | 'TRADER'
  | 'HUNTER'
  | 'SHARK'
  | 'ORACLE'
  | 'LEGEND'

export interface UserProfile {
  id: string
  walletAddress: string
  username: string
  rank: UserRank
  totalPredictions: number
  correctPredictions: number
  streakCurrent: number
  streakBest: number
  xp: number
  createdAt: string
  avatarSeed?: string  // for generated avatar
}

export interface UserState {
  profile: UserProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null

  // Leaderboard position
  leaderboardRank: number | null

  // Pending username setup
  needsUsername: boolean
  pendingWalletAddress: string | null
}

export interface UserActions {
  setProfile: (profile: UserProfile) => void
  updateProfile: (partial: Partial<UserProfile>) => void
  clearProfile: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setLeaderboardRank: (rank: number | null) => void
  setNeedsUsername: (needs: boolean, wallet?: string) => void
  addXP: (amount: number) => void
}

// ─── XP thresholds per rank ───────────────────────────────────────────────────

export const RANK_THRESHOLDS: Record<UserRank, number> = {
  ROOKIE:  0,
  TRADER:  500,
  HUNTER:  2000,
  SHARK:   6000,
  ORACLE:  15000,
  LEGEND:  40000,
}

export function getRankFromXP(xp: number): UserRank {
  if (xp >= RANK_THRESHOLDS.LEGEND) return 'LEGEND'
  if (xp >= RANK_THRESHOLDS.ORACLE) return 'ORACLE'
  if (xp >= RANK_THRESHOLDS.SHARK)  return 'SHARK'
  if (xp >= RANK_THRESHOLDS.HUNTER) return 'HUNTER'
  if (xp >= RANK_THRESHOLDS.TRADER) return 'TRADER'
  return 'ROOKIE'
}

export function getNextRankXP(xp: number): { next: UserRank | null; threshold: number; progress: number } {
  const ranks: UserRank[] = ['ROOKIE', 'TRADER', 'HUNTER', 'SHARK', 'ORACLE', 'LEGEND']
  const current = getRankFromXP(xp)
  const currentIdx = ranks.indexOf(current)
  if (currentIdx === ranks.length - 1) return { next: null, threshold: 0, progress: 100 }
  const next = ranks[currentIdx + 1]
  const currentThreshold = RANK_THRESHOLDS[current]
  const nextThreshold = RANK_THRESHOLDS[next]
  const progress = Math.floor(((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100)
  return { next, threshold: nextThreshold, progress: Math.min(progress, 100) }
}

export const RANK_COLORS: Record<UserRank, string> = {
  ROOKIE:  '#6B7280',
  TRADER:  '#00F5FF',
  HUNTER:  '#00FF88',
  SHARK:   '#7B2FFF',
  ORACLE:  '#FFB800',
  LEGEND:  '#FF2FA0',
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useUserStore = create<UserState & UserActions>()(
  devtools(
    persist(
      (set) => ({
        profile: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
        leaderboardRank: null,
        needsUsername: false,
        pendingWalletAddress: null,

        setProfile: (profile) => set({
          profile,
          isAuthenticated: true,
          needsUsername: false,
          pendingWalletAddress: null,
          error: null,
        }, false, 'setProfile'),

        updateProfile: (partial) => set((state) => ({
          profile: state.profile ? { ...state.profile, ...partial } : null,
        }), false, 'updateProfile'),

        clearProfile: () => set({
          profile: null,
          isAuthenticated: false,
          leaderboardRank: null,
          needsUsername: false,
          pendingWalletAddress: null,
        }, false, 'clearProfile'),

        setLoading: (isLoading) => set({ isLoading }, false, 'setLoading'),
        setError:   (error)     => set({ error },     false, 'setError'),

        setLeaderboardRank: (rank) => set({
          leaderboardRank: rank,
        }, false, 'setLeaderboardRank'),

        setNeedsUsername: (needs, wallet) => set({
          needsUsername: needs,
          pendingWalletAddress: wallet ?? null,
        }, false, 'setNeedsUsername'),

        addXP: (amount) => set((state) => {
          if (!state.profile) return {}
          const newXP = state.profile.xp + amount
          const newRank = getRankFromXP(newXP)
          return {
            profile: {
              ...state.profile,
              xp: newXP,
              rank: newRank,
            },
          }
        }, false, 'addXP'),
      }),
      {
        name: 'kairox-user',
        partialize: (state) => ({
          profile: state.profile,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    { name: 'KAIROX-UserStore' }
  )
)
