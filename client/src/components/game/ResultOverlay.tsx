import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, X } from 'lucide-react'
import { useGameStore } from '@store/gameStore'
import { cn, formatCredits } from '@utils/helpers'

export function ResultOverlay() {
  const { showResult, lastResult, dismissResult, betaCredits } = useGameStore()

  return (
    <AnimatePresence>
      {showResult && lastResult && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismissResult}
            className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm"
          />

          {/* Result card */}
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.5, rotate: -8 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -40 }}
            transition={{ type: 'spring', stiffness: 350, damping: 22 }}
            className="fixed left-1/2 top-1/2 z-[151] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 px-4"
          >
            <div className={cn(
              'kai-card relative overflow-hidden p-8 text-center',
              lastResult.outcome === 'WIN'  && 'border-bull/40',
              lastResult.outcome === 'LOSS' && 'border-bear/40',
              lastResult.outcome === 'PUSH' && 'border-neon-cyan/30',
            )}>
              {/* Glow bg */}
              <div className={cn(
                'pointer-events-none absolute inset-0 opacity-10',
                lastResult.outcome === 'WIN'  && 'bg-bull',
                lastResult.outcome === 'LOSS' && 'bg-bear',
                lastResult.outcome === 'PUSH' && 'bg-neon-cyan',
              )} />

              {/* Close */}
              <button
                onClick={dismissResult}
                className="absolute right-4 top-4 text-gray-500 hover:text-white"
              >
                <X size={16} />
              </button>

              {/* Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 20 }}
                className={cn(
                  'mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full',
                  lastResult.outcome === 'WIN'  && 'bg-bull/20  text-bull',
                  lastResult.outcome === 'LOSS' && 'bg-bear/20  text-bear',
                  lastResult.outcome === 'PUSH' && 'bg-neon-cyan/20 text-neon-cyan',
                )}
              >
                {lastResult.outcome === 'WIN'  && <TrendingUp  size={28} />}
                {lastResult.outcome === 'LOSS' && <TrendingDown size={28} />}
                {lastResult.outcome === 'PUSH' && <Minus size={28} />}
              </motion.div>

              {/* Outcome label */}
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className={cn(
                  'font-display text-4xl font-black',
                  lastResult.outcome === 'WIN'  && 'text-bull',
                  lastResult.outcome === 'LOSS' && 'text-bear',
                  lastResult.outcome === 'PUSH' && 'text-neon-cyan',
                )}
              >
                {lastResult.outcome === 'WIN'  && 'WIN!'}
                {lastResult.outcome === 'LOSS' && 'LOSS'}
                {lastResult.outcome === 'PUSH' && 'PUSH'}
              </motion.h2>

              {/* Credits change */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="mt-3 space-y-1"
              >
                <p className={cn(
                  'font-mono text-2xl font-bold',
                  lastResult.creditsChange > 0 && 'text-bull',
                  lastResult.creditsChange < 0 && 'text-bear',
                  lastResult.creditsChange === 0 && 'text-gray-400',
                )}>
                  {lastResult.creditsChange > 0 ? '+' : ''}
                  {lastResult.creditsChange.toFixed(1)}β
                </p>
                <p className="text-xs text-gray-500">
                  Price moved{' '}
                  <span className={cn(
                    'font-mono font-semibold',
                    lastResult.priceChange > 0 ? 'text-bull' : 'text-bear'
                  )}>
                    {lastResult.priceChange > 0 ? '+' : ''}${lastResult.priceChange.toFixed(2)}
                  </span>
                </p>
              </motion.div>

              {/* Balance */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="mt-4 rounded-kai border border-kai-border bg-kai-deep px-4 py-2"
              >
                <p className="text-[11px] text-gray-500">New Balance</p>
                <p className="font-mono text-lg font-semibold text-neon-amber">
                  {formatCredits(betaCredits)}β
                </p>
              </motion.div>

              {/* CTA */}
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                onClick={dismissResult}
                className="btn-neon-cyan mt-5 w-full"
              >
                {lastResult.outcome === 'WIN' ? 'Keep Going!' : 'Try Again'}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
