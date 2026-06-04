// ─────────────────────────────────────────────────────────────
//  KAIROX – WalletButton (supports Phantom, Solflare, Backpack,
//                         Coinbase Wallet)
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import {
  Wallet, LogOut, Copy, ExternalLink, ChevronDown,
  ArrowDownToLine, ArrowUpFromLine, RefreshCw,
} from 'lucide-react'
import { useWalletAuth }  from '../../hooks/useWalletAuth'
import { useWalletStore } from '../../store/walletStore'
import { txExplorerUrl }  from '../../utils/solana'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
        color: copied ? 'var(--green)' : 'var(--text-dim)', transition: 'color 0.2s' }}
    >
      {copied ? '✓' : <Copy size={12} />}
    </button>
  )
}

export function WalletButton() {
  const { connected, shortAddress, solBalance, vaultBalance, walletName, connect, disconnect } = useWalletAuth()
  const { setVisible }   = useWalletModal()
  const walletStore      = useWalletStore()
  const [open, setOpen]  = useState(false)
  const ref              = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!connected) {
    return (
      <button
        onClick={() => setVisible(true)}
        className="btn btn-gold"
        style={{ fontSize: 12, padding: '8px 16px', gap: 6 }}
      >
        <Wallet size={13} />
        Connect Wallet
      </button>
    )
  }

  const pendingCount = walletStore.pendingTxs.filter(t => t.status === 'pending').length

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
          background: 'rgba(226,185,111,0.07)',
          border: '1px solid rgba(226,185,111,0.25)',
          color: 'var(--gold)', fontSize: 13, fontWeight: 600,
          transition: 'all 0.15s',
          position: 'relative',
        }}
      >
        {/* Pending indicator */}
        {pendingCount > 0 && (
          <div style={{
            position: 'absolute', top: -4, right: -4,
            width: 14, height: 14, borderRadius: '50%',
            background: 'var(--amber)', color: '#000',
            fontSize: 9, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {pendingCount}
          </div>
        )}
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)',
          boxShadow: '0 0 6px var(--green)', display: 'inline-block' }} />
        <span style={{ fontSize: 11, fontFamily: 'monospace' }}>{shortAddress}</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
          {solBalance.toFixed(3)} SOL
        </span>
        <ChevronDown size={12} style={{ transition: 'transform 0.2s',
          transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 200,
          width: 280,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          animation: 'fadeIn 0.15s ease-out',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)',
            background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>
                {walletName ?? 'Wallet'}
              </span>
              <CopyButton text={walletStore.publicKey ?? ''} />
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text-primary)',
              marginTop: 4, letterSpacing: '0.02em' }}>
              {walletStore.publicKey?.slice(0,8)}…{walletStore.publicKey?.slice(-8)}
            </div>
          </div>

          {/* Balances */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Wallet',    value: `${solBalance.toFixed(4)} SOL`,   color: 'var(--text-primary)' },
                { label: 'In-game',   value: `${vaultBalance.toFixed(4)} SOL`, color: 'var(--green)'        },
              ].map(({ label, value, color }) => (
                <div key={label} style={{
                  padding: '8px 10px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                }}>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Refresh */}
            <button onClick={() => walletStore.refreshBalances()}
              style={{ width: '100%', marginTop: 8, padding: '6px', borderRadius: 6,
                background: 'transparent', border: '1px solid var(--border)',
                color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: 5,
              }}>
              <RefreshCw size={11} style={{ animation: walletStore.balanceLoading ? 'spin 1s linear infinite' : 'none' }} />
              {walletStore.balanceLoading ? 'Refreshing…' : 'Refresh balances'}
            </button>
          </div>

          {/* Actions */}
          <div style={{ padding: '8px 0' }}>
            {[
              { icon: ArrowDownToLine, label: 'Deposit SOL',  action: () => { walletStore.openDeposit();  setOpen(false) } },
              { icon: ArrowUpFromLine, label: 'Withdraw SOL', action: () => { walletStore.openWithdraw(); setOpen(false) } },
            ].map(({ icon: Icon, label, action }) => (
              <button key={label} onClick={action}
                style={{
                  width: '100%', padding: '10px 16px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                  color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500,
                  textAlign: 'left', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}

            {/* Recent txs */}
            {walletStore.pendingTxs.slice(0, 3).map(tx => (
              <div key={tx.id} style={{
                padding: '8px 16px',
                display: 'flex', alignItems: 'center', gap: 8,
                borderTop: '1px solid rgba(255,255,255,0.04)',
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  background: tx.status === 'confirmed' ? 'var(--green)'
                             : tx.status === 'failed'   ? 'var(--red)'
                             : 'var(--amber)',
                  boxShadow: tx.status === 'pending' ? '0 0 6px var(--amber)' : 'none',
                  animation: tx.status === 'pending' ? 'pulseGold 1.5s infinite' : 'none',
                }} />
                <span style={{ flex: 1, fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tx.type} · {tx.amountSol.toFixed(3)} SOL
                </span>
                {tx.explorerUrl && (
                  <a href={tx.explorerUrl} target="_blank" rel="noreferrer"
                    style={{ color: 'var(--text-dim)', flexShrink: 0 }}>
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
            ))}

            {/* Disconnect */}
            <button
              onClick={() => { disconnect(); setOpen(false) }}
              style={{
                width: '100%', padding: '10px 16px',
                background: 'none', border: 'none', cursor: 'pointer', borderTop: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 10,
                color: 'var(--red)', fontSize: 13, fontWeight: 500, marginTop: 2,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <LogOut size={14} />
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
