import { cn } from '../../utils/helpers'

interface LogoProps {
  size?: number
  className?: string
  animate?: boolean
}

export function KairoxLogo({ size = 48, className, animate = true }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(animate && 'logo-glow', className)}
      style={animate ? { animation: 'logoGlow 3s ease-in-out infinite' } : {}}
    >
      {/* Hexagon */}
      <polygon
        points="24,2 43,13 43,35 24,46 5,35 5,13"
        fill="#0D0F1A"
        stroke="#E2B96F"
        strokeWidth="1.5"
      />
      {/* Inner hex ring */}
      <polygon
        points="24,7 39,15.5 39,32.5 24,41 9,32.5 9,15.5"
        fill="none"
        stroke="rgba(226,185,111,0.25)"
        strokeWidth="0.75"
      />
      {/* Lightning bolt */}
      <path
        d="M27 10L16 26H23L21 38L32 22H25L27 10Z"
        fill="#E2B96F"
        style={{ filter: 'drop-shadow(0 0 4px rgba(226,185,111,0.8))' }}
      />
    </svg>
  )
}

export function KairoxWordmark({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <KairoxLogo size={36} />
      <span style={{
        fontFamily: "'Syne', sans-serif",
        fontWeight: 800,
        fontSize: 22,
        letterSpacing: '0.12em',
        color: '#E2B96F',
        textShadow: '0 0 20px rgba(226,185,111,0.35)',
      }}>
        KAIROX
      </span>
    </div>
  )
}
