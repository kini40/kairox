import { motion } from 'framer-motion'
import { useRoundCountdown } from '@hooks/useCountdown'
import { useGameStore } from '@store/gameStore'
import { cn } from '@utils/helpers'

const RADIUS = 38
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function RoundTimer() {
  const { seconds, progress, isUrgent, isClosed } = useRoundCountdown()
  const { currentRound } = useGameStore()

  const strokeDash = CIRCUMFERENCE * (1 - progress)
  const status = currentRound?.status ?? 'WAITING'

  const color = isClosed
    ? '#6B7280'
    : isUrgent
    ? '#FF3B3B'
    : '#00F5FF'

  const label = (() => {
    if (status === 'WAITING')   return 'NEXT'
    if (status === 'OPEN')      return 'OPEN'
    if (status === 'CLOSED')    return 'CLOSED'
    if (status === 'SETTLING')  return 'SETTLING'
    if (status === 'SETTLED')   return 'SETTLED'
    return '—'
  })()

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-24 w-24">
        {/* Track */}
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 96 96">
          <circle
            cx="48" cy="48" r={RADIUS}
            fill="none"
            stroke="#1E1E35"
            strokeWidth="4"
          />
          <motion.circle
            cx="48" cy="48" r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDash}
            style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
            transition={{ duration: 0.5, ease: 'linear' }}
          />
        </svg>

        {/* Inner content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            key={seconds}
            initial={{ scale: isUrgent ? 1.2 : 1, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              'font-display text-2xl font-black tabular-nums leading-none',
              isUrgent ? 'text-bear' : isClosed ? 'text-gray-500' : 'text-white'
            )}
          >
            {isClosed ? '0' : seconds}
          </motion.span>
          <span className="text-[9px] font-mono font-semibold uppercase tracking-widest text-gray-500 mt-0.5">
            {isClosed ? label : 'SEC'}
          </span>
        </div>
      </div>

      {/* Status badge */}
      <div className={cn(
        'px-3 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest border',
        status === 'OPEN'     && 'text-neon-green  border-neon-green/30  bg-neon-green/10',
        status === 'CLOSED'   && 'text-neon-amber  border-neon-amber/30  bg-neon-amber/10',
        status === 'SETTLING' && 'text-neon-violet border-neon-violet/30 bg-neon-violet/10',
        status === 'SETTLED'  && 'text-gray-500    border-kai-border     bg-kai-surface',
        status === 'WAITING'  && 'text-gray-500    border-kai-border     bg-kai-surface',
      )}>
        {label}
      </div>
    </div>
  )
}
