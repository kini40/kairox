import { Flame, TrendingUp, Target, Coins } from 'lucide-react'
import { useGameStore } from '@store/gameStore'
import { cn, formatCredits, calculateWinRate } from '@utils/helpers'

export function StatsBar() {
  const { sessionStats, betaCredits, mode } = useGameStore()
  const { wins, losses, streak, totalWagered } = sessionStats
  const total = wins + losses
  const winRate = calculateWinRate(wins, total)

  const stats = [
    {
      icon: TrendingUp,
      label: 'Win Rate',
      value: total > 0 ? winRate : '—',
      color: 'text-bull',
    },
    {
      icon: Target,
      label: 'W / L',
      value: `${wins} / ${losses}`,
      color: 'text-neon-cyan',
    },
    {
      icon: Flame,
      label: 'Streak',
      value: streak > 0 ? `🔥 ${streak}` : `${streak}`,
      color: streak >= 3 ? 'text-neon-amber' : streak > 0 ? 'text-bull' : 'text-gray-500',
    },
    {
      icon: Coins,
      label: mode === 'BETA' ? 'Credits' : 'Balance',
      value: mode === 'BETA' ? `${formatCredits(betaCredits)}β` : `${betaCredits.toFixed(3)} SOL`,
      color: 'text-neon-amber',
    },
  ]

  return (
    <div className="grid grid-cols-4 gap-2">
      {stats.map(({ icon: Icon, label, value, color }) => (
        <div
          key={label}
          className="kai-card flex flex-col items-center gap-1 px-2 py-3 text-center"
        >
          <Icon size={13} className={cn('opacity-60', color)} />
          <span className={cn('font-mono text-sm font-bold', color)}>{value}</span>
          <span className="text-[10px] text-gray-600 uppercase tracking-wider">{label}</span>
        </div>
      ))}
    </div>
  )
}
