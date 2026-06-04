import { useEffect } from 'react'
import { TrendingUp, TrendingDown, Minus, X, Zap, Ghost } from 'lucide-react'
import { useGameStore } from '../../store/gameStore'

export function ResultModal() {
  const { showResult, lastResult, dismissResult } = useGameStore()

  // Auto-dismiss after 6s
  useEffect(() => {
    if (!showResult) return
    const t = setTimeout(dismissResult, 6000)
    return () => clearTimeout(t)
  }, [showResult, dismissResult])

  if (!showResult || !lastResult) return null

  const { outcome, payout, multiplier, streakAfter, xpAwarded,
          isNearMiss, streakBroken, previousStreak, isDegen, isGhost,
          entryPrice, exitPrice, movePct } = lastResult

  const isWin  = outcome === 'WIN'
  const isDraw = outcome === 'DRAW'
  const isLoss = outcome === 'LOSS' || outcome === 'NEAR_MISS'
  const moveUp = exitPrice > entryPrice

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={dismissResult}
        style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', left: '50%', top: '50%', zIndex: 301,
        transform: 'translate(-50%,-50%)',
        width: '100%', maxWidth: 380, padding: '0 16px',
        animation: isWin
          ? 'winExplosion 0.6s cubic-bezier(0.34,1.56,0.64,1)'
          : 'fadeIn 0.3s ease-out',
      }}>
        <div style={{
          background: isWin  ? 'linear-gradient(135deg,rgba(226,185,111,0.12),rgba(226,185,111,0.06))'
                     : isDraw ? 'rgba(138,143,173,0.1)'
                     : 'rgba(248,113,113,0.08)',
          border: `1px solid ${isWin ? 'rgba(226,185,111,0.4)' : isDraw ? 'rgba(138,143,173,0.3)' : 'rgba(248,113,113,0.3)'}`,
          borderRadius: 16,
          padding: '28px 24px',
          boxShadow: isWin ? '0 0 60px rgba(226,185,111,0.2), 0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.5)',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Close */}
          <button onClick={dismissResult} style={{
            position: 'absolute', top: 12, right: 12,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-dim)', padding: 4,
          }}>
            <X size={16} />
          </button>

          {/* Shine effect for WIN */}
          {isWin && (
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'linear-gradient(135deg, rgba(226,185,111,0.08) 0%, transparent 60%)',
            }} />
          )}

          {/* Icon */}
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 64, height: 64, borderRadius: '50%',
              background: isWin  ? 'rgba(226,185,111,0.15)' : isDraw ? 'rgba(138,143,173,0.1)' : 'rgba(248,113,113,0.12)',
              border: `2px solid ${isWin ? 'rgba(226,185,111,0.4)' : isDraw ? 'rgba(138,143,173,0.3)' : 'rgba(248,113,113,0.3)'}`,
              marginBottom: 12,
              boxShadow: isWin ? '0 0 24px rgba(226,185,111,0.3)' : 'none',
            }}>
              <span style={{ fontSize: 28 }}>
                {isWin ? '🏆' : isDraw ? '🤝' : isNearMiss ? '😬' : '💀'}
              </span>
            </div>

            <div style={{
              fontSize: isWin ? 36 : 28,
              fontFamily: "'Syne',sans-serif",
              fontWeight: 800, letterSpacing: '0.06em',
              color: isWin ? 'var(--gold)' : isDraw ? 'var(--text-secondary)' : 'var(--red)',
              textShadow: isWin ? '0 0 20px rgba(226,185,111,0.5)' : 'none',
            }}>
              {isWin ? 'CORRECT!' : isDraw ? 'DRAW' : isNearMiss ? 'SO CLOSE!' : 'WRONG CALL'}
            </div>
          </div>

          {/* Price movement */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '10px 16px',
            background: 'rgba(0,0,0,0.2)', borderRadius: 8, marginBottom: 16,
          }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
              ${entryPrice.toFixed(2)}
            </span>
            <span style={{ color: 'var(--text-dim)' }}>→</span>
            <span style={{
              fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
              color: moveUp ? 'var(--green)' : 'var(--red)',
            }}>
              ${exitPrice.toFixed(2)}
            </span>
            <span style={{
              fontSize: 12,
              color: moveUp ? 'var(--green)' : 'var(--red)',
              background: moveUp ? 'var(--green-dim)' : 'var(--red-dim)',
              padding: '2px 6px', borderRadius: 4,
            }}>
              {moveUp ? '+' : ''}{movePct.toFixed(3)}%
            </span>
          </div>

          {/* Payout */}
          {isWin && (
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--green)', fontVariantNumeric: 'tabular-nums' }}>
                +{payout.toFixed(1)}β
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                {multiplier.toFixed(2)}× multiplier
                {isDegen && <span style={{ color: 'var(--amber)', marginLeft: 8 }}>⚡ DEGEN</span>}
                {isGhost && <span style={{ color: '#C084FC', marginLeft: 8 }}>👻 GHOST ×3</span>}
              </div>
            </div>
          )}

          {/* Stats row */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
            marginBottom: 16,
          }}>
            {[
              { label: 'Streak', value: streakAfter > 0 ? `🔥 ${streakAfter}` : `${streakAfter}`,
                color: streakAfter >= 3 ? 'var(--amber)' : 'var(--text-secondary)' },
              { label: 'XP', value: `+${xpAwarded}`, color: 'var(--gold)' },
              { label: 'Mode', value: isDegen ? '⚡ Degen' : isGhost ? '👻 Ghost' : 'Standard',
                color: isDegen ? 'var(--amber)' : isGhost ? '#C084FC' : 'var(--text-secondary)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                textAlign: 'center', padding: '8px 4px',
                background: 'rgba(0,0,0,0.2)', borderRadius: 8,
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color }}>{value}</div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Streak broken alert */}
          {streakBroken && previousStreak > 0 && (
            <div style={{
              padding: '8px 12px', borderRadius: 8,
              background: 'rgba(248,113,113,0.1)',
              border: '1px solid rgba(248,113,113,0.3)',
              textAlign: 'center', fontSize: 12, color: 'var(--red)',
              marginBottom: 12, fontWeight: 600,
            }}>
              💔 {previousStreak}-streak broken
            </div>
          )}

          {/* Near miss detail */}
          {isNearMiss && (
            <div style={{
              padding: '8px 12px', borderRadius: 8,
              background: 'rgba(251,191,36,0.08)',
              border: '1px solid rgba(251,191,36,0.2)',
              textAlign: 'center', fontSize: 12, color: 'var(--amber)',
              marginBottom: 12,
            }}>
              Price moved only {Math.abs(movePct).toFixed(3)}% against you
            </div>
          )}

          {/* CTA */}
          <button
            onClick={dismissResult}
            style={{
              width: '100%', padding: '12px',
              borderRadius: 8, border: 'none', cursor: 'pointer',
              background: isWin
                ? 'linear-gradient(135deg,#C9A35A,#E2B96F)'
                : 'rgba(255,255,255,0.08)',
              color: isWin ? '#0D0F1A' : 'var(--text-secondary)',
              fontSize: 14, fontWeight: 700, fontFamily: 'Inter',
            }}
          >
            {isWin ? 'Keep Winning!' : isDraw ? 'Next Round' : 'Try Again'}
          </button>
        </div>
      </div>
    </>
  )
}
