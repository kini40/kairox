import { useState } from 'react'
import { ArrowUpFromLine, ExternalLink, Clock, AlertCircle, X } from 'lucide-react'
import { useWalletStore } from '../../store/walletStore'
import { useWalletAuth }  from '../../hooks/useWalletAuth'
import { useUIStore }     from '../../store/uiStore'
import { requestWithdrawal, txExplorerUrl } from '../../utils/solana'

const QUICK_AMOUNTS = [0.1, 0.25, 0.5, 1]

export function WithdrawModal() {
  const { showWithdrawModal, closeWithdraw, vaultBalance, addPendingTx, confirmTx, failTx, refreshBalances } = useWalletStore()
  const { wallet } = useWalletAuth()
  const { addToast } = useUIStore()
  const [amount, setAmount]   = useState(0.1)
  const [loading, setLoading] = useState(false)
  const [reqId, setReqId]     = useState<string | null>(null)

  if (!showWithdrawModal) return null

  const canWithdraw = amount > 0 && amount <= vaultBalance && !loading
  const isLarge     = amount >= 1

  const handleWithdraw = async () => {
    if (!canWithdraw) return
    setLoading(true)

    const txId = addPendingTx({ type: 'withdraw', signature: null, amountSol: amount, status: 'pending', explorerUrl: null })

    try {
      const result = await requestWithdrawal(wallet, amount)
      setReqId(result.requestId)
      confirmTx(txId, null as never, null as never)
      refreshBalances()
      addToast({
        type: 'info',
        title: 'Withdrawal submitted',
        message: isLarge ? 'Processing up to 2 min for large amounts.' : 'Processing — typically instant.',
      })
      setTimeout(closeWithdraw, 3000)
    } catch (err: any) {
      failTx(txId, err.message)
      addToast({ type: 'error', title: 'Withdrawal failed', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div onClick={closeWithdraw} style={{
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
          border: '1px solid var(--border)',
          borderRadius: 14, overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px', borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ArrowUpFromLine size={18} color="var(--green)" />
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Withdraw SOL</span>
            </div>
            <button onClick={closeWithdraw} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>
              <X size={16} />
            </button>
          </div>

          <div style={{ padding: '20px' }}>
            {/* Vault balance */}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '10px 14px', borderRadius: 8,
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              marginBottom: 16, fontSize: 13,
            }}>
              <span style={{ color: 'var(--text-secondary)' }}>In-game balance</span>
              <span style={{ fontWeight: 700, color: 'var(--green)', fontVariantNumeric: 'tabular-nums' }}>
                {vaultBalance.toFixed(4)} SOL
              </span>
            </div>

            {/* Quick amounts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 12 }}>
              {QUICK_AMOUNTS.map(a => (
                <button key={a} onClick={() => setAmount(a)} style={{
                  padding: '8px 4px', borderRadius: 7, cursor: 'pointer',
                  border: `1px solid ${amount === a ? 'rgba(74,222,128,0.4)' : 'var(--border)'}`,
                  background: amount === a ? 'rgba(74,222,128,0.08)' : 'var(--bg-surface)',
                  color: amount === a ? 'var(--green)' : 'var(--text-secondary)',
                  fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                }}>
                  {a}
                </button>
              ))}
            </div>

            {/* Custom input */}
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <input
                type="number" step="0.01" min={0.001} max={vaultBalance}
                value={amount}
                onChange={e => setAmount(Math.max(0, Math.min(vaultBalance, Number(e.target.value))))}
                style={{
                  width: '100%', padding: '10px 50px 10px 14px',
                  background: 'var(--bg-surface)', border: '1px solid var(--border)',
                  borderRadius: 8, color: 'var(--text-primary)',
                  fontSize: 16, fontWeight: 700, outline: 'none', fontFamily: 'Inter',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(74,222,128,0.4)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
              <span style={{
                position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600,
              }}>SOL</span>
            </div>

            {/* Processing time note */}
            <div style={{
              display: 'flex', gap: 8,
              padding: '9px 12px', borderRadius: 8,
              background: isLarge ? 'rgba(251,191,36,0.06)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${isLarge ? 'rgba(251,191,36,0.2)' : 'var(--border)'}`,
              marginBottom: 16, fontSize: 12,
            }}>
              <Clock size={13} color={isLarge ? 'var(--amber)' : 'var(--text-dim)'} style={{ flexShrink: 0 }} />
              <span style={{ color: 'var(--text-secondary)' }}>
                {isLarge
                  ? 'Large withdrawal — processing up to 2 minutes.'
                  : 'Instant processing for amounts < 1 SOL.'}
              </span>
            </div>

            {/* Success state */}
            {reqId && (
              <div style={{
                padding: '10px 14px', borderRadius: 8, marginBottom: 14,
                background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)',
                fontSize: 12, color: 'var(--green)',
              }}>
                ✓ Withdrawal submitted (ID: {reqId.slice(0,8)}…)
              </div>
            )}

            <button
              onClick={handleWithdraw}
              disabled={!canWithdraw}
              className="btn btn-green"
              style={{ width: '100%', padding: '13px', fontSize: 14 }}
            >
              {loading ? 'Submitting…' : `Withdraw ${amount} SOL`}
            </button>

            <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-dim)', marginTop: 10 }}>
              Requires your signature · Funds sent to your connected wallet
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
