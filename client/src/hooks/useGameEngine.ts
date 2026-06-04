// ─────────────────────────────────────────────────────────────
//  KAIROX – useGameEngine  (main hook wiring store + socket)
// ─────────────────────────────────────────────────────────────

import { useEffect, useCallback, useRef } from 'react'
import { useGameStore }   from '../store/gameStore'
import { useUIStore }     from '../store/uiStore'
import { socketService }  from '../utils/socketService'
import { priceFeed }      from '../utils/priceFeed'

export function useGameEngine() {
  const store  = useGameStore()
  const { addToast } = useUIStore()
  const initialized = useRef(false)

  // ── Boot ───────────────────────────────────────────────────

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    // Start price polling fallback
    priceFeed.start()

    // Connect WebSocket
    socketService.connect()

    // Daily login ping (if user has ID stored — else client handles in beta)
    const { streak, xp } = useGameStore.getState()
    if (streak > 0) socketService.syncStreak(streak)

    return () => {
      priceFeed.stop()
      socketService.disconnect()
    }
  }, [])

  // ── Submit prediction ──────────────────────────────────────

  const submitPrediction = useCallback((direction: 'UP' | 'DOWN') => {
    const s = store

    // Edge cases
    if (!s.currentRound) { addToast({ type: 'error', title: 'No active round' }); return }
    if (s.currentRound.status !== 'OPEN') { addToast({ type: 'warning', title: 'Predictions are locked' }); return }
    if (s.userPrediction) { addToast({ type: 'warning', title: 'Already predicted this round' }); return }

    const actualWager = s.isDegenMode ? s.wagerAmount * 2 : s.wagerAmount
    if (s.mode === 'BETA' && s.betaCredits < actualWager) {
      addToast({ type: 'error', title: 'Insufficient credits', message: `Need ${actualWager}β, have ${s.betaCredits.toFixed(0)}β` })
      return
    }

    // Ghost daily check
    if (s.isGhostMode && s.ghostUsedToday) {
      addToast({ type: 'warning', title: 'Ghost used today', message: 'Resets at midnight UTC' })
      return
    }

    // Degen: warn on first use this session
    if (s.isDegenMode && !s.degenWarningShown) {
      // Warning handled by UI — don't block here, just mark
    }

    // Optimistic update to store
    s.submitPrediction(direction)

    // Emit to server
    socketService.submitPrediction({
      roundId:   s.currentRound.id,
      direction,
      wager:     actualWager,
      isDegen:   s.isDegenMode,
      isGhost:   s.isGhostMode,
      mode:      s.mode,
      streak:    s.streak,
    }, (res) => {
      if (!res.ok) {
        // Revert optimistic update
        s.addCredits(actualWager)
        addToast({ type: 'error', title: 'Prediction rejected', message: res.error })
        useGameStore.setState({ userPrediction: null })
        return
      }
      // Sync entry price from server
      if (res.entryPrice && s.userPrediction) {
        useGameStore.setState((prev) => ({
          userPrediction: prev.userPrediction
            ? { ...prev.userPrediction, entryPrice: res.entryPrice! }
            : null,
        }))
      }
    })
  }, [store, addToast])

  // ── Claim chest ────────────────────────────────────────────

  const claimChest = useCallback(() => {
    const s = useGameStore.getState()
    if (!s.chestReady) return

    socketService.claimChest({
      userId:   null,  // replace with real userId when authenticated
      socketId: socketService.id ?? '',
      mode:     s.mode,
    }, (res) => {
      if (res.ok && res.reward) {
        s.openChest(res.reward)
      } else {
        // Fallback: roll client-side for beta
        const betaReward = rollClientChest(s.mode)
        s.openChest(betaReward)
      }
    })

    // If not connected, roll locally for beta
    if (!socketService.isConnected) {
      const betaReward = rollClientChest(store.mode)
      store.openChest(betaReward)
    }
  }, [store])

  // ── Confirm result dismiss ─────────────────────────────────

  const dismissResult = useCallback(() => {
    store.dismissResult()
  }, [store])

  return {
    submitPrediction,
    claimChest,
    dismissResult,
    isConnected: socketService.isConnected,
  }
}

// ─── Client-side chest roll (beta fallback) ───────────────────

import type { ChestReward, ChestRewardType, GameMode } from '../store/gameStore'

const CHEST_TABLE = [
  { type: 'EMPTY',         weight: 40 },
  { type: 'XP_SMALL',      weight: 20 },
  { type: 'XP_LARGE',      weight: 10 },
  { type: 'CREDITS_SMALL', weight: 20 },
  { type: 'CREDITS_LARGE', weight: 7  },
  { type: 'SOL_SMALL',     weight: 2  },
  { type: 'SOL_LARGE',     weight: 1  },
]

function rollClientChest(mode: GameMode): ChestReward {
  const roll = Math.random() * 100
  let cum = 0, picked: ChestRewardType = 'EMPTY'
  for (const e of CHEST_TABLE) {
    cum += e.weight
    if (roll < cum) { picked = e.type as ChestRewardType; break }
  }
  const map: Record<ChestRewardType, ChestReward> = {
    EMPTY:         { type: 'EMPTY',         xp: 25,  credits: 0,   sol: 0,     label: 'Better luck next time…' },
    XP_SMALL:      { type: 'XP_SMALL',      xp: 50,  credits: 0,   sol: 0,     label: '+50 XP!' },
    XP_LARGE:      { type: 'XP_LARGE',      xp: 100, credits: 0,   sol: 0,     label: '+100 XP!' },
    CREDITS_SMALL: { type: 'CREDITS_SMALL', xp: 0,   credits: 50,  sol: 0,     label: '+50 Credits!' },
    CREDITS_LARGE: { type: 'CREDITS_LARGE', xp: 0,   credits: 100, sol: 0,     label: '+100 Credits!' },
    SOL_SMALL:     { type: 'SOL_SMALL',     xp: 0,   credits: mode === 'BETA' ? 50  : 0, sol: mode === 'LIVE' ? 0.005 : 0, label: mode === 'BETA' ? '+50 Credits!' : '+0.005 SOL!' },
    SOL_LARGE:     { type: 'SOL_LARGE',     xp: 0,   credits: mode === 'BETA' ? 100 : 0, sol: mode === 'LIVE' ? 0.01  : 0, label: mode === 'BETA' ? '+100 Credits!' : '+0.01 SOL!' },
  }
  return map[picked]
}
