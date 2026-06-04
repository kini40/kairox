import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown, Zap, Ghost } from 'lucide-react'
import { useGameStore } from '@store/gameStore'
import { cn, formatRelativeTime } from '@utils/helpers'

export function PredictionHistory() {
  const { predictionHistory } = useGameStore()

  if (predictionHistory.length === 0) {
    return (
      <div className="kai-card flex flex-col items-center gap-2 p-8 text-center">
        <div className="text-3xl opacity-30">🎯</div>
        <p className="text-sm text-gray-500">No predictions yet</p>
        <p className="text-xs text-gray-600">Make your first prediction above</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500 px-1">
        Recent Predictions
      </h3>
      <div className="space-y-1.5">
        <AnimatePresence initial={false}>
          {predictionHistory.slice(0, 10).map((pred) => (
            <motion.div
              key={pred.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              layout
              className={cn(
                'kai-card flex items-center gap-3 px-3 py-2.5',
                pred.outcome === 'WIN'  && 'border-bull/20',
                pred.outcome === 'LOSS' && 'border-bear/20',
              )}
            >
              {/* Direction icon */}
              <div className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                pred.direction === 'UP' ? 'bg-bull/15 text-bull' : 'bg-bear/15 text-bear'
              )}>
                {pred.direction === 'UP'
                  ? <TrendingUp  size={13} />
                  : <TrendingDown size={13} />
                }
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    'text-xs font-semibold',
                    pred.direction === 'UP' ? 'text-bull' : 'text-bear'
                  )}>
                    {pred.direction}
                  </span>
                  {pred.isDegen && <Zap size={10} className="text-neon-amber" />}
                  {pred.isGhost && <Ghost size={10} className="text-neon-violet" />}
                </div>
                <p className="text-[10px] text-gray-500 font-mono">
                  ${pred.entryPrice.toFixed(2)}
                  {pred.resultPrice && ` → $${pred.resultPrice.toFixed(2)}`}
                </p>
              </div>

              {/* Credits */}
              <div className="text-right shrink-0">
                {pred.outcome ? (
                  <span className={cn(
                    'font-mono text-xs font-semibold',
                    pred.outcome === 'WIN'  && 'text-bull',
                    pred.outcome === 'LOSS' && 'text-bear',
                    pred.outcome === 'PUSH' && 'text-gray-400',
                  )}>
                    {pred.outcome === 'WIN'  && `+${pred.creditsWon.toFixed(1)}β`}
                    {pred.outcome === 'LOSS' && `-${pred.creditsWagered}β`}
                    {pred.outcome === 'PUSH' && `±0β`}
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-500 animate-pulse">Pending…</span>
                )}
                <p className="text-[10px] text-gray-600">
                  {formatRelativeTime(pred.timestamp)}
                </p>
              </div>

              {/* Outcome dot */}
              <div className={cn(
                'h-2 w-2 shrink-0 rounded-full',
                pred.outcome === 'WIN'  && 'bg-bull shadow-neon-green',
                pred.outcome === 'LOSS' && 'bg-bear shadow-neon-red',
                pred.outcome === 'PUSH' && 'bg-gray-500',
                !pred.outcome           && 'bg-neon-cyan animate-pulse',
              )} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
