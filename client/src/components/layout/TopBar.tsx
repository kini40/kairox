import { Link, useLocation } from 'react-router-dom'
import { Wallet, ExternalLink } from 'lucide-react'
import { KairoxWordmark } from '../ui/KairoxLogo'

interface Props {
  mode: 'BETA' | 'LIVE'
  connected: boolean
  address?: string | null
  solBalance?: number
  betaBalance?: number
  onConnect: () => void
  onDisconnect: () => void
}

const NAV = [
  { to: '/game', label: 'Arena' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/profile', label: 'Profile' },
]

export function TopBar({ mode, connected, address, solBalance = 0, betaBalance = 0, onConnect, onDisconnect }: Props) {
  const loc = useLocation()

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(13,15,26,0.92)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', height: 60,
    }}>
      {/* Logo */}
      <Link to="/" style={{ textDecoration: 'none' }}>
        <KairoxWordmark />
      </Link>

      {/* Nav */}
      <nav style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {NAV.map(({ to, label }) => {
          const active = loc.pathname.startsWith(to)
          return (
            <Link key={to} to={to} style={{
              padding: '7px 14px',
              borderRadius: 8,
              fontSize: 13, fontWeight: 600,
              color: active ? 'var(--gold)' : 'var(--text-secondary)',
              textDecoration: 'none',
              background: active ? 'var(--gold-dim)' : 'transparent',
              border: `1px solid ${active ? 'var(--border-gold)' : 'transparent'}`,
              transition: 'all 0.15s',
            }}>
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Right: mode + wallet */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Mode badge */}
        <div style={{
          padding: '4px 10px', borderRadius: 6,
          fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
          background: mode === 'BETA' ? 'rgba(251,191,36,0.1)' : 'rgba(74,222,128,0.1)',
          border: `1px solid ${mode === 'BETA' ? 'rgba(251,191,36,0.3)' : 'rgba(74,222,128,0.3)'}`,
          color: mode === 'BETA' ? 'var(--amber)' : 'var(--green)',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%',
            background: mode === 'BETA' ? 'var(--amber)' : 'var(--green)',
            animation: 'pulseGold 2s infinite',
            display: 'inline-block',
          }} />
          {mode}
        </div>

        {/* Balance */}
        {mode === 'BETA' && (
          <div style={{
            padding: '5px 12px', borderRadius: 8,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            fontSize: 13, fontWeight: 600, color: 'var(--gold)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {betaBalance.toLocaleString()}β
          </div>
        )}

        {/* Wallet button */}
        {connected && address ? (
          <button
            onClick={onDisconnect}
            className="btn btn-outline-gold"
            style={{ fontSize: 12, padding: '7px 14px', gap: 6 }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
            {address.slice(0, 4)}…{address.slice(-4)}
            {mode === 'LIVE' && <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{solBalance.toFixed(2)} SOL</span>}
          </button>
        ) : (
          <button className="btn btn-gold" style={{ fontSize: 12, padding: '7px 14px' }} onClick={onConnect}>
            <Wallet size={13} />
            Connect Wallet
          </button>
        )}
      </div>
    </header>
  )
}
