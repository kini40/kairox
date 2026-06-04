import { useGameStore } from '../../store/gameStore'
import { useWalletStore } from '../../store/walletStore'

export function BetaBanner() {
  const { mode } = useGameStore()
  const { openDeposit } = useWalletStore()

  if (mode !== 'BETA') return null

  return (
    <div style={{
      background: 'linear-gradient(90deg, rgba(251,191,36,0.08), rgba(226,185,111,0.06), rgba(251,191,36,0.08))',
      borderBottom: '1px solid rgba(251,191,36,0.18)',
      padding: '7px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      fontSize: 12,
      backgroundSize: '200% 100%',
      animation: 'shimmer 3s linear infinite',
    }}>
      <span style={{
        background: 'rgba(251,191,36,0.15)',
        border: '1px solid rgba(251,191,36,0.3)',
        borderRadius: 4,
        padding: '2px 8px',
        fontWeight: 800,
        letterSpacing: '0.1em',
        color: 'var(--amber)',
        fontSize: 10,
      }}>
        BETA MODE
      </span>
      <span style={{ color: 'var(--text-secondary)' }}>
        No real SOL — playing with free credits. Balances reset each session.
      </span>
      <button
        onClick={openDeposit}
        style={{
          background: 'rgba(226,185,111,0.1)',
          border: '1px solid rgba(226,185,111,0.3)',
          borderRadius: 5,
          padding: '3px 10px',
          color: 'var(--gold)',
          fontSize: 11,
          fontWeight: 700,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Go Live →
      </button>

      <style>{`
        @keyframes shimmer {
          0%   { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
      `}</style>
    </div>
  )
}
