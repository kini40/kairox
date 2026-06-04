import { RankBadge, type RankTier } from '../ui/RankBadge'

interface Props {
  xp: number
  rank: RankTier
  nextRankXp: number
  currentRankXp: number
}

export function XPBar({ xp, rank, nextRankXp, currentRankXp }: Props) {
  const range    = nextRankXp - currentRankXp
  const progress = range > 0 ? Math.min(1, (xp - currentRankXp) / range) : 1
  const pct      = Math.floor(progress * 100)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <RankBadge rank={rank} size="sm" />

      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            {xp.toLocaleString()} XP
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
            {nextRankXp.toLocaleString()} →
          </span>
        </div>
        <div style={{
          height: 4, background: 'rgba(255,255,255,0.06)',
          borderRadius: 2, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #C9A35A, #E2B96F)',
            borderRadius: 2,
            boxShadow: '0 0 6px rgba(226,185,111,0.5)',
            transition: 'width 1s ease',
          }} />
        </div>
      </div>
    </div>
  )
}
