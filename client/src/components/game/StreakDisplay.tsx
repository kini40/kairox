import { useEffect, useRef } from 'react'

interface Props {
  streak: number
  prevStreak?: number
  onStreakLost?: () => void
}

export function StreakDisplay({ streak, prevStreak = 0, onStreakLost }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (prevStreak > 0 && streak === 0 && onStreakLost) {
      onStreakLost()
    }
  }, [streak, prevStreak, onStreakLost])

  const flames = Math.min(streak, 8)
  const isHot  = streak >= 3

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 16px',
      borderRadius: 10,
      background: streak > 0 ? 'rgba(251,191,36,0.07)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${streak > 0 ? 'rgba(251,191,36,0.2)' : 'var(--border)'}`,
    }}>
      <div style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>STREAK</div>

      <div style={{ display: 'flex', gap: 3 }}>
        {Array.from({ length: Math.max(flames, 1) }).map((_, i) => (
          <span
            key={i}
            style={{
              fontSize: 16,
              filter: i < flames ? (isHot ? 'drop-shadow(0 0 6px #FBBF24)' : 'none') : 'grayscale(1) opacity(0.2)',
              animation: streak > 0 && i === flames - 1 ? 'heroFloat 1.5s ease-in-out infinite' : 'none',
              animationDelay: `${i * 0.1}s`,
            }}
          >
            🔥
          </span>
        ))}
      </div>

      <div style={{
        fontSize: 22, fontWeight: 800,
        color: streak >= 5 ? 'var(--amber)'
             : streak >= 3 ? 'var(--gold)'
             : streak > 0  ? 'var(--text-primary)'
             : 'var(--text-dim)',
        textShadow: streak >= 3 ? '0 0 16px rgba(251,191,36,0.5)' : 'none',
        fontVariantNumeric: 'tabular-nums',
        minWidth: 28, textAlign: 'right',
      }}>
        {streak}
      </div>

      {streak >= 5 && (
        <div style={{
          fontSize: 10, color: 'var(--amber)',
          letterSpacing: '0.1em', fontWeight: 700,
          animation: 'borderGlow 2s ease-in-out infinite',
          border: '1px solid rgba(251,191,36,0.3)',
          borderRadius: 4, padding: '2px 6px',
        }}>
          ON FIRE
        </div>
      )}
    </div>
  )
}
