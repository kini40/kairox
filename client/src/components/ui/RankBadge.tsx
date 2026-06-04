import { cn } from '../../utils/helpers'

export type RankTier = 'ROOKIE' | 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND' | 'ORACLE'

const RANK_META: Record<RankTier, { label: string; emoji: string; color: string; bg: string; glow: string }> = {
  ROOKIE:  { label: 'Rookie',          emoji: '🔰', color: '#8A8FAD', bg: 'rgba(138,143,173,0.1)',  glow: 'rgba(138,143,173,0.2)' },
  BRONZE:  { label: 'Bronze Trader',   emoji: '🥉', color: '#CD7F32', bg: 'rgba(205,127,50,0.12)',  glow: 'rgba(205,127,50,0.25)' },
  SILVER:  { label: 'Silver Hunter',   emoji: '🥈', color: '#A8A9AD', bg: 'rgba(168,169,173,0.12)', glow: 'rgba(168,169,173,0.2)' },
  GOLD:    { label: 'Gold Shark',       emoji: '🥇', color: '#E2B96F', bg: 'rgba(226,185,111,0.12)', glow: 'rgba(226,185,111,0.3)' },
  DIAMOND: { label: 'Diamond Oracle',  emoji: '💎', color: '#9BE8FF', bg: 'rgba(155,232,255,0.12)', glow: 'rgba(155,232,255,0.25)' },
  ORACLE:  { label: 'Legendary Oracle',emoji: '👁️',  color: '#C084FC', bg: 'rgba(192,132,252,0.12)', glow: 'rgba(192,132,252,0.3)' },
}

interface RankBadgeProps {
  rank: RankTier
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

export function RankBadge({ rank, size = 'md', showLabel = true }: RankBadgeProps) {
  const meta = RANK_META[rank]
  const sizes = {
    sm: { pad: '3px 8px', fontSize: 11, emoji: 14 },
    md: { pad: '5px 12px', fontSize: 12, emoji: 16 },
    lg: { pad: '8px 16px', fontSize: 14, emoji: 20 },
  }
  const s = sizes[size]

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: s.pad,
      background: meta.bg,
      border: `1px solid ${meta.color}40`,
      borderRadius: 6,
      color: meta.color,
      fontWeight: 700,
      fontSize: s.fontSize,
      letterSpacing: '0.05em',
      boxShadow: `0 0 12px ${meta.glow}`,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: s.emoji, lineHeight: 1 }}>{meta.emoji}</span>
      {showLabel && <span>{meta.label}</span>}
    </div>
  )
}

export function RankIcon({ rank, size = 32 }: { rank: RankTier; size?: number }) {
  const meta = RANK_META[rank]
  return (
    <div style={{
      width: size, height: size,
      borderRadius: '50%',
      background: meta.bg,
      border: `2px solid ${meta.color}60`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.45,
      boxShadow: `0 0 16px ${meta.glow}`,
    }}>
      {meta.emoji}
    </div>
  )
}
