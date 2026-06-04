// ─────────────────────────────────────────────────────────────
//  KAIROX – Admin Dashboard  (password-gated, ops only)
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import { Shield, RefreshCw, Ban, Eye, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Lock, Unlock } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000'

// ── Auth gate ─────────────────────────────────────────────────
function useAdminAuth() {
  const [key, setKey]       = useState('')
  const [authed, setAuthed] = useState(false)
  const [error, setError]   = useState('')

  const tryAuth = async (k: string) => {
    try {
      const res = await fetch(`${API}/api/admin/status`, {
        headers: { 'x-admin-key': k },
      })
      if (res.ok) {
        setAuthed(true)
        setKey(k)
        sessionStorage.setItem('kx_admin_key', k)
      } else {
        setError('Invalid admin key')
      }
    } catch {
      setError('Cannot reach server')
    }
  }

  useEffect(() => {
    const saved = sessionStorage.getItem('kx_admin_key')
    if (saved) tryAuth(saved)
  }, [])

  return { key, authed, error, tryAuth }
}

// ── API helper ────────────────────────────────────────────────
async function adminFetch(path: string, adminKey: string, opts?: RequestInit) {
  const res = await fetch(`${API}/api/admin${path}`, {
    ...opts,
    headers: {
      'x-admin-key':   adminKey,
      'Content-Type': 'application/json',
      ...(opts?.headers ?? {}),
    },
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

// ── Stat card ─────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = 'var(--gold)' }: {
  icon: React.ComponentType<{ size?: number; color?: string }>
  label: string; value: string | number; sub?: string; color?: string
}) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '18px 20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Icon size={16} color={color} />
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.1em' }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

// ── Severity badge ────────────────────────────────────────────
function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, [string, string]> = {
    CRITICAL: ['#FF0040', 'rgba(255,0,64,0.15)'],
    HIGH:     ['var(--red)',  'var(--red-dim)'],
    MEDIUM:   ['var(--amber)', 'var(--amber-dim)'],
    LOW:      ['var(--text-secondary)', 'rgba(255,255,255,0.05)'],
  }
  const [color, bg] = colors[severity] ?? colors.LOW
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 4, fontSize: 10,
      fontWeight: 800, letterSpacing: '0.08em',
      color, background: bg, border: `1px solid ${color}30`,
    }}>
      {severity}
    </span>
  )
}

// ── Tabs ──────────────────────────────────────────────────────
type Tab = 'overview' | 'flags' | 'security' | 'transactions'

export default function AdminPage() {
  const { key, authed, error, tryAuth } = useAdminAuth()
  const [inputKey, setInputKey] = useState('')
  const [tab, setTab] = useState<Tab>('overview')
  const [status,   setStatus]   = useState<any>(null)
  const [housePL,  setHousePL]  = useState<any>(null)
  const [cashback, setCashback] = useState<any>(null)
  const [flags,    setFlags]    = useState<any[]>([])
  const [secEvents, setSecEvents] = useState<any[]>([])
  const [txns,     setTxns]     = useState<any[]>([])
  const [loading,  setLoading]  = useState(false)
  const [banInput, setBanInput] = useState<{ userId: string; reason: string } | null>(null)

  const refresh = useCallback(async () => {
    if (!authed) return
    setLoading(true)
    try {
      const [s, pl, cb] = await Promise.all([
        adminFetch('/status',       key),
        adminFetch('/house-pl',     key),
        adminFetch('/cashback-pool',key),
      ])
      setStatus(s); setHousePL(pl); setCashback(cb)
    } catch (e: any) { console.error(e) }
    setLoading(false)
  }, [authed, key])

  const loadFlags = useCallback(async () => {
    if (!authed) return
    const data = await adminFetch('/flags', key)
    setFlags(data.data ?? [])
  }, [authed, key])

  const loadSecEvents = useCallback(async () => {
    if (!authed) return
    const data = await adminFetch('/security-events?limit=100', key)
    setSecEvents(data.data ?? [])
  }, [authed, key])

  const loadTxns = useCallback(async () => {
    if (!authed) return
    const data = await adminFetch('/processed-txns?limit=50', key)
    setTxns(data.data ?? [])
  }, [authed, key])

  useEffect(() => {
    if (authed) {
      refresh()
      loadFlags()
      loadSecEvents()
      loadTxns()
    }
  }, [authed])

  // Auto-refresh every 15s
  useEffect(() => {
    if (!authed) return
    const t = setInterval(refresh, 15_000)
    return () => clearInterval(t)
  }, [authed, refresh])

  const handleBan = async (userId: string, reason: string) => {
    await adminFetch('/ban', key, { method: 'POST', body: JSON.stringify({ userId, reason }) })
    setBanInput(null)
    loadFlags()
  }

  const handleUnban = async (userId: string) => {
    await adminFetch('/unban', key, { method: 'POST', body: JSON.stringify({ userId }) })
    loadFlags()
  }

  // ── Auth gate ────────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{
        minHeight: '100dvh', background: 'var(--bg-deep)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 14, padding: 32, width: 320, textAlign: 'center',
        }}>
          <Shield size={32} color="var(--gold)" style={{ marginBottom: 16 }} />
          <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, marginBottom: 8 }}>Admin Access</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20 }}>
            Enter your admin key to continue
          </p>
          <input
            type="password"
            value={inputKey}
            onChange={e => setInputKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && tryAuth(inputKey)}
            placeholder="Admin key"
            style={{
              width: '100%', padding: '10px 14px',
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: 8, color: 'var(--text-primary)', fontSize: 14,
              outline: 'none', marginBottom: 12, fontFamily: 'Inter',
            }}
          />
          {error && (
            <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 10 }}>{error}</p>
          )}
          <button
            onClick={() => tryAuth(inputKey)}
            className="btn btn-gold" style={{ width: '100%' }}
          >
            Enter
          </button>
        </div>
      </div>
    )
  }

  // ── Dashboard ─────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-deep)', padding: '0 0 60px' }}>

      {/* Header */}
      <div style={{
        background: 'rgba(13,15,26,0.97)', borderBottom: '1px solid var(--border)',
        padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Shield size={20} color="var(--gold)" />
          <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--gold)' }}>KAIROX ADMIN</span>
          <span style={{
            padding: '2px 8px', borderRadius: 4, fontSize: 10,
            background: 'rgba(74,222,128,0.1)', color: 'var(--green)',
            border: '1px solid rgba(74,222,128,0.2)',
          }}>
            {status ? 'LIVE' : 'CONNECTING'}
          </span>
        </div>
        <button
          onClick={refresh}
          style={{
            background: 'none', border: '1px solid var(--border)',
            borderRadius: 7, padding: '6px 12px',
            color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
          {([
            { key: 'overview',     label: '📊 Overview' },
            { key: 'flags',        label: '🚩 Flags' },
            { key: 'security',     label: '🔒 Security Log' },
            { key: 'transactions', label: '⛓ Transactions' },
          ] as { key: Tab; label: string }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
              background: tab === t.key ? 'var(--gold-dim)' : 'transparent',
              border: `1px solid ${tab === t.key ? 'rgba(226,185,111,0.3)' : 'var(--border)'}`,
              color: tab === t.key ? 'var(--gold)' : 'var(--text-secondary)',
              fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <StatCard icon={TrendingUp}   label="ROUND STATUS"      value={status?.round ? 'ACTIVE' : 'WAITING'} color="var(--green)" />
              <StatCard icon={DollarSign}   label="LIVE SOL PRICE"    value={`$${status?.price?.toFixed(2) ?? '—'}`} />
              <StatCard icon={TrendingUp}   label="HOUSE EDGE TODAY"  value={`${housePL?.houseEdge?.toFixed(4) ?? '—'} SOL`} sub={`${housePL?.houseEdgePct?.toFixed(1) ?? '—'}% edge`} color="var(--green)" />
              <StatCard icon={TrendingDown} label="CASHBACK LIABILITY" value={`${cashback?.pendingAt15Pct?.toFixed(4) ?? '—'} SOL`} sub="15% tier estimate" color="var(--amber)" />
            </div>

            {housePL && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
                <h3 style={{ fontSize: 13, color: 'var(--text-secondary)', letterSpacing: '0.1em', marginBottom: 16 }}>
                  TODAY'S BREAKDOWN — {housePL.date}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                  {[
                    { label: 'Total Predictions', value: housePL.predictions },
                    { label: 'Wins',  value: housePL.wins, color: 'var(--green)' },
                    { label: 'Total Wagered', value: `${housePL.totalWagered?.toFixed(4)} SOL` },
                    { label: 'Total Paid Out', value: `${housePL.totalPaidOut?.toFixed(4)} SOL`, color: 'var(--red)' },
                    { label: 'House Edge', value: `${housePL.houseEdge?.toFixed(4)} SOL`, color: 'var(--green)' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: color ?? 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Round info */}
            {status?.round && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ fontSize: 11, color: 'var(--green)', letterSpacing: '0.12em', marginBottom: 8 }}>ACTIVE ROUND</div>
                <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                  {typeof status.round === 'string' ? status.round : JSON.stringify(status.round, null, 2)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── FLAGS ── */}
        {tab === 'flags' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                Flagged Users — {flags.length} in queue
              </h3>
              <button onClick={loadFlags} className="btn btn-ghost" style={{ fontSize: 12 }}>
                <RefreshCw size={12} /> Refresh
              </button>
            </div>

            {banInput && (
              <div style={{
                position: 'fixed', inset: 0, zIndex: 100,
                background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, width: 340 }}>
                  <h3 style={{ color: 'var(--red)', marginBottom: 12 }}>Ban User</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
                    User: <strong>{banInput.userId.slice(0,8)}…</strong>
                  </p>
                  <input
                    type="text"
                    placeholder="Ban reason"
                    value={banInput.reason}
                    onChange={e => setBanInput({ ...banInput, reason: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text-primary)', fontSize: 13, marginBottom: 12, fontFamily: 'Inter', outline: 'none' }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleBan(banInput.userId, banInput.reason)} className="btn btn-red" style={{ flex: 1 }}>Confirm Ban</button>
                    <button onClick={() => setBanInput(null)} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {flags.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-dim)', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  No flagged users 🎉
                </div>
              ) : flags.map(u => (
                <div key={u.id} style={{
                  background: 'var(--bg-card)', border: `1px solid ${u.banned ? 'rgba(248,113,113,0.3)' : 'rgba(251,191,36,0.2)'}`,
                  borderRadius: 10, padding: '14px 18px',
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>{u.username}</span>
                      {u.banned && <span style={{ fontSize: 10, color: 'var(--red)', fontWeight: 800, background: 'var(--red-dim)', padding: '1px 6px', borderRadius: 4 }}>BANNED</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3, fontFamily: 'monospace' }}>
                      {u.wallet_address?.slice(0,12) ?? 'no wallet'}…
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--amber)' }}>
                      ⚠ {u.bot_flag_reason ?? 'Flagged'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 3 }}>
                      Preds: {u.total_predictions} · Wins: {u.correct_predictions} · XP: {u.xp}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {!u.banned ? (
                      <button
                        onClick={() => setBanInput({ userId: u.id, reason: '' })}
                        style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)', color: 'var(--red)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <Ban size={12} /> Ban
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUnban(u.id)}
                        style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.08)', color: 'var(--green)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <Unlock size={12} /> Unban
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SECURITY LOG ── */}
        {tab === 'security' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Security Events</h3>
              <button onClick={loadSecEvents} className="btn btn-ghost" style={{ fontSize: 12 }}>
                <RefreshCw size={12} /> Refresh
              </button>
            </div>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '80px 180px 1fr 90px 120px',
                padding: '8px 14px', borderBottom: '1px solid var(--border)',
                background: 'var(--bg-elevated)',
              }}>
                {['SEV','EVENT','DETAILS','USER','TIME'].map(h => (
                  <div key={h} style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.1em' }}>{h}</div>
                ))}
              </div>
              {secEvents.slice(0, 100).map((e, i) => (
                <div key={e.id} style={{
                  display: 'grid', gridTemplateColumns: '80px 180px 1fr 90px 120px',
                  padding: '9px 14px', alignItems: 'center',
                  borderBottom: i < secEvents.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}>
                  <div><SeverityBadge severity={e.severity} /></div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{e.event_type}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                    {e.details ? JSON.stringify(e.details) : e.ip ?? '—'}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                    {e.user_id?.slice(0,8) ?? '—'}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                    {new Date(e.created_at).toLocaleTimeString()}
                  </div>
                </div>
              ))}
              {secEvents.length === 0 && (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
                  No security events
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TRANSACTIONS ── */}
        {tab === 'transactions' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Processed Transactions</h3>
              <button onClick={loadTxns} className="btn btn-ghost" style={{ fontSize: 12 }}>
                <RefreshCw size={12} /> Refresh
              </button>
            </div>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              {txns.slice(0, 50).map((t, i) => (
                <div key={t.id} style={{
                  display: 'grid', gridTemplateColumns: '90px 1fr 120px 80px',
                  padding: '10px 16px', alignItems: 'center',
                  borderBottom: i < txns.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    color: t.tx_type === 'deposit' ? 'var(--green)' : t.tx_type === 'payout' ? 'var(--gold)' : 'var(--red)',
                    background: t.tx_type === 'deposit' ? 'var(--green-dim)' : t.tx_type === 'payout' ? 'var(--gold-dim)' : 'var(--red-dim)',
                    padding: '2px 7px', borderRadius: 4,
                  }}>
                    {t.tx_type.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.signature?.slice(0,20)}…
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                    {((t.amount_lamports ?? 0) / 1e9).toFixed(4)} SOL
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                    {new Date(t.created_at).toLocaleTimeString()}
                  </span>
                </div>
              ))}
              {txns.length === 0 && (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
                  No transactions yet
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
