// ─────────────────────────────────────────────────────────────
//  KAIROX – Oracle Rank SVG Badges
// ─────────────────────────────────────────────────────────────

interface BadgeProps { size?: number; className?: string }

export function BronzeBadge({ size = 28 }: BadgeProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 2L4 7V15C4 20.5 8.5 25.5 14 27C19.5 25.5 24 20.5 24 15V7L14 2Z"
        fill="#3D1F0A" stroke="#CD7F32" strokeWidth="1.2"/>
      <path d="M14 4.5L6 9V15C6 19.5 9.5 23.5 14 25C18.5 23.5 22 19.5 22 15V9L14 4.5Z"
        fill="#5C2E10" stroke="#CD7F3240" strokeWidth="0.5"/>
      <text x="14" y="18" textAnchor="middle" fill="#CD7F32" fontSize="11"
        fontFamily="Inter,sans-serif" fontWeight="800">B</text>
    </svg>
  )
}

export function SilverBadge({ size = 28 }: BadgeProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sShine" x1="4" y1="4" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E8E8E8"/>
          <stop offset="40%" stopColor="#C0C0C0"/>
          <stop offset="70%" stopColor="#F5F5F5"/>
          <stop offset="100%" stopColor="#A0A0A0"/>
        </linearGradient>
      </defs>
      <path d="M14 2L4 7V15C4 20.5 8.5 25.5 14 27C19.5 25.5 24 20.5 24 15V7L14 2Z"
        fill="#1A1A22" stroke="url(#sShine)" strokeWidth="1.5"/>
      <path d="M14 4.5L6 9V15C6 19.5 9.5 23.5 14 25C18.5 23.5 22 19.5 22 15V9L14 4.5Z"
        fill="#252535" stroke="#C0C0C030" strokeWidth="0.5"/>
      {/* Shine effect */}
      <path d="M10 7L12 13" stroke="white" strokeWidth="1.5" strokeOpacity="0.4" strokeLinecap="round"/>
      <text x="14" y="18" textAnchor="middle" fill="#D8D8D8" fontSize="11"
        fontFamily="Inter,sans-serif" fontWeight="800">S</text>
    </svg>
  )
}

export function GoldBadge({ size = 28 }: BadgeProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gGold" x1="4" y1="2" x2="24" y2="27" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F0CE8A"/>
          <stop offset="50%" stopColor="#E2B96F"/>
          <stop offset="100%" stopColor="#C9A35A"/>
        </linearGradient>
      </defs>
      <path d="M14 2L4 7V15C4 20.5 8.5 25.5 14 27C19.5 25.5 24 20.5 24 15V7L14 2Z"
        fill="#1A150A" stroke="url(#gGold)" strokeWidth="1.5"/>
      <path d="M14 4.5L6 9V15C6 19.5 9.5 23.5 14 25C18.5 23.5 22 19.5 22 15V9L14 4.5Z"
        fill="#241C0D"/>
      {/* Star */}
      <path d="M14 8.5L15.2 11.8H18.7L15.9 13.9L17.1 17.2L14 15L10.9 17.2L12.1 13.9L9.3 11.8H12.8L14 8.5Z"
        fill="#E2B96F" fillOpacity="0.9"/>
    </svg>
  )
}

export function DiamondBadge({ size = 28 }: BadgeProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="dGem" x1="4" y1="4" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#9BE8FF"/>
          <stop offset="50%" stopColor="#5BC8FF"/>
          <stop offset="100%" stopColor="#2BA0D8"/>
        </linearGradient>
      </defs>
      {/* Diamond shape */}
      <path d="M14 3L24 11L14 25L4 11L14 3Z"
        fill="#091520" stroke="url(#dGem)" strokeWidth="1.5"/>
      <path d="M14 6L21 12L14 22L7 12L14 6Z" fill="#0E2030"/>
      {/* Facets */}
      <path d="M14 6L21 12H7L14 6Z" fill="#9BE8FF" fillOpacity="0.15"/>
      <path d="M14 22L7 12H21L14 22Z" fill="#5BC8FF" fillOpacity="0.1"/>
      <path d="M14 6L14 22" stroke="#9BE8FF" strokeWidth="0.5" strokeOpacity="0.4"/>
      {/* Sparkle */}
      <path d="M20 5L20.5 6.5L22 7L20.5 7.5L20 9L19.5 7.5L18 7L19.5 6.5L20 5Z"
        fill="#9BE8FF" fillOpacity="0.9"/>
      <path d="M6 9L6.3 10L7.3 10.3L6.3 10.6L6 11.5L5.7 10.6L4.7 10.3L5.7 10L6 9Z"
        fill="#9BE8FF" fillOpacity="0.7"/>
    </svg>
  )
}

export function LegendaryBadge({ size = 32 }: BadgeProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 0 6px rgba(192,132,252,0.8))' }}>
      <defs>
        <linearGradient id="lGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#C084FC"/>
          <stop offset="40%" stopColor="#E2B96F"/>
          <stop offset="70%" stopColor="#C084FC"/>
          <stop offset="100%" stopColor="#818CF8"/>
        </linearGradient>
        <linearGradient id="lInner" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1A0A28"/>
          <stop offset="100%" stopColor="#120820"/>
        </linearGradient>
        <radialGradient id="lGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#C084FC" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>
      </defs>
      {/* Glow bg */}
      <circle cx="16" cy="16" r="14" fill="url(#lGlow)"/>
      {/* Shield */}
      <path d="M16 2L4 8V17C4 22.8 9.3 27.8 16 29.5C22.7 27.8 28 22.8 28 17V8L16 2Z"
        fill="url(#lInner)" stroke="url(#lGrad)" strokeWidth="1.8"/>
      {/* Inner shield */}
      <path d="M16 5L7 10V17C7 21.5 11 25.5 16 27.2C21 25.5 25 21.5 25 17V10L16 5Z"
        fill="#18082A" stroke="#C084FC40" strokeWidth="0.5"/>
      {/* Eye of Oracle */}
      <ellipse cx="16" cy="15" rx="5" ry="4" stroke="#C084FC" strokeWidth="1.2" fill="none"/>
      <circle cx="16" cy="15" r="2.2" fill="#C084FC" fillOpacity="0.8"/>
      <circle cx="16" cy="15" r="1" fill="white" fillOpacity="0.9"/>
      {/* Sparkles */}
      <path d="M9 8.5L9.4 9.8L10.7 10.2L9.4 10.6L9 11.9L8.6 10.6L7.3 10.2L8.6 9.8L9 8.5Z"
        fill="#E2B96F" fillOpacity="0.9"/>
      <path d="M23 8.5L23.4 9.8L24.7 10.2L23.4 10.6L23 11.9L22.6 10.6L21.3 10.2L22.6 9.8L23 8.5Z"
        fill="#C084FC" fillOpacity="0.9"/>
      <path d="M16 20.5L16.3 21.4L17.2 21.7L16.3 22L16 22.9L15.7 22L14.8 21.7L15.7 21.4L16 20.5Z"
        fill="#E2B96F" fillOpacity="0.8"/>
      {/* Animated pulsing ring - done via CSS on parent */}
      <circle cx="16" cy="16" r="13.5" stroke="url(#lGrad)" strokeWidth="0.5" strokeOpacity="0.5"
        strokeDasharray="4 2"/>
    </svg>
  )
}

// ─── Lookup helper ────────────────────────────────────────────

type Rank = 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND' | 'ORACLE'

export function OracleBadge({ rank, size = 24 }: { rank: string; size?: number }) {
  const r = (rank?.toUpperCase() ?? 'BRONZE') as Rank
  switch (r) {
    case 'SILVER':  return <SilverBadge   size={size} />
    case 'GOLD':    return <GoldBadge     size={size} />
    case 'DIAMOND': return <DiamondBadge  size={size} />
    case 'ORACLE':  return <LegendaryBadge size={size} />
    default:        return <BronzeBadge   size={size} />
  }
}

// ─── Rank label text ─────────────────────────────────────────

export const RANK_LABELS: Record<string, string> = {
  BRONZE:  'Bronze Oracle',
  SILVER:  'Silver Oracle',
  GOLD:    'Gold Oracle',
  DIAMOND: 'Diamond Oracle',
  ORACLE:  'Legendary Oracle',
}

export const RANK_COLORS: Record<string, string> = {
  BRONZE:  '#CD7F32',
  SILVER:  '#C0C0C0',
  GOLD:    '#E2B96F',
  DIAMOND: '#9BE8FF',
  ORACLE:  '#C084FC',
}
