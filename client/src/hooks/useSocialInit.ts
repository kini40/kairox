// ─────────────────────────────────────────────────────────────
//  KAIROX – useSocialInit  (boots social systems on mount)
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react'
import { socketService }  from '../utils/socketService'
import { useSocialStore } from '../store/socialStore'
import { useGameStore }   from '../store/gameStore'
import { useWalletStore } from '../store/walletStore'

// LB update listener patches into the socketService register
// by subscribing to the store after initial load.
export function useSocialInit(userId?: string | null) {
  const { setRival, setNotifications, setLBSnapshot } = useSocialStore()
  const { xp, rank, streak }  = useGameStore()
  const { publicKey }          = useWalletStore()
  const ran                    = useRef(false)

  useEffect(() => {
    if (ran.current || !socketService.isConnected) return

    // Identify user so server can assign rival + push notifications
    if (userId && publicKey) {
      ran.current = true
      socketService.identify(
        { userId, username: publicKey.slice(0,6), xp, streak, rank },
        (res: any) => {
          if (res?.rival)         setRival(res.rival)
          if (res?.notifications) setNotifications(res.notifications, res.unreadCount ?? 0)
        }
      )
    }

    // Pre-fetch leaderboard
    socketService.getLeaderboard('weekly', (res: any) => {
      if (res?.ok && res.snapshot) setLBSnapshot(res.snapshot)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, socketService.isConnected])

  // Listen for real-time LB updates pushed every 30s
  useEffect(() => {
    // These are handled in socketService.ts register() via:
    // sock.on(`leaderboard:update:${period}`, ...) → setLBSnapshot
    // No additional setup needed here; store updates reactively.
  }, [])
}
