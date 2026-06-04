// ─────────────────────────────────────────────────────────────
//  KAIROX – useRoundCountdown  (precise client-side timer)
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
import { useGameStore, LOCK_BEFORE_END_SEC } from '../store/gameStore'

export function useRoundCountdown() {
  const { currentRound, timeRemaining: serverTime } = useGameStore()

  const [seconds, setSeconds]     = useState(serverTime)
  const [isLocked, setIsLocked]   = useState(false)
  const intervalRef               = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!currentRound) { setSeconds(0); return }

    const tick = () => {
      const rem = Math.max(0, Math.floor((currentRound.endTime - Date.now()) / 1000))
      setSeconds(rem)
      setIsLocked(rem <= LOCK_BEFORE_END_SEC)
      if (rem === 0 && intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    tick()
    intervalRef.current = setInterval(tick, 250) // 250ms for smooth display

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [currentRound?.id, currentRound?.endTime])

  const duration   = currentRound?.duration ?? 60
  const progress   = duration > 0 ? Math.max(0, Math.min(1, seconds / duration)) : 0
  const isUrgent   = seconds <= 10 && seconds > 0
  const isClosed   = seconds === 0

  return { seconds, isLocked, isUrgent, isClosed, progress, duration }
}
