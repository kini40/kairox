import { useState, useEffect, useRef } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { PriceParticles } from '../ui/PriceParticles'

interface PriceDisplayProps {
  price: number
  previous?: number
}

export function PriceDisplay({ price, previous = 0 }: PriceDisplayProps) {
  const [flashClass, setFlashClass] = useState('')
  const [particleTrigger, setParticleTrigger] = useState(0)
  const [particleDir, setParticleDir] = useState<'up' | 'down' | null>(null)
  const prevRef = useRef(previous || price)

  useEffect(() => {
    if (!price || price === prevRef.current) return
    const dir = price > prevRef.current ? 'up' : 'down'
    prevRef.current = price
    setFlashClass(dir === 'up' ? 'animate-price-up' : 'animate-price-down')
    setParticleDir(dir)
    setParticleTrigger(t => t + 1)
    const t = setTimeout(() => setFlashClass(''), 900)
    return () => clearTimeout(t)
  }, [price])

  const isUp   = price >= (previous || price)
  const change = previous ? price - previous : 0
  const changePct = previous ? ((price - previous) / previous) * 100 : 0

  return (
    <div style={{ textAlign: 'center', position: 'relative' }}>
      <PriceParticles direction={particleDir} trigger={particleTrigger} />

      <div style={{ fontSize: 12, letterSpacing: '0.15em', color: 'var(--text-secondary)', marginBottom: 8 }}>
        SOL / USD
      </div>

      {/* Main price */}
      <div
        className={flashClass}
        style={{
          fontSize: 'clamp(40px, 6vw, 64px)',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          fontVariantNumeric: 'tabular-nums',
          fontFeatureSettings: '"tnum"',
          color: 'var(--text-primary)',
          lineHeight: 1,
          transition: 'color 0.3s',
          padding: '8px 20px',
          borderRadius: 12,
          display: 'inline-block',
        }}
      >
        <span style={{ fontSize: '0.4em', color: 'var(--text-secondary)', verticalAlign: 'top', marginTop: '0.5em', marginRight: 4 }}>$</span>
        {price > 0 ? price.toFixed(2) : '—'}
      </div>

      {/* Change indicator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 12px',
          borderRadius: 20,
          background: isUp ? 'var(--green-dim)' : 'var(--red-dim)',
          border: `1px solid ${isUp ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
          color: isUp ? 'var(--green)' : 'var(--red)',
          fontSize: 13,
          fontWeight: 600,
        }}>
          {isUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          {change >= 0 ? '+' : ''}{change.toFixed(2)} ({changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%)
        </div>

        {/* Live dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--green)' }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%', background: 'var(--green)',
            boxShadow: '0 0 8px var(--green)',
            animation: 'pulseGold 2s ease-in-out infinite',
          }} />
          LIVE
        </div>
      </div>
    </div>
  )
}
