import { useGameStore } from '../../store/gameStore'

export function DailyLoginBanner() {
  const { loginStreak, dismissLoginStreak } = useGameStore()

  if (!loginStreak || loginStreak.xpAwarded === 0) return null

  const { streak, xpAwarded, isDay7, isReset, dayMultiplier } = loginStreak

  return (
    <div style={{
      position: 'fixed', top: 70, left: '50%', zIndex: 100,
      transform: 'translateX(-50%)',
      animation: 'slideDown 0.4s cubic-bezier(0.16,1,0.3,1)',
      width: '100%', maxWidth: 420, padding: '0 16px',
      pointerEvents: 'none',
    }}>
      <div style={{
        background: isDay7
          ? 'linear-gradient(135deg,rgba(226,185,111,0.18),rgba(226,185,111,0.1))'
          : 'rgba(28,32,64,0.97)',
        border: `1px solid ${isDay7 ? 'rgba(226,185,111,0.5)' : 'rgba(226,185,111,0.2)'}`,
        borderRadius: 12, padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: 14,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(12px)',
        pointerEvents: 'auto',
      }}>
        <div style={{ fontSize: 36, flexShrink: 0 }}>
          {isDay7 ? '🌟' : isReset ? '🔄' : '🔥'}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 700, fontSize: 14,
            color: isDay7 ? 'var(--gold)' : 'var(--text-primary)',
          }}>
            {isDay7
              ? `Day 7 Bonus! 10× Multiplier Active`
              : isReset
                ? `Streak Reset — Day 1`
                : `Day ${streak} Login Streak!`
            }
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            +{xpAwarded} XP awarded
            {isDay7 && ` — predictions earn ${dayMultiplier}× XP today`}
            {isReset && ' — log in daily to build your streak'}
          </div>
        </div>

        {/* Streak dots */}
        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: i < streak % 7
                ? (isDay7 ? 'var(--gold)' : 'var(--green)')
                : 'rgba(255,255,255,0.1)',
              boxShadow: i < streak % 7 ? '0 0 6px var(--green)' : 'none',
            }} />
          ))}
        </div>

        <button
          onClick={dismissLoginStreak}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-dim)', fontSize: 18, lineHeight: 1,
            flexShrink: 0, padding: '0 4px',
          }}
        >
          ×
        </button>
      </div>
    </div>
  )
}
