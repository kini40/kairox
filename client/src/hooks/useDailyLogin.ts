// ─────────────────────────────────────────────────────────────
//  KAIROX – useDailyLogin  (handles daily streak + XP on load)
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react'
import { useGameStore }   from '../store/gameStore'
import { socketService }  from '../utils/socketService'

const LS_KEY_LOGIN_DATE   = 'kx_last_login'
const LS_KEY_LOGIN_STREAK = 'kx_login_streak'

export function useDailyLogin(userId?: string | null) {
  const { applyLoginStreak } = useGameStore()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const lastDate    = localStorage.getItem(LS_KEY_LOGIN_DATE)
    const curStreak   = parseInt(localStorage.getItem(LS_KEY_LOGIN_STREAK) ?? '0', 10)
    const todayStr    = new Date().toISOString().slice(0, 10)

    // Already logged in today — skip
    if (lastDate === todayStr) return

    if (socketService.isConnected && userId) {
      socketService.triggerDailyLogin({
        userId,
        lastLoginDate:  lastDate,
        currentStreak:  curStreak,
      }, (res) => {
        if (!res.ok) return
        applyLoginStreak({
          streak:        res.newStreak,
          xpAwarded:     res.xpAwarded,
          dayMultiplier: res.dayMultiplier,
          isDay7:        res.isDay7,
          isReset:       res.isReset,
        })
        localStorage.setItem(LS_KEY_LOGIN_DATE,   todayStr)
        localStorage.setItem(LS_KEY_LOGIN_STREAK, String(res.newStreak))
      })
    } else {
      // Offline / beta: compute client-side
      const newStreak = calcLocalStreak(lastDate, curStreak)
      const isDay7    = newStreak % 7 === 0
      const xp        = isDay7 ? 1000 : 100

      applyLoginStreak({
        streak:        newStreak,
        xpAwarded:     lastDate ? xp : 0,  // no XP on very first login
        dayMultiplier: isDay7 ? 10 : 1,
        isDay7,
        isReset:       newStreak === 1 && curStreak > 1,
      })
      localStorage.setItem(LS_KEY_LOGIN_DATE,   todayStr)
      localStorage.setItem(LS_KEY_LOGIN_STREAK, String(newStreak))
    }
  }, [userId, applyLoginStreak])
}

function calcLocalStreak(lastDate: string | null, currentStreak: number): number {
  if (!lastDate) return 1
  const last  = new Date(lastDate)
  const now   = new Date()
  const yesterday = new Date(now)
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  const lastStr = last.toISOString().slice(0, 10)
  const yStr    = yesterday.toISOString().slice(0, 10)
  if (lastStr === yStr) return currentStreak + 1
  return 1  // streak reset
}
