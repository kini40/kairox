import { useState, useEffect, useRef, useCallback } from 'react'

interface UseCountdownOptions {
  onComplete?: () => void
  onTick?: (remaining: number) => void
}

export function useCountdown(
  durationSeconds: number,
  autoStart = false,
  options: UseCountdownOptions = {}
) {
  const [remaining, setRemaining] = useState(durationSeconds)
  const [isRunning, setIsRunning] = useState(autoStart)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const optionsRef  = useRef(options)
  optionsRef.current = options

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsRunning(false)
  }, [])

  const start = useCallback(() => {
    if (intervalRef.current) return
    setIsRunning(true)
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        const next = Math.max(0, prev - 1)
        optionsRef.current.onTick?.(next)
        if (next === 0) {
          stop()
          optionsRef.current.onComplete?.()
        }
        return next
      })
    }, 1000)
  }, [stop])

  const reset = useCallback((newDuration?: number) => {
    stop()
    setRemaining(newDuration ?? durationSeconds)
  }, [stop, durationSeconds])

  const restart = useCallback((newDuration?: number) => {
    reset(newDuration)
    start()
  }, [reset, start])

  // Sync external duration changes
  useEffect(() => {
    setRemaining(durationSeconds)
  }, [durationSeconds])

  // Auto-start
  useEffect(() => {
    if (autoStart) start()
    return () => stop()
  }, [autoStart, start, stop])

  const progress = durationSeconds > 0
    ? (durationSeconds - remaining) / durationSeconds
    : 0

  const isUrgent = remaining <= 10 && remaining > 0

  return {
    remaining,
    isRunning,
    progress,
    isUrgent,
    start,
    stop,
    reset,
    restart,
    formatted: formatCountdown(remaining),
  }
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m > 0) return `${m}:${s.toString().padStart(2, '0')}`
  return `${s}`
}

// ─── Round countdown that syncs with game store ───────────────────────────────

import { useGameStore } from '@store/gameStore'

export function useRoundCountdown() {
  const { currentRound, timeRemaining, setTimeRemaining } = useGameStore()

  const duration = currentRound?.duration ?? 60
  const endTime  = currentRound?.endTime  ?? 0

  // Compute seconds remaining from server endTime
  const computeRemaining = () =>
    Math.max(0, Math.floor((endTime - Date.now()) / 1000))

  const [seconds, setSeconds] = useState(computeRemaining)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!endTime) return

    // Sync immediately
    const initial = computeRemaining()
    setSeconds(initial)
    setTimeRemaining(initial)

    intervalRef.current = setInterval(() => {
      const rem = computeRemaining()
      setSeconds(rem)
      setTimeRemaining(rem)
      if (rem <= 0 && intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }, 500)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endTime])

  const progress  = duration > 0 ? Math.max(0, Math.min(1, seconds / duration)) : 0
  const isUrgent  = seconds <= 10 && seconds > 0
  const isClosed  = seconds <= 0

  return {
    seconds,
    timeRemaining,
    progress,
    isUrgent,
    isClosed,
    formatted: seconds > 0 ? `${seconds}` : '0',
  }
}
