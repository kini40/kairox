import { Zap, AlertTriangle } from 'lucide-react'
import { useGameStore } from '../../store/gameStore'

interface Props {
  onConfirm: () => void
  onCancel:  () => void
}

export function DegenWarningModal({ onConfirm, onCancel }: Props) {
  const { wagerAmount, betaCredits, markDegenSeen } = useGameStore()
  const actualWager = wagerAmount * 2

  const handleConfirm = () => {
    markDegenSeen()
    onConfirm()
  }

  return (
    <>
      <div onClick={onCancel} style={{
        position: 'fixed', inset: 0, zIndex: 330,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      }} />

      <div style={{
        position: 'fixed', left: '50%', top: '50%', zIndex: 331,
        transform: 'translate(-50%,-50%)',
        width: '100%', maxWidth: 360, padding: '0 16px',
        animation: 'fadeIn 0.25s ease-out',
      }}>
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid rgba(251,191,36,0.35)',
          borderRadius: 14, padding: '28px 22px',
          boxShadow: '0 0 40px rgba(251,191,36,0.12), 0 8px 32px rgba(0,0,0,0.5)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 52, height: 52, borderRadius: '50%',
              background: 'rgba(251,191,36,0.12)',
              border: '1px solid rgba(251,191,36,0.3)',
              marginBottom: 12,
            }}>
              <Zap size={22} color="var(--amber)" />
            </div>
            <div style={{
              fontFamily: "'Syne',sans-serif", fontWeight: 800,
              fontSize: 20, color: 'var(--amber)', letterSpacing: '0.05em',
            }}>
              DEGEN MODE
            </div>
          </div>

          <div style={{
            background: 'rgba(251,191,36,0.06)',
            border: '1px solid rgba(251,191,36,0.15)',
            borderRadius: 8, padding: '12px 14px', marginBottom: 18,
          }}>
            {[
              { label: 'Normal wager', value: `${wagerAmount}β` },
              { label: 'Degen wager',  value: `${actualWager}β (×2)` },
              { label: 'Win payout',   value: `+${(actualWager * 1.85 * 2).toFixed(0)}β (×3.7)` },
              { label: 'Loss',         value: `-${actualWager}β (double)` },
            ].map(({ label, value }) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '4px 0', fontSize: 13,
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}>
                <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{value}</span>
              </div>
            ))}
          </div>

          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 8,
            padding: '10px 12px',
            background: 'rgba(248,113,113,0.06)',
            border: '1px solid rgba(248,113,113,0.15)',
            borderRadius: 8, marginBottom: 20,
          }}>
            <AlertTriangle size={14} color="var(--red)" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Balance: <strong style={{ color: 'var(--gold)' }}>{betaCredits.toFixed(0)}β</strong>.
              Degen mode requires {actualWager}β.
              This warning only shows once per session.
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button onClick={onCancel} style={{
              padding: '11px', borderRadius: 8,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)', fontSize: 13,
              fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter',
            }}>
              Cancel
            </button>
            <button onClick={handleConfirm} style={{
              padding: '11px', borderRadius: 8,
              background: 'rgba(251,191,36,0.15)',
              border: '1px solid rgba(251,191,36,0.4)',
              color: 'var(--amber)', fontSize: 13,
              fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter',
            }}>
              ⚡ Go Degen
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
