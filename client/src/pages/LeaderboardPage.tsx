import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'
import { KairoxWordmark } from '../components/ui/KairoxLogo'
import { OracleBadge, RANK_COLORS } from '../components/ui/OracleBadge'
import { MusicPlayer } from '../components/ui/MusicPlayer'
import { useSocialStore, type LBEntry, type LBSnapshot } from '../store/socialStore'
import { useGameStore } from '../store/gameStore'
import { socketService } from '../utils/socketService'
import { truncateAddress } from '../utils/solana'

type Period = 'daily' | 'weekly' | 'alltime'

const TABS: { key: Period; label: string }[] = [
  { key: 'daily',   label: 'Today' },
  { key: 'weekly',  label: 'This Week' },
  { key: 'alltime', label: 'All Time' },
]

const PODIUM_ORDER = [1, 0, 2]  // silver, gold, bronze visual order
const MEDALS = ['🥇','🥈','🥉']

function PodiumCard({ entry, position }: { entry: LBEntry; position: number }) {
  const isGold  = position === 0
  const colors  = ['#E2B96F','#C0C0C0','#CD7F32']
  const glows   = ['rgba(226,185,111,0.2)','rgba(192,192,192,0.1)','rgba(205,127,50,0.15)']
  const heights = ['180px','140px','120px']
  const color   = colors[position]
  const rankColor = RANK_COLORS[entry.oracleRank] ?? '#8A8FAD'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: isGold ? '0 0 200px' : '0 0 160px' }}>
      <div style={{
        width: '100%',
        background: `linear-gradient(135deg, ${color}18, ${color}08)`,
        border: `1px solid ${color}40`,
        borderRadius: 12,
        padding: isGold ? '20px 14px' : '14px 10px',
        textAlign: 'center',
        boxShadow: isGold ? `0 0 40px ${glows[0]}` : 'none',
        animation: isGold ? 'heroFloat 4s ease-in-out infinite' : 'none',
        marginBottom: 0,
      }}>
        <div style={{ fontSize: isGold ? 36 : 28, marginBottom: 8 }}>{MEDALS[position]}</div>
        <OracleBadge rank={entry.oracleRank} size={isGold ? 22 : 18} />
        <div style={{
          fontSize: isGold ? 14 : 12, fontWeight: 700,
          color: 'var(--text-primary)', marginTop: 6, marginBottom: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {entry.username}
        </div>
        <div style={{
          fontSize: isGold ? 15 : 13, fontWeight: 800,
          color: 'var(--green)', fontVariantNumeric: 'tabular-nums',
        }}>
          +{entry.solWon.toFixed(2)} SOL
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 3 }}>
          {entry.winRate.toFixed(0)}% win rate
        </div>
      </div>
      {/* Podium base */}
      <div style={{
        width: '100%', height: heights[position],
        background: `linear-gradient(180deg, ${color}15 0%, transparent 100%)`,
        borderRadius: '0 0 6px 6px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, fontWeight: 800,
        color: `${color}60`,
      }}>
        #{position + 1}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, icon, color }: { label: string; value: string; sub?: string; icon: string; color: string }) {
  return (
    <div style={{
      padding: '16px 18px', flex: 1,
      background: `${color}08`,
      border: `1px solid ${color}25`,
      borderRadius: 12,
    }}>
      <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>('weekly')
  const [loading, setLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(Date.now())
  const { lbSnapshots, setLBSnapshot } = useSocialStore()
  const { xp, rank } = useGameStore()

  const snapshot: LBSnapshot | null = lbSnapshots[period] ?? null

  const load = useCallback(async (p: Period, force = false) => {
    if (loading && !force) return
    setLoading(true)
    socketService.getLeaderboard(p, (res: any) => {
      if (res?.ok && res.snapshot) {
        setLBSnapshot(res.snapshot)
      }
      setLoading(false)
      setLastRefresh(Date.now())
    })
  }, [loading, setLBSnapshot])

  useEffect(() => { load(period) }, [period])

  // Auto-refresh every 30s
  useEffect(() => {
    const t = setInterval(() => load(period, true), 30_000)
    return () => clearInterval(t)
  }, [period, load])

  // Listen for server-pushed updates
  useEffect(() => {
    // LB updates come via socket in socketService.ts → setLBSnapshot
  }, [])

  const entries = snapshot?.entries ?? []
  const top3    = entries.slice(0, 3)

  // Current user row (demo: match by rank approximation)
  const myRowIndex = entries.findIndex(e => e.xp === xp) ?? -1

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-deep)', paddingBottom: 40 }}>

      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', height: 60,
        background: 'rgba(13,15,26,0.97)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'sticky', top: 0, zIndex: 40,
      }}>
        <Link to="/" style={{ textDecoration: 'none' }}><KairoxWordmark /></Link>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => load(period, true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'none', border: '1px solid var(--border)',
              borderRadius: 7, padding: '6px 12px',
              color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer',
            }}
          >
            <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
          <Link to="/game" style={{ textDecoration: 'none' }}>
            <button className="btn btn-outline-gold" style={{ fontSize: 12 }}>Arena</button>
          </Link>
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '36px 20px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%', margin: '0 auto 14px',
            background: 'rgba(226,185,111,0.1)', border: '1px solid rgba(226,185,111,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 24px rgba(226,185,111,0.15)',
          }}>
            <Trophy size={22} color="var(--gold)" />
          </div>
          <h1 style={{
            fontFamily: "'Syne',sans-serif", fontWeight: 800,
            fontSize: 34, letterSpacing: '0.1em', color: 'var(--gold)',
          }}>LEADERBOARD</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 6 }}>
            Auto-refreshes every 30s
            {snapshot && (
              <span style={{ color: 'var(--text-dim)', marginLeft: 8 }}>
                · Updated {Math.round((Date.now() - snapshot.updatedAt) / 1000)}s ago
              </span>
            )}
          </p>
        </div>

        {/* Stat cards */}
        {snapshot && (snapshot.biggestWinToday || snapshot.biggestLossToday) && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
            {snapshot.biggestWinToday && (
              <StatCard
                label="BIGGEST WIN TODAY"
                value={`+${snapshot.biggestWinToday.amount.toFixed(2)} SOL`}
                sub={snapshot.biggestWinToday.username}
                icon="👑"
                color="var(--green)"
              />
            )}
            {snapshot.biggestLossToday && (
              <StatCard
                label="BIGGEST LOSS TODAY"
                value={`-${snapshot.biggestLossToday.amount.toFixed(2)} SOL`}
                sub={snapshot.biggestLossToday.username}
                icon="💀"
                color="var(--red)"
              />
            )}
          </div>
        )}

        {/* Period tabs */}
        <div style={{
          display: 'flex', gap: 4, background: 'var(--bg-card)',
          border: '1px solid var(--border)', borderRadius: 10,
          padding: 4, marginBottom: 32,
        }}>
          {TABS.map(({ key, label }) => (
            <button key={key} onClick={() => setPeriod(key)} style={{
              flex: 1, padding: '9px 0', borderRadius: 7, cursor: 'pointer',
              border: `1px solid ${period === key ? 'rgba(226,185,111,0.3)' : 'transparent'}`,
              background: period === key ? 'var(--gold-dim)' : 'transparent',
              color: period === key ? 'var(--gold)' : 'var(--text-secondary)',
              fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
            }}>
              {label}
            </button>
          ))}
        </div>

        {/* Podium */}
        {top3.length >= 3 && (
          <div style={{
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            gap: 10, marginBottom: 32,
          }}>
            {PODIUM_ORDER.map(pos => <PodiumCard key={pos} entry={top3[pos]} position={pos} />)}
          </div>
        )}

        {/* Table */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '44px 1fr 70px 70px 100px 90px 80px',
            padding: '10px 16px',
            borderBottom: '1px solid var(--border)',
            background: 'rgba(255,255,255,0.02)',
          }}>
            {['#','PLAYER','PREDS','WIN %','SOL WON','SOL LOST','RANK'].map(h => (
              <div key={h} style={{
                fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
                color: 'var(--text-dim)', textTransform: 'uppercase',
              }}>{h}</div>
            ))}
          </div>

          {loading && entries.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
              <div style={{ animation: 'spin 1s linear infinite', display: 'inline-block', marginBottom: 8 }}>◌</div>
              <div>Loading leaderboard…</div>
            </div>
          ) : entries.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
              No data yet for this period
            </div>
          ) : (
            entries.map((e, i) => {
              const isMe = i === myRowIndex
              const rankColor = RANK_COLORS[e.oracleRank] ?? 'var(--text-secondary)'
              return (
                <div
                  key={e.userId}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '44px 1fr 70px 70px 100px 90px 80px',
                    padding: '11px 16px', alignItems: 'center',
                    borderBottom: i < entries.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    background: isMe
                      ? 'rgba(226,185,111,0.06)'
                      : i < 3 ? `rgba(226,185,111,${0.025 - i * 0.006})` : 'transparent',
                    transition: 'background 0.15s',
                    outline: isMe ? '1px solid rgba(226,185,111,0.2)' : 'none',
                  }}
                  onMouseEnter={ev => !isMe && (ev.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                  onMouseLeave={ev => !isMe && (ev.currentTarget.style.background = i < 3 ? `rgba(226,185,111,${0.025 - i * 0.006})` : 'transparent')}
                >
                  {/* Rank # */}
                  <div style={{
                    fontSize: 13, fontWeight: 700,
                    color: i === 0 ? 'var(--gold)' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'var(--text-dim)',
                  }}>
                    {i < 3 ? MEDALS[i] : `#${e.rank}`}
                    {isMe && <span style={{ fontSize: 9, color: 'var(--gold)', marginLeft: 3 }}>YOU</span>}
                  </div>

                  {/* Player */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                    <OracleBadge rank={e.oracleRank} size={18} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {e.username}
                      </div>
                      {e.walletAddress && (
                        <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                          {truncateAddress(e.walletAddress)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Preds */}
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                    {e.totalPredictions}
                  </div>

                  {/* Win % */}
                  <div style={{
                    fontSize: 13, fontWeight: 600,
                    color: e.winRate >= 65 ? 'var(--green)' : e.winRate >= 55 ? 'var(--gold)' : 'var(--text-secondary)',
                  }}>
                    {e.winRate.toFixed(0)}%
                  </div>

                  {/* SOL Won */}
                  <div style={{
                    fontSize: 13, fontWeight: 700, color: 'var(--green)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    +{e.solWon.toFixed(2)}
                  </div>

                  {/* SOL Lost */}
                  <div style={{
                    fontSize: 12, color: 'var(--red)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    -{e.solLost.toFixed(2)}
                  </div>

                  {/* Oracle rank badge */}
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '2px 7px', borderRadius: 5,
                    background: `${rankColor}12`,
                    border: `1px solid ${rankColor}30`,
                    fontSize: 9, fontWeight: 800, letterSpacing: '0.06em',
                    color: rankColor,
                  }}>
                    {e.oracleRank}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Streak legend */}
        <div style={{
          marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 20, fontSize: 11, color: 'var(--text-dim)', flexWrap: 'wrap',
        }}>
          <span>🏆 Win columns show SOL earned this period</span>
          <span>💀 Loss columns show all-time lows</span>
          <span>Leaderboard refreshes every 30s</span>
        </div>
      </div>

      <MusicPlayer />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )
}
