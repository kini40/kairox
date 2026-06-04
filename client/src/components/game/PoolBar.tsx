import { motion } from 'framer-motion'
import { useGameStore } from '@store/gameStore'

export function PoolBar() {
  const { currentRound } = useGameStore()

  const poolUp   = currentRound?.poolUp   ?? 0
  const poolDown = currentRound?.poolDown ?? 0
  const total    = poolUp + poolDown

  const upPct   = total > 0 ? (poolUp   / total) * 100 : 50
  const downPct = total > 0 ? (poolDown / total) * 100 : 50

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[11px] font-mono text-gray-500">
        <span className="text-bull font-semibold">↑ UP {upPct.toFixed(0)}%</span>
        <span className="text-gray-600">Pool: {total.toFixed(2)} SOL</span>
        <span className="text-bear font-semibold">{downPct.toFixed(0)}% DOWN ↓</span>
      </div>

      <div className="flex h-2 w-full overflow-hidden rounded-full bg-kai-surface">
        <motion.div
          className="h-full rounded-l-full bg-bull"
          style={{ boxShadow: '0 0 8px rgba(0,255,136,0.5)' }}
          animate={{ width: `${upPct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        <motion.div
          className="h-full rounded-r-full bg-bear"
          style={{ boxShadow: '0 0 8px rgba(255,59,59,0.5)' }}
          animate={{ width: `${downPct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}
