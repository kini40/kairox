import { useRef, useEffect } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { useSocialStore, type FeedEntry } from '../../store/socialStore'
import { formatRelativeTime } from '../../utils/helpers'

function FeedRow({ entry }: { entry: FeedEntry }) {
  const isUp      = entry.direction === 'UP'
  const isGhost   = entry.isGhost
  const isWin     = entry.outcome === 'WIN'
  const isLoss    = entry.outcome === 'LOSS'
  const settled   = entry.outcome !== null
  const initials  = isGhost ? '??' : entry.username.slice(0, 2).toUpperCase()
  const rankColor = entry.isWhale ? 'var(--gold)' : isUp ? 'var(--green)' : 'var(--red)'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '7px 10px',
      borderRadius: 8,
      background: isWin  ? 'rgba(74,222,128,0.08)'
                : isLoss ? 'rgba(248,113,113,0.06)'
                : 'rgba(255,255,255,0.02)',
      border: `1px solid ${
        isWin  ? 'rgba(74,222,128,0.2)'
               : isLoss ? 'rgba(248,113,113,0.15)'
               : 'transparent'}`,
      transition: 'background 0.5s ease, border-color 0.5s ease',
      animation: entry.outcome === null ? 'slideInRight 0.25s ease-out' : 'none',
    }}>
      {/* Avatar */}
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: isGhost ? 'rgba(192,132,252,0.15)' : `${rankColor}18`,
        border: `1px solid ${isGhost ? '#C084FC40' : `${rankColor}40`}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 800,
        color: isGhost ? '#C084FC' : rankColor,
      }}>
        {isGhost ? '👻' : initials}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, fontWeight: 600,
          color: 'var(--text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          {entry.isWhale && <span>🐋</span>}
          <span style={{ color: isGhost ? '#C084FC80' : 'var(--text-secondary)' }}>
            {isGhost ? '???' : entry.username}
          </span>
          <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>goes</span>
          <span style={{ color: isUp ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
            {isGhost ? (
              <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>secret</span>
            ) : (
              <>
                {isUp ? <TrendingUp size={11} style={{ display: 'inline', verticalAlign: 'middle' }}/> 
                       : <TrendingDown size={11} style={{ display: 'inline', verticalAlign: 'middle' }}/>}
                {' '}{isGhost ? '' : entry.direction}
              </>
            )}
          </span>
          {entry.streak >= 3 && !isGhost && <span>🔥</span>}
        </div>

        <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>
          {isGhost ? 'secret prediction' : `${entry.wager}${entry.mode === 'BETA' ? 'β' : ' SOL'}`}
          {' · '}{formatRelativeTime(entry.timestamp)}
          {settled && (
            <span style={{
              marginLeft: 4, fontWeight: 700,
              color: isWin ? 'var(--green)' : isLoss ? 'var(--red)' : 'var(--text-secondary)',
            }}>
              {isWin ? `+${entry.payout.toFixed(1)}` : isLoss ? '✗' : '~'}
            </span>
          )}
        </div>
      </div>

      {/* Direction dot */}
      {!isGhost && (
        <div style={{
          width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
          background: isUp ? 'var(--green)' : 'var(--red)',
          boxShadow: `0 0 4px ${isUp ? 'var(--green)' : 'var(--red)'}`,
        }} />
      )}
    </div>
  )
}

export function LiveFeed() {
  const { feedEntries } = useSocialStore()
  const containerRef    = useRef<HTMLDivElement>(null)

  // Auto-scroll to top when new entries arrive
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0
    }
  }, [feedEntries.length])

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10,
        fontSize: 11, letterSpacing: '0.12em', color: 'var(--text-secondary)',
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--green)', boxShadow: '0 0 6px var(--green)',
          animation: 'pulseGold 2s ease-in-out infinite',
        }} />
        LIVE PREDICTIONS
        <span style={{
          marginLeft: 'auto', fontSize: 10, color: 'var(--text-dim)',
          background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 4,
        }}>
          {feedEntries.length}
        </span>
      </div>

      <div
        ref={containerRef}
        style={{
          display: 'flex', flexDirection: 'column', gap: 4,
          maxHeight: 340, overflowY: 'auto', overflowX: 'hidden',
        }}
      >
        {feedEntries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-dim)', fontSize: 13 }}>
            Waiting for predictions…
          </div>
        ) : (
          feedEntries.map(entry => (
            <FeedRow key={entry.id} entry={entry} />
          ))
        )}
      </div>
    </div>
  )
}
