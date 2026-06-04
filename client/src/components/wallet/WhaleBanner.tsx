import { useEffect } from 'react'
import { useWalletStore } from '../../store/walletStore'
import { TrendingUp, TrendingDown } from 'lucide-react'

export function WhaleBanner() {
  const { showWhaleAlert, lastWhaleAlert, dismissWhaleAlert } = useWalletStore()

  useEffect(() => {
    if (!showWhaleAlert) return
    const t = setTimeout(dismissWhaleAlert, 8000)
    return () => clearTimeout(t)
  }, [showWhaleAlert, dismissWhaleAlert])

  if (!showWhaleAlert || !lastWhaleAlert) return null

  const { wallet, amountSol, direction } = lastWhaleAlert
  const isUp = direction === 'UP'

  return (
    <div style={{
      position: 'fixed',
      top: 68,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 200,
      width: '100%',
      maxWidth: 520,
      padding: '0 16px',
      animation: 'slideDown 0.4s cubic-bezier(0.16,1,0.3,1)',
      pointerEvents: 'none',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(13,15,26,0.98), rgba(28,32,64,0.98))',
        border: `1px solid ${isUp ? 'rgba(74,222,128,0.4)' : 'rgba(248,113,113,0.4)'}`,
        borderRadius: 12,
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        backdropFilter: 'blur(16px)',
        boxShadow: `0 8px 40px rgba(0,0,0,0.6), 0 0 30px ${isUp ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)'}`,
      }}>
        {/* Whale emoji with pulse */}
        <div style={{
          fontSize: 28,
          flexShrink: 0,
          animation: 'heroFloat 2s ease-in-out infinite',
          filter: `drop-shadow(0 0 8px ${isUp ? 'rgba(74,222,128,0.6)' : 'rgba(248,113,113,0.6)'})`,
        }}>
          🐋
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.18em',
            color: isUp ? 'var(--green)' : 'var(--red)',
            marginBottom: 3,
          }}>
            WHALE ALERT
          </div>
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}>
            <span style={{
              fontFamily: 'monospace',
              background: 'rgba(255,255,255,0.06)',
              padding: '2px 7px',
              borderRadius: 4,
              fontSize: 12,
            }}>
              {wallet}
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>just wagered</span>
            <span style={{
              fontWeight: 800,
              color: 'var(--gold)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {amountSol.toFixed(2)} SOL
            </span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 5,
              background: isUp ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
              border: `1px solid ${isUp ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}`,
              color: isUp ? 'var(--green)' : 'var(--red)',
              fontWeight: 700,
              fontSize: 12,
            }}>
              {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {direction}
            </span>
          </div>
        </div>

        {/* 8s progress bar */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 2,
          borderRadius: '0 0 12px 12px',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            background: isUp ? 'var(--green)' : 'var(--red)',
            animation: 'shrinkWidth 8s linear forwards',
            transformOrigin: 'left',
          }} />
        </div>
      </div>

      <style>{`
        @keyframes shrinkWidth {
          from { width: 100%; }
          to   { width: 0%; }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )
}
