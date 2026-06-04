import { useEffect, useRef } from 'react'

interface Props {
  seconds: number
  duration: number
}

export function CountdownTimer({ seconds, duration }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isUrgent = seconds <= 10 && seconds > 0
  const isDone   = seconds === 0
  const progress = duration > 0 ? seconds / duration : 0

  const size    = 120
  const stroke  = 8
  const radius  = (size - stroke) / 2
  const circ    = 2 * Math.PI * radius
  const offset  = circ * (1 - progress)

  const color = isDone ? '#4A5070'
    : isUrgent ? '#F87171'
    : seconds <= 20 ? '#FBBF24'
    : '#E2B96F'

  return (
    <div style={{
      position: 'relative',
      width: size,
      height: size,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      animation: isUrgent ? 'countdownUrgent 0.8s ease-in-out infinite' : 'none',
    }}>
      {/* Ring */}
      <svg
        width={size}
        height={size}
        style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}
      >
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s ease',
            filter: `drop-shadow(0 0 ${isUrgent ? 10 : 6}px ${color}80)`,
          }}
        />
      </svg>

      {/* Inner content */}
      <div style={{ textAlign: 'center', zIndex: 1, position: 'relative' }}>
        <div style={{
          fontSize: isDone ? 20 : 32,
          fontWeight: 800,
          color,
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
          textShadow: isUrgent ? `0 0 16px ${color}` : 'none',
          transition: 'color 0.3s',
        }}>
          {isDone ? 'END' : seconds}
        </div>
        <div style={{ fontSize: 9, letterSpacing: '0.15em', color: 'var(--text-dim)', marginTop: 4 }}>
          {isDone ? 'ROUND' : 'SEC'}
        </div>
      </div>

      {/* Urgency pulse ring */}
      {isUrgent && (
        <div style={{
          position: 'absolute',
          inset: -4,
          borderRadius: '50%',
          border: `2px solid ${color}30`,
          animation: 'pulseRed 1s ease-in-out infinite',
        }} />
      )}
    </div>
  )
}
