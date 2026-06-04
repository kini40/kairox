import type { GameMode } from '@store/gameStore'
import { cn } from '@utils/helpers'

interface ModeBadgeProps {
  mode: GameMode
  className?: string
}

export function ModeBadge({ mode, className }: ModeBadgeProps) {
  return (
    <div className={cn(
      'mode-badge',
      mode === 'BETA' ? 'mode-badge-beta' : 'mode-badge-live',
      className
    )}>
      <span className={cn(
        'h-1.5 w-1.5 rounded-full',
        mode === 'BETA' ? 'bg-neon-amber animate-pulse' : 'bg-neon-green animate-pulse'
      )} />
      {mode === 'BETA' ? 'BETA' : 'LIVE'}
    </div>
  )
}
