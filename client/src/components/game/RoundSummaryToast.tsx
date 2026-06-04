import { useSocialStore } from '../../store/socialStore'

export function RoundSummaryToast() {
  const { roundSummary, showRoundSummary, dismissRoundSummary } = useSocialStore()

  if (!showRoundSummary || !roundSummary) return null

  const { topWinners, biggestLoser } = roundSummary

  return (
    <div style={{
      position: 'fixed',
      bottom: 80,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 150,
      width: '100%',
      maxWidth: 440,
      padding: '0 16px',
      animation: 'slideUp 0.4s cubic-bezier(0.16,1,0.3,1)',
      pointerEvents: 'none',
    }}>
      <div style={{
        background: 'rgba(13,15,26,0.97)',
        border: '1px solid rgba(226,185,111,0.2)',
        borderRadius: 12,
        padding: '14px 18px',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{
          fontSize: 10, fontWeight: 800, letterSpacing: '0.18em',
          color: 'var(--text-secondary)', marginBottom: 10,
          display: 'flex', justifyContent: 'space-between',
        }}>
          <span>ROUND RESULTS</span>
          <span style={{ color: 'var(--text-dim)', fontWeight: 400, letterSpacing: 0 }}>
            Auto-close in 5s
          </span>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {/* Top winners */}
          {topWinners.length > 0 && (
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 6 }}>
                TOP WINNERS
              </div>
              {topWinners.slice(0, 3).map((w, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 0',
                  borderBottom: i < topWinners.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}>
                  <span style={{ fontSize: 12 }}>
                    {i === 0 ? '👑' : i === 1 ? '🥈' : '🥉'}
                  </span>
                  <span style={{
                    fontSize: 12, fontWeight: 600,
                    color: 'var(--text-primary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    maxWidth: 90,
                  }}>
                    {w.username}
                  </span>
                  <span style={{
                    marginLeft: 'auto', fontSize: 12, fontWeight: 700,
                    color: 'var(--green)', fontVariantNumeric: 'tabular-nums',
                  }}>
                    +{w.payout.toFixed(1)}β
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Divider */}
          {topWinners.length > 0 && biggestLoser && (
            <div style={{
              width: 1,
              background: 'rgba(255,255,255,0.06)',
              alignSelf: 'stretch',
            }} />
          )}

          {/* Biggest loser */}
          {biggestLoser && (
            <div style={{ minWidth: 130 }}>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 6 }}>
                BIGGEST LOSS
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 10px', borderRadius: 7,
                background: 'rgba(248,113,113,0.06)',
                border: '1px solid rgba(248,113,113,0.15)',
              }}>
                <span style={{ fontSize: 16 }}>💀</span>
                <div>
                  <div style={{
                    fontSize: 12, fontWeight: 600, color: 'var(--text-primary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    maxWidth: 80,
                  }}>
                    {biggestLoser.username}
                  </div>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: 'var(--red)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    -{biggestLoser.lost.toFixed(1)}β
                  </div>
                </div>
              </div>
            </div>
          )}

          {topWinners.length === 0 && !biggestLoser && (
            <div style={{ color: 'var(--text-dim)', fontSize: 12, width: '100%', textAlign: 'center', padding: '8px 0' }}>
              No predictions this round
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
