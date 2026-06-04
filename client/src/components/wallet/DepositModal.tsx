import { useState } from 'react'
import { ArrowDownToLine, ExternalLink, AlertCircle, X } from 'lucide-react'
import { useWalletStore } from '../../store/walletStore'
import { useWalletAuth }  from '../../hooks/useWalletAuth'
import { useUIStore }     from '../../store/uiStore'
import { depositSOL, txExplorerUrl, MIN_DEPOSIT_SOL } from '../../utils/solana'

const QUICK_AMOUNTS = [0.1, 0.25, 0.5, 1, 2, 5]

export function DepositModal() {
  const { showDepositModal, closeDeposit, addPendingTx, confirmTx, failTx, refreshBalances } = useWalletStore()
  const { wallet, solBalance } = useWalletAuth()
  const { addToast }           = useUIStore()
  const [amount, setAmount]    = useState(0.1)
  const [loading, setLoading]  = useState(false)
  const [lastSig, setLastSig]  = useState<string | null>(null)

  if (!showDepositModal) return null

  const canDeposit = amount >= MIN_DEPOSIT_SOL && amount <= solBalance && !loading

  const handleDeposit = async () => {
    if (!canDeposit) return
    setLoading(true)

    const txId = addPendingTx({ type: 'deposit', signature: null, amountSol: amount, status: 'pending', explorerUrl: null })

    try {
      const result = await depositSOL(wallet, amount)
      const expUrl = txExplorerUrl(result.signature)
      confirmTx(txId, result.signature, expUrl)
      setLastSig(result.signature)
      refreshBalances()
      addToast({ type: 'win' as never, title: 'Deposit confirmed!', message: `+${amount} SOL in-game balance` })
    } catch (err: any) {
      failTx(txId, err.message)
      addToast({ type: 'error', title: 'Deposit failed', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div onClick={closeDeposit} style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
      }} />

      <div style={{
        position: 'fixed', left: '50%', top: '50%', zIndex: 401,
        transform: 'translate(-50%,-50%)',
        width: '100%', maxWidth: 380, padding: '0 16px',
        animation: 'fadeIn 0.2s ease-out',
      }}>
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-gold)',
          borderRadius: 14, overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 20px rgba(226,185,111,0.08)',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px', borderBottom: '1px solid var(--border)',
            background: 'rgba(226,185,111,0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ArrowDownToLine size={18} color="var(--gold)" />
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Deposit SOL</span>
            </div>
            <button onClick={closeDeposit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>
              <X size={16} />
            </button>
          </div>

          <div style={{ padding: '20px 20px' }}>
            {/* Balance info */}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '10px 14px', borderRadius: 8,
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              marginBottom: 16, fontSize: 13,
            }}>
              <span style={{ color: 'var(--text-secondary)' }}>Wallet balance</span>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                {solBalance.toFixed(4)} SOL
              </span>
            </div>

            {/* Quick amounts */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.08em', marginBottom: 8 }}>
                QUICK SELECT
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {QUICK_AMOUNTS.map(a => (
                  <button key={a} onClick={() => setAmount(a)} style={{
                    padding: '8px', borderRadius: 7, cursor: 'pointer',
                    border: `1px solid ${amount === a ? 'rgba(226,185,111,0.5)' : 'var(--border)'}`,
                    background: amount === a ? 'var(--gold-dim)' : 'var(--bg-surface)',
                    color: amount === a ? 'var(--gold)' : 'var(--text-secondary)',
                    fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                  }}>
                    {a} SOL
                  </button>
                ))}
              </div>
            </div>

            {/* Custom input */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.08em', marginBottom: 6 }}>
                CUSTOM AMOUNT
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type="number" step="0.01" min={MIN_DEPOSIT_SOL} max={solBalance}
                  value={amount}
                  onChange={e => setAmount(Math.max(0, Number(e.target.value)))}
                  style={{
                    width: '100%', padding: '10px 50px 10px 14px',
                    background: 'var(--bg-surface)', border: '1px solid var(--border)',
                    borderRadius: 8, color: 'var(--text-primary)',
                    fontSize: 16, fontWeight: 700, outline: 'none', fontFamily: 'Inter',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(226,185,111,0.4)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
                <span style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600,
                }}>SOL</span>
              </div>
            </div>

            {/* Info */}
            <div style={{
              display: 'flex', gap: 8, padding: '10px 12px',
              background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.15)',
              borderRadius: 8, marginBottom: 16, fontSize: 12,
            }}>
              <AlertCircle size={14} color="var(--green)" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Deposited SOL goes into your in-game vault. Minimum deposit: {MIN_DEPOSIT_SOL} SOL.
                You can withdraw anytime.
              </span>
            </div>

            {/* Last tx */}
            {lastSig && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', borderRadius: 8,
                background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)',
                marginBottom: 14, fontSize: 12,
              }}>
                <span style={{ color: 'var(--green)' }}>✓ Confirmed</span>
                <a href={txExplorerUrl(lastSig)} target="_blank" rel="noreferrer"
                  style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  View on Explorer <ExternalLink size={10} />
                </a>
              </div>
            )}

            {/* CTA */}
            <button
              onClick={handleDeposit}
              disabled={!canDeposit}
              className="btn btn-gold"
              style={{ width: '100%', padding: '13px', fontSize: 14 }}
            >
              {loading ? 'Confirming…' : `Deposit ${amount} SOL`}
            </button>

            <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-dim)', marginTop: 10 }}>
              Transaction signed by your wallet · No custody of private keys
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
