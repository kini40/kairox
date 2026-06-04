import { useState } from 'react'
import { Link } from 'react-router-dom'
import { KairoxWordmark } from '../components/ui/KairoxLogo'
import { RankBadge, RankIcon, type RankTier } from '../components/ui/RankBadge'
import { MusicPlayer } from '../components/ui/MusicPlayer'
import { TrendingUp, TrendingDown, Wallet, ArrowLeft, Target, Flame, Star, DollarSign, AlertCircle } from 'lucide-react'

type Period = 'week' | 'month' | 'all'

interface HistItem {
  id: number
  direction: 'UP' | 'DOWN'
  entryPrice: number
  exitPrice: number
  outcome: 'WIN' | 'LOSS' | 'PUSH'
  earned: number
  timestamp: number
  isDegen?: boolean
}

const MOCK_HISTORY: HistItem[] = [
  { id:1,  direction:'UP',   entryPrice:168.42, exitPrice:169.10, outcome:'WIN',  earned:45,   timestamp: Date.now()-300000,  isDegen:false },
  { id:2,  direction:'DOWN', entryPrice:169.10, exitPrice:168.80, outcome:'WIN',  earned:45,   timestamp: Date.now()-660000,  isDegen:false },
  { id:3,  direction:'UP',   entryPrice:168.80, exitPrice:167.20, outcome:'LOSS', earned:-25,  timestamp: Date.now()-1020000, isDegen:false },
  { id:4,  direction:'UP',   entryPrice:167.20, exitPrice:168.90, outcome:'WIN',  earned:87.5, timestamp: Date.now()-1380000, isDegen:true  },
  { id:5,  direction:'DOWN', entryPrice:168.90, exitPrice:169.40, outcome:'LOSS', earned:-25,  timestamp: Date.now()-1740000, isDegen:false },
  { id:6,  direction:'UP',   entryPrice:169.40, exitPrice:170.10, outcome:'WIN',  earned:45,   timestamp: Date.now()-2100000, isDegen:false },
  { id:7,  direction:'DOWN', entryPrice:170.10, exitPrice:170.10, outcome:'PUSH', earned:0,    timestamp: Date.now()-2460000, isDegen:false },
  { id:8,  direction:'UP',   entryPrice:170.10, exitPrice:171.20, outcome:'WIN',  earned:45,   timestamp: Date.now()-2820000, isDegen:false },
]

function formatAge(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60)   return `${s}s ago`
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  return `${Math.floor(s/3600)}h ago`
}

const RANK_TIER: RankTier = 'GOLD'
const XP = 6842
const XP_THRESHOLDS = [0, 500, 2000, 6000, 15000, 40000]
const RANK_LABELS: RankTier[] = ['ROOKIE','BRONZE','SILVER','GOLD','DIAMOND','ORACLE']
const rankIdx    = XP_THRESHOLDS.findLastIndex(t => XP >= t)
const nextXP     = XP_THRESHOLDS[rankIdx + 1] ?? 40000
const prevXP     = XP_THRESHOLDS[rankIdx]
const xpProgress = Math.min(100, Math.floor(((XP - prevXP) / (nextXP - prevXP)) * 100))
const nextRank   = RANK_LABELS[rankIdx + 1] ?? 'ORACLE'

export default function ProfilePage() {
  const [connected] = useState(false)
  const [period, setPeriod] = useState<Period>('week')

  const stats = [
    { icon: Target,      label: 'Total Predictions', value: '284',    color: 'var(--gold)'  },
    { icon: TrendingUp,  label: 'Win Rate',           value: '68.3%',  color: 'var(--green)' },
    { icon: Flame,       label: 'Best Streak',        value: '12',     color: 'var(--amber)' },
    { icon: DollarSign,  label: 'SOL Won',            value: '+8.42',  color: 'var(--green)' },
    { icon: Star,        label: 'Total XP',           value: '6,842',  color: 'var(--gold)'  },
    { icon: Target,      label: 'Correct Calls',      value: '194',    color: '#9BE8FF'      },
  ]

  const weeklyLoss = 12.4
  const weeklyLossThreshold = 50
  const lossEligible = weeklyLoss >= weeklyLossThreshold
  const lossBonus    = weeklyLoss * 0.1

  if (!connected) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg-deep)', display: 'flex', flexDirection: 'column' }}>
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', height: 60,
          background: 'rgba(13,15,26,0.95)', backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          position: 'sticky', top: 0, zIndex: 40,
        }}>
          <Link to="/" style={{ textDecoration: 'none' }}><KairoxWordmark /></Link>
          <Link to="/game" style={{ textDecoration: 'none' }}>
            <button className="btn btn-ghost" style={{ fontSize: 12, gap: 5 }}>
              <ArrowLeft size={13} /> Arena
            </button>
          </Link>
        </header>

        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 20, padding: 24, textAlign: 'center',
        }}>
          <div style={{ fontSize: 64, opacity: 0.2 }}>👤</div>
          <div>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 24, color: 'var(--text-primary)', marginBottom: 10 }}>
              No Profile Yet
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, maxWidth: 340 }}>
              Connect your Phantom wallet to create a profile, save your stats, and compete on the leaderboard.
            </p>
          </div>
          <button className="btn btn-gold" style={{ fontSize: 14, padding: '12px 28px' }}>
            <Wallet size={15} />
            Connect Wallet
          </button>
          <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            Or{' '}
            <Link to="/game" style={{ color: 'var(--gold)', textDecoration: 'none' }}>
              play in Beta mode
            </Link>
            {' '}— no wallet needed
          </p>
        </div>
        <MusicPlayer />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-deep)', paddingBottom: 60 }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', height: 60,
        background: 'rgba(13,15,26,0.95)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'sticky', top: 0, zIndex: 40,
      }}>
        <Link to="/" style={{ textDecoration: 'none' }}><KairoxWordmark /></Link>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/game" style={{ textDecoration: 'none' }}>
            <button className="btn btn-ghost" style={{ fontSize: 12, gap: 5 }}>
              <ArrowLeft size={13} /> Arena
            </button>
          </Link>
          <Link to="/leaderboard" style={{ textDecoration: 'none' }}>
            <button className="btn btn-outline-gold" style={{ fontSize: 12 }}>Leaderboard</button>
          </Link>
        </div>
      </header>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Profile header card */}
        <div className="card-gold" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <RankIcon rank={RANK_TIER} size={72} />
              <div style={{
                position: 'absolute', bottom: -4, right: -4,
                width: 20, height: 20, borderRadius: '50%',
                background: 'var(--green)',
                border: '2px solid var(--bg-deep)',
                boxShadow: '0 0 8px var(--green)',
              }} />
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 24, color: 'var(--text-primary)' }}>
                  GoldShark42
                </h1>
                <RankBadge rank={RANK_TIER} size="sm" />
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'monospace', marginBottom: 14 }}>
                7xK9...mPqR
              </p>

              {/* XP bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {XP.toLocaleString()} XP
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                    {nextRank} at {nextXP.toLocaleString()}
                  </span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${xpProgress}%`,
                    background: 'linear-gradient(90deg, #C9A35A, #E2B96F, #F0CE8A)',
                    borderRadius: 3,
                    boxShadow: '0 0 8px rgba(226,185,111,0.5)',
                    transition: 'width 1.2s ease',
                  }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                  {xpProgress}% to {nextRank}
                </div>
              </div>
            </div>

            {/* Leaderboard rank */}
            <div style={{
              textAlign: 'center', padding: '12px 20px',
              background: 'var(--gold-dim)',
              border: '1px solid var(--border-gold)',
              borderRadius: 10,
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 4 }}>RANK</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--gold)', lineHeight: 1 }}>#5</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>This week</div>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {stats.map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="card" style={{ padding: '18px 16px', textAlign: 'center' }}>
              <Icon size={16} color={color} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.8 }} />
              <div style={{ fontSize: 22, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', marginBottom: 4 }}>
                {value}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Weekly loss bonus */}
        <div className="card" style={{
          padding: 20,
          border: `1px solid ${lossEligible ? 'rgba(226,185,111,0.3)' : 'var(--border)'}`,
          background: lossEligible ? 'rgba(226,185,111,0.04)' : 'var(--bg-card)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 18 }}>💰</span>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Weekly Loss Bonus
                </h3>
                {!lossEligible && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    fontSize: 10, color: 'var(--text-dim)',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--border)',
                    borderRadius: 4, padding: '2px 6px',
                  }}>
                    <AlertCircle size={10} />
                    Not eligible yet
                  </div>
                )}
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
                Lose 50+ SOL in a week? KAIROX covers 10% back.
                {lossEligible
                  ? ` You lost ${weeklyLoss.toFixed(1)} SOL this week — you're eligible!`
                  : ` You've lost ${weeklyLoss.toFixed(1)} SOL this week. ${(weeklyLossThreshold - weeklyLoss).toFixed(1)} more to qualify.`
                }
              </p>

              {/* Progress bar */}
              <div style={{ marginBottom: lossEligible ? 14 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 11, color: 'var(--text-dim)' }}>
                  <span>{weeklyLoss.toFixed(1)} SOL lost</span>
                  <span>Threshold: {weeklyLossThreshold} SOL</span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, (weeklyLoss / weeklyLossThreshold) * 100)}%`,
                    background: lossEligible ? 'var(--gold)' : 'var(--text-dim)',
                    borderRadius: 2,
                    boxShadow: lossEligible ? '0 0 6px rgba(226,185,111,0.5)' : 'none',
                    transition: 'width 0.8s ease',
                  }} />
                </div>
              </div>

              {lossEligible && (
                <button className="btn btn-gold" style={{ fontSize: 13, padding: '9px 20px' }}>
                  Claim {lossBonus.toFixed(2)} SOL Bonus
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Prediction history */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px', borderBottom: '1px solid var(--border)',
            background: 'var(--bg-elevated)',
          }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>
              PREDICTION HISTORY
            </h3>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['week','month','all'] as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  style={{
                    padding: '4px 10px', borderRadius: 6,
                    border: `1px solid ${period === p ? 'rgba(226,185,111,0.3)' : 'transparent'}`,
                    background: period === p ? 'var(--gold-dim)' : 'transparent',
                    color: period === p ? 'var(--gold)' : 'var(--text-dim)',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {p === 'all' ? 'All' : p === 'week' ? '7d' : '30d'}
                </button>
              ))}
            </div>
          </div>

          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '36px 70px 1fr 1fr 1fr 80px 60px',
            padding: '8px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            background: 'rgba(255,255,255,0.02)',
          }}>
            {['Dir', 'Type', 'Entry', 'Exit', 'Outcome', 'Earned', 'Age'].map(h => (
              <div key={h} style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {h}
              </div>
            ))}
          </div>

          {MOCK_HISTORY.map((h, i) => (
            <div
              key={h.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '36px 70px 1fr 1fr 1fr 80px 60px',
                padding: '11px 20px',
                borderBottom: i < MOCK_HISTORY.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                alignItems: 'center',
                background: 'transparent',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {/* Direction */}
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: h.direction === 'UP' ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {h.direction === 'UP'
                  ? <TrendingUp size={13} color="var(--green)" />
                  : <TrendingDown size={13} color="var(--red)" />
                }
              </div>

              {/* Type */}
              <div>
                {h.isDegen ? (
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: 'var(--amber)',
                    background: 'var(--amber-dim)', border: '1px solid rgba(251,191,36,0.2)',
                    borderRadius: 4, padding: '2px 6px',
                  }}>⚡ DEGEN</span>
                ) : (
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Standard</span>
                )}
              </div>

              {/* Entry */}
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                ${h.entryPrice.toFixed(2)}
              </div>

              {/* Exit */}
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                ${h.exitPrice.toFixed(2)}
              </div>

              {/* Outcome */}
              <div style={{
                display: 'inline-flex', alignItems: 'center',
                fontSize: 11, fontWeight: 700,
                color: h.outcome === 'WIN' ? 'var(--green)' : h.outcome === 'LOSS' ? 'var(--red)' : 'var(--text-secondary)',
              }}>
                {h.outcome === 'WIN' ? '✓ WIN' : h.outcome === 'LOSS' ? '✗ LOSS' : '~ PUSH'}
              </div>

              {/* Earned */}
              <div style={{
                fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                color: h.earned > 0 ? 'var(--green)' : h.earned < 0 ? 'var(--red)' : 'var(--text-secondary)',
              }}>
                {h.earned > 0 ? '+' : ''}{h.earned.toFixed(0)}β
              </div>

              {/* Age */}
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                {formatAge(h.timestamp)}
              </div>
            </div>
          ))}
        </div>

        {/* Achievements */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-secondary)', marginBottom: 14 }}>
            ACHIEVEMENTS
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
            {[
              { emoji: '🎯', label: 'First Win',      unlocked: true  },
              { emoji: '🔥', label: '5× Streak',      unlocked: true  },
              { emoji: '🔥', label: '10× Streak',     unlocked: true  },
              { emoji: '⚡', label: 'Degen Win',      unlocked: true  },
              { emoji: '👻', label: 'Ghost Mode',     unlocked: false },
              { emoji: '💎', label: 'Diamond Rank',   unlocked: false },
              { emoji: '🏆', label: 'Top 10',         unlocked: true  },
              { emoji: '💰', label: 'Loss Bonus',     unlocked: false },
            ].map(({ emoji, label, unlocked }) => (
              <div key={label} style={{
                padding: '12px 8px', textAlign: 'center',
                background: unlocked ? 'rgba(226,185,111,0.06)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${unlocked ? 'rgba(226,185,111,0.2)' : 'var(--border)'}`,
                borderRadius: 10,
                opacity: unlocked ? 1 : 0.35,
                transition: 'all 0.2s',
              }}>
                <div style={{ fontSize: 24, marginBottom: 6, filter: unlocked ? 'none' : 'grayscale(1)' }}>{emoji}</div>
                <div style={{ fontSize: 10, color: unlocked ? 'var(--text-secondary)' : 'var(--text-dim)', lineHeight: 1.3 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <MusicPlayer />
    </div>
  )
}
