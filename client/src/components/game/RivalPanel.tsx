import { useSocialStore } from '../../store/socialStore'
import { OracleBadge, RANK_COLORS } from '../ui/OracleBadge'
import { Swords, Wifi, WifiOff } from 'lucide-react'
import { useGameStore } from '../../store/gameStore'

export function RivalPanel() {
  const { rival, rivalResult, showRivalBanner } = useSocialStore()
  const { streak } = useGameStore()

  if (!rival) return (
    <div style={{
      padding: '14px 16px', borderRadius: 10,
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid var(--border)',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 20, marginBottom: 6, opacity: 0.3 }}>⚔️</div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
        No rival assigned yet.<br/>Connect wallet to matchmake.
      </div>
    </div>
  )

  const xpGap = rival.xp - (useGameStore.getState().xp ?? 0)
  const rankColor = RANK_COLORS[rival.rank] ?? 'var(--text-secondary)'

  return (
    <div>
      {/* Rival card */}
      <div style={{
        padding: '14px 14px',
        borderRadius: 10,
        background: 'linear-gradient(135deg, rgba(248,113,113,0.06), rgba(248,113,113,0.03))',
        border: '1px solid rgba(248,113,113,0.2)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          marginBottom: 10, fontSize: 10,
          letterSpacing: '0.14em', color: 'var(--red)',
          fontWeight: 700,
        }}>
          <Swords size={11} /> YOUR RIVAL
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Avatar */}
          <div style={{
            width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
            background: `${rankColor}18`,
            border: `2px solid ${rankColor}50`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 800, color: rankColor,
            position: 'relative',
          }}>
            {rival.username.slice(0, 2).toUpperCase()}
            {/* Online indicator */}
            <div style={{
              position: 'absolute', bottom: -1, right: -1,
              width: 10, height: 10, borderRadius: '50%',
              background: rival.isOnline ? 'var(--green)' : '#4A5070',
              border: '2px solid var(--bg-card)',
              boxShadow: rival.isOnline ? '0 0 6px var(--green)' : 'none',
            }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3,
            }}>
              <span style={{
                fontSize: 13, fontWeight: 700, color: 'var(--text-primary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {rival.username}
              </span>
              <OracleBadge rank={rival.rank} size={16} />
            </div>

            <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
              <span style={{ color: 'var(--text-secondary)' }}>
                Streak: <span style={{
                  fontWeight: 700,
                  color: rival.streak >= 3 ? 'var(--amber)' : 'var(--text-primary)',
                }}>
                  {rival.streak > 0 ? `🔥 ${rival.streak}` : rival.streak}
                </span>
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>
                XP gap:{' '}
                <span style={{
                  fontWeight: 700,
                  color: xpGap > 0 ? 'var(--red)' : xpGap < 0 ? 'var(--green)' : 'var(--text-secondary)',
                }}>
                  {xpGap > 0 ? `+${xpGap}` : xpGap}
                </span>
              </span>
            </div>
          </div>

          {rival.isOnline
            ? <Wifi size={13} color="var(--green)" />
            : <WifiOff size={13} color="#4A5070" />
          }
        </div>

        {/* Session score */}
        {rivalResult && (
          <div style={{
            display: 'flex', gap: 8, marginTop: 10,
            padding: '7px 10px', borderRadius: 7,
            background: 'rgba(0,0,0,0.2)',
          }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--green)' }}>
                {rivalResult.myWins}
              </div>
              <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.1em' }}>YOU</div>
            </div>
            <div style={{ fontSize: 16, color: 'var(--text-dim)', alignSelf: 'center' }}>vs</div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--red)' }}>
                {rivalResult.rivalWins}
              </div>
              <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.1em' }}>RIVAL</div>
            </div>
          </div>
        )}
      </div>

      {/* Round result banner */}
      {showRivalBanner && rivalResult && (
        <div style={{
          marginTop: 8,
          padding: '9px 14px',
          borderRadius: 8,
          background: rivalResult.myWins > rivalResult.rivalWins
            ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
          border: `1px solid ${rivalResult.myWins > rivalResult.rivalWins
            ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
          fontSize: 12, fontWeight: 700, textAlign: 'center',
          color: rivalResult.myWins > rivalResult.rivalWins ? 'var(--green)' : 'var(--red)',
          animation: 'fadeIn 0.3s ease-out',
        }}>
          {rivalResult.myWins > rivalResult.rivalWins
            ? '✓ YOU BEAT YOUR RIVAL THIS ROUND'
            : rivalResult.rivalWins > rivalResult.myWins
            ? '✗ RIVAL LEADS THIS ROUND'
            : '~ TIED THIS ROUND'
          }
        </div>
      )}
    </div>
  )
}
