import { useGameStore } from '../../store/gameStore'

const RANK_META: Record<string, { emoji: string; color: string; label: string }> = {
  BRONZE:  { emoji: '🥉', color: '#CD7F32', label: 'Bronze Trader'    },
  SILVER:  { emoji: '🥈', color: '#A8A9AD', label: 'Silver Hunter'    },
  GOLD:    { emoji: '🥇', color: '#E2B96F', label: 'Gold Shark'       },
  DIAMOND: { emoji: '💎', color: '#9BE8FF', label: 'Diamond Oracle'   },
  ORACLE:  { emoji: '👁️',  color: '#C084FC', label: 'Legendary Oracle' },
}

export function RankUpModal() {
  const { showRankUp, rank, dismissRankUp } = useGameStore()

  if (!showRankUp) return null

  const meta = RANK_META[rank] ?? RANK_META['BRONZE']

  return (
    <>
      <div onClick={dismissRankUp} style={{
        position: 'fixed', inset: 0, zIndex: 320,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
      }} />

      <div style={{
        position: 'fixed', left: '50%', top: '50%', zIndex: 321,
        transform: 'translate(-50%,-50%)',
        width: '100%', maxWidth: 380, padding: '0 16px',
        animation: 'winExplosion 0.7s cubic-bezier(0.34,1.56,0.64,1)',
        pointerEvents: 'none',
      }}>
        <div style={{
          background: `linear-gradient(135deg, ${meta.color}15, ${meta.color}05)`,
          border: `1px solid ${meta.color}50`,
          borderRadius: 16, padding: '36px 24px',
          textAlign: 'center',
          boxShadow: `0 0 80px ${meta.color}30, 0 8px 40px rgba(0,0,0,0.6)`,
          pointerEvents: 'auto',
        }}>
          {/* Confetti-style dots */}
          {Array.from({length: 12}).map((_,i) => (
            <div key={i} style={{
              position: 'absolute',
              width: 6, height: 6, borderRadius: '50%',
              background: i % 3 === 0 ? meta.color : i % 3 === 1 ? 'var(--green)' : 'var(--gold)',
              left: `${10 + (i * 7) % 80}%`,
              top: `${5 + (i * 11) % 30}%`,
              animation: `particleDrift ${1 + (i % 3) * 0.3}s ease-out forwards`,
              '--dx': `${(i % 2 === 0 ? 1 : -1) * (20 + i * 5)}px`,
              '--dy': `${-30 - i * 8}px`,
            } as React.CSSProperties} />
          ))}

          <div style={{ fontSize: 72, marginBottom: 16,
            animation: 'heroFloat 2s ease-in-out infinite',
          }}>
            {meta.emoji}
          </div>

          <div style={{
            fontSize: 13, letterSpacing: '0.2em', color: 'var(--text-secondary)',
            marginBottom: 8, textTransform: 'uppercase',
          }}>
            Rank Up!
          </div>

          <div style={{
            fontFamily: "'Syne',sans-serif", fontWeight: 800,
            fontSize: 32, letterSpacing: '0.08em',
            color: meta.color,
            textShadow: `0 0 32px ${meta.color}60`,
            marginBottom: 8,
          }}>
            {meta.label.toUpperCase()}
          </div>

          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 28, lineHeight: 1.6 }}>
            You've reached a new rank.<br/>
            Keep predicting to climb higher!
          </div>

          <button
            onClick={dismissRankUp}
            style={{
              width: '100%', padding: '13px',
              borderRadius: 8, border: 'none', cursor: 'pointer',
              background: `linear-gradient(135deg, ${meta.color}80, ${meta.color})`,
              color: '#0D0F1A',
              fontSize: 14, fontWeight: 800, fontFamily: 'Inter',
              letterSpacing: '0.06em',
            }}
          >
            CLAIM YOUR RANK
          </button>
        </div>
      </div>
    </>
  )
}
