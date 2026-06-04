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
      background: '#1C2040', border: '1px solid rgba(226,185,111,0.2)',
      borderRadius: 8, padding: '8px 12px',
    }}>
      <div style={{ color: '#8A8FAD', fontSize: 11 }}>{label}</div>
      <div style={{ color: '#F0F0F0', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
        ${payload[0].value?.toFixed(2)}
      </div>
    </div>
  )
}

export function PriceChart({ data, entryPrice, height = 160 }: Props) {
  const chartData = useMemo(() =>
    data.slice(-80).map(p => ({
      time: new Date(p.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      price: p.price,
    })), [data])

  const prices = chartData.map(d => d.price)
  const isUp   = prices.length >= 2 && prices[prices.length - 1] >= prices[0]
  const color  = isUp ? '#4ADE80' : '#F87171'
  const gradId = isUp ? 'gradUp' : 'gradDown'

  const min = Math.min(...prices) * 0.9998
  const max = Math.max(...prices) * 1.0002

  if (chartData.length < 2) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
        Loading price data…
      </div>
    )
  }

  return (
    <div style={{ height, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id="gradUp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4ADE80" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#4ADE80" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradDown" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F87171" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#F87171" stopOpacity={0} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="time"
            tick={{ fill: '#4A5070', fontSize: 10, fontFamily: 'Inter' }}
            tickLine={false} axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[min, max]}
            tick={{ fill: '#4A5070', fontSize: 10, fontFamily: 'Inter' }}
            tickLine={false} axisLine={false}
            tickFormatter={(v: number) => `$${v.toFixed(0)}`}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} />

          {entryPrice && (
            <ReferenceLine
              y={entryPrice}
              stroke="#E2B96F"
              strokeDasharray="4 3"
              strokeWidth={1.5}
              label={{ value: 'Entry', fill: '#E2B96F', fontSize: 10 }}
            />
          )}

          <Area
            type="monotone"
            dataKey="price"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradId})`}
            dot={false}
            activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
