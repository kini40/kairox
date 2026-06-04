import { useState } from 'react'
import { TrendingUp, TrendingDown, Zap, Check } from 'lucide-react'

interface Props {
  roundOpen: boolean
  hasPredicted: boolean
  prediction?: { direction: 'UP' | 'DOWN'; entryPrice: number; wager: number }
  betaBalance: number
  onPredict: (dir: 'UP' | 'DOWN', wager: number, degen: boolean) => void
}

const QUICK_BETS = [10, 25, 50, 100, 250]

export function PredictionPanel({ roundOpen, hasPredicted, prediction, betaBalance, onPredict }: Props) {
  const [wager, setWager] = useState(25)
  const [degen, setDegen] = useState(false)
  const [confirming, setConfirming] = useState<'UP' | 'DOWN' | null>(null)

  const actualWager = degen ? wager * 2 : wager
  const winPayout   = actualWager * (degen ? 3.5 : 1.8)

  const handleDir = (dir: 'UP' | 'DOWN') => {
    if (!roundOpen || hasPredicted) return
    if (betaBalance < actualWager) return
    setConfirming(dir)
  }

  const confirm = () => {
    if (confirming) { onPredict(confirming, actualWager, degen); setConfirming(null) }
  }

  // Locked state
  if (hasPredicted && prediction) {
    const isUp = prediction.direction === 'UP'
    return (
      <div style={{
        background: isUp
          ? 'linear-gradient(135deg, rgba(74,222,128,0.08), rgba(74,222,128,0.04))'
          : 'linear-gradient(135deg, rgba(248,113,113,0.08), rgba(248,113,113,0.04))',
        border: `1px solid ${isUp ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}`,
        borderRadius: 12,
        padding: 20,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>
          {isUp ? '⬆' : '⬇'}
        </div>
        <div style={{
          fontWeight: 700, fontSize: 18,
          color: isUp ? 'var(--green)' : 'var(--red)',
          letterSpacing: '0.05em',
        }}>
          {prediction.direction} — LOCKED
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 6 }}>
          Entry: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
            ${prediction.entryPrice.toFixed(2)}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
          <span>Wager: <strong style={{ color: 'var(--gold)' }}>{prediction.wager}β</strong></span>
          <span>Win: <strong style={{ color: 'var(--green)' }}>+{(prediction.wager * 1.8).toFixed(0)}β</strong></span>
        </div>
        <div style={{
          marginTop: 14, padding: '6px 12px',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 6,
          display: 'inline-block',
          fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em',
        }}>
          AWAITING RESULT…
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Wager selection */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>WAGER</span>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
            Balance: <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{betaBalance.toLocaleString()}β</span>
          </span>
        </div>

        {/* Quick bets */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
          {QUICK_BETS.map(amt => (
            <button
              key={amt}
              onClick={() => setWager(amt)}
              style={{
                flex: 1, minWidth: 44,
                padding: '7px 4px',
                borderRadius: 8,
                border: `1px solid ${wager === amt ? 'rgba(226,185,111,0.5)' : 'var(--border)'}`,
                background: wager === amt ? 'var(--gold-dim)' : 'var(--bg-surface)',
                color: wager === amt ? 'var(--gold)' : 'var(--text-secondary)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {amt}
            </button>
          ))}
        </div>

        {/* Custom input */}
        <input
          type="number"
          value={wager}
          min={1} max={betaBalance}
          onChange={e => setWager(Math.max(1, Math.min(betaBalance, Number(e.target.value))))}
          style={{
            width: '100%', padding: '8px 12px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 8, color: 'var(--text-primary)',
            fontSize: 14, fontWeight: 600,
            outline: 'none', fontFamily: 'Inter',
          }}
          onFocus={e => e.target.style.borderColor = 'rgba(226,185,111,0.4)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />

        {/* Payout preview */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--text-dim)' }}>
          <span>Actual wager: <strong style={{ color: 'var(--text-secondary)' }}>{actualWager}β{degen ? ' (×2)' : ''}</strong></span>
          <span>Potential win: <strong style={{ color: 'var(--green)' }}>+{winPayout.toFixed(0)}β</strong></span>
        </div>
      </div>

      {/* Degen toggle */}
      <button
        onClick={() => setDegen(d => !d)}
        style={{
          width: '100%', padding: '9px 16px',
          borderRadius: 8,
          border: `1px solid ${degen ? 'rgba(251,191,36,0.4)' : 'var(--border)'}`,
          background: degen ? 'rgba(251,191,36,0.08)' : 'transparent',
          color: degen ? 'var(--amber)' : 'var(--text-secondary)',
          fontSize: 12, fontWeight: 700,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          letterSpacing: '0.08em',
          marginBottom: 14,
          transition: 'all 0.2s',
        }}
      >
        <Zap size={13} />
        DEGEN MODE {degen ? 'ON' : 'OFF'}
        {degen && <span style={{ fontSize: 10, opacity: 0.8 }}>— ×2 wager, ×3.5 payout</span>}
      </button>

      {/* Confirm state */}
      {confirming ? (
        <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{
            padding: 12,
            borderRadius: 8,
            border: `1px solid ${confirming === 'UP' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
            background: confirming === 'UP' ? 'rgba(74,222,128,0.05)' : 'rgba(248,113,113,0.05)',
            textAlign: 'center',
            marginBottom: 10,
            fontSize: 13,
          }}>
            <span style={{ color: confirming === 'UP' ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
              {confirming} — {actualWager}β wagered
            </span>
            <div style={{ color: 'var(--text-secondary)', fontSize: 11, marginTop: 3 }}>
              Confirm your prediction?
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-green" style={{ flex: 1 }} onClick={confirm}>
              <Check size={14} /> Confirm
            </button>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setConfirming(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button
            className="btn btn-green"
            style={{ padding: '18px 12px', fontSize: 16, flexDirection: 'column', gap: 4 }}
            disabled={!roundOpen || betaBalance < actualWager}
            onClick={() => handleDir('UP')}
          >
            <TrendingUp size={22} />
            <span>UP</span>
          </button>
          <button
            className="btn btn-red"
            style={{ padding: '18px 12px', fontSize: 16, flexDirection: 'column', gap: 4 }}
            disabled={!roundOpen || betaBalance < actualWager}
            onClick={() => handleDir('DOWN')}
          >
            <TrendingDown size={22} />
            <span>DOWN</span>
          </button>
        </div>
      )}

      {!roundOpen && !hasPredicted && (
        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-dim)', marginTop: 10 }}>
          Waiting for next round…
        </p>
      )}
    </div>
  )
}
