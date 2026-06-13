import { useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'

interface PricePoint { timestamp: number; price: number }

interface Props {
  data: PricePoint[]
  entryPrice?: number
  height?: number
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(0,0,0,0.85)',
      border: '1px solid #00ffff',
      borderRadius: 8,
      padding: '8px 12px',
      boxShadow: '0 0 12px rgba(0,255,255,0.4)',
    }}>
      <div style={{ color: '#00ffff', fontSize: 11 }}>{label}</div>
      <div style={{ color: '#ffffff', fontWeight: 700, fontSize: 14 }}>
        ${payload[0].value.toFixed(2)}
      </div>
    </div>
  )
}

export function PriceChart({ data, entryPrice, height = 160 }: Props) {
  const chartData = useMemo(() =>
    data.slice(-80).map(p => ({
      time: new Date(p.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      price: p.price,
    })), [data])

  const prices = chartData.map(d => d.price)
  const minPrice = Math.min(...prices) * 0.9999
  const maxPrice = Math.max(...prices) * 1.0001
  const lastPrice = prices[prices.length - 1]
  const firstPrice = prices[0]
  const isUp = lastPrice >= firstPrice
  const neonColor = isUp ? '#00ff88' : '#ff3366'
  const neonGlow = isUp ? 'rgba(0,255,136,0.6)' : 'rgba(255,51,102,0.6)'
  const gradientId = isUp ? 'greenGradient' : 'redGradient'

  return (
    <div style={{
      position: 'relative',
      background: 'linear-gradient(180deg, #0a0a1a 0%, #0d1117 100%)',
      borderRadius: 12,
      padding: '8px 0',
      border: `1px solid ${neonColor}33`,
      boxShadow: `0 0 20px ${neonGlow}22, inset 0 0 30px rgba(0,0,0,0.5)`,
    }}>
      {/* Scanline effect */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 12,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.015) 2px, rgba(0,255,255,0.015) 4px)',
        pointerEvents: 'none', zIndex: 1,
      }} />

      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00ff88" stopOpacity={0.4} />
              <stop offset="50%" stopColor="#00ff88" stopOpacity={0.1} />
              <stop offset="100%" stopColor="#00ff88" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff3366" stopOpacity={0.4} />
              <stop offset="50%" stopColor="#ff3366" stopOpacity={0.1} />
              <stop offset="100%" stopColor="#ff3366" stopOpacity={0} />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <XAxis dataKey="time" hide />
          <YAxis domain={[minPrice, maxPrice]} hide />
          <Tooltip content={<CustomTooltip />} />

          {entryPrice && (
            <ReferenceLine
              y={entryPrice}
              stroke="#ffd700"
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={{
                value: `Entry $${entryPrice.toFixed(2)}`,
                fill: '#ffd700',
                fontSize: 10,
                position: 'insideTopRight',
              }}
            />
          )}

          <Area
            type="monotone"
            dataKey="price"
            stroke={neonColor}
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{
              r: 5,
              fill: neonColor,
              stroke: '#fff',
              strokeWidth: 2,
              filter: 'url(#glow)',
            }}
            style={{ filter: `drop-shadow(0 0 6px ${neonColor})` }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Live pulse dot */}
      <div style={{
        position: 'absolute', bottom: 16, right: 12,
        display: 'flex', alignItems: 'center', gap: 4, zIndex: 2,
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: neonColor,
          boxShadow: `0 0 8px ${neonColor}`,
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
        <span style={{ fontSize: 9, color: neonColor, letterSpacing: 1 }}>LIVE</span>
      </div>
    </div>
  )
}