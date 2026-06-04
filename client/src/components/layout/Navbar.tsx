import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BarChart2, Trophy, User, Zap } from 'lucide-react'
import { WalletButton } from '@components/wallet/WalletButton'
import { ModeBadge } from '@components/ui/ModeBadge'
import { useGameStore } from '@store/gameStore'
import { useWalletAuth } from '@hooks/useWalletAuth'
import { cn, formatCredits } from '@utils/helpers'

const NAV_LINKS = [
  { to: '/game',        label: 'Arena',       icon: Zap },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/profile',     label: 'Profile',     icon: User },
]

export function Navbar() {
  const location  = useLocation()
  const { mode, betaCredits } = useGameStore()
  const { connected, shortAddress } = useWalletAuth()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-kai-border bg-kai-void/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 select-none">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-neon-violet to-neon-cyan">
            <span className="font-display text-xs font-black text-black">KX</span>
          </div>
          <span className="font-display text-lg font-black tracking-widest text-white">
            KAIROX
          </span>
        </Link>

        {/* Nav links — desktop */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ to, label, icon: Icon }) => {
            const active = location.pathname.startsWith(to)
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex items-center gap-2 rounded-kai px-4 py-2 text-sm font-medium transition-all duration-200',
                  active
                    ? 'bg-kai-surface text-neon-cyan'
                    : 'text-gray-400 hover:text-white hover:bg-kai-surface/50'
                )}
              >
                <Icon size={15} />
                {label}
                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute bottom-0 left-0 right-0 h-px bg-neon-cyan"
                  />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Mode badge */}
          <ModeBadge mode={mode} />

          {/* Beta credits */}
          {mode === 'BETA' && (
            <div className="hidden sm:flex items-center gap-1.5 rounded-kai border border-kai-border bg-kai-surface px-3 py-1.5">
              <BarChart2 size={13} className="text-neon-amber" />
              <span className="font-mono text-xs font-semibold text-neon-amber">
                {formatCredits(betaCredits)} β
              </span>
            </div>
          )}

          <WalletButton />
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t border-kai-border bg-kai-void/95 backdrop-blur-xl">
        {NAV_LINKS.map(({ to, label, icon: Icon }) => {
          const active = location.pathname.startsWith(to)
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors',
                active ? 'text-neon-cyan' : 'text-gray-500'
              )}
            >
              <Icon size={18} />
              <span className="font-medium">{label}</span>
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
