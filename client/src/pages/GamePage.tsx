// ─────────────────────────────────────────────────────────────
//  KAIROX – Game Arena  (full wired version)
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Wallet, Trophy, Zap, Ghost, TrendingUp, TrendingDown } from 'lucide-react'

import { KairoxWordmark }       from '../components/ui/KairoxLogo'
import { PriceDisplay }         from '../components/game/PriceDisplay'
import { PriceChart }           from '../components/game/PriceChart'
import { LiveFeed }             from '../components/game/LiveFeed'
import { StreakDisplay }        from '../components/game/StreakDisplay'
import { LootChest }            from '../components/game/LootChest'
import { XPBar }                from '../components/game/XPBar'
import { MusicPlayer }          from '../components/ui/MusicPlayer'
import { ResultModal }          from '../components/game/ResultModal'
import { ChestModal }           from '../components/game/ChestModal'
import { RankUpModal }          from '../components/game/RankUpModal'
import { DailyLoginBanner }     from '../components/game/DailyLoginBanner'
import { DegenWarningModal }    from '../components/game/DegenWarningModal'

import { useGameStore, calcClientPayout, nextRankInfo, CHEST_EVERY_N, LOCK_BEFORE_END_SEC } from '../store/gameStore'
import { useGameEngine }        from '../hooks/useGameEngine'
import { useRoundCountdown }    from '../hooks/useRoundCountdown'
import { useDailyLogin }        from '../hooks/useDailyLogin'
import { usePriceFeed }         from '../hooks/usePriceFeed'
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';

// Quick bet amounts
const QUICK_BETS = [10, 25, 50, 100, 250]

// ─── Countdown ring ──────────────────────────────────────────
function CountdownRing() {
  const { seconds, isLocked, isUrgent, isClosed, progress } = useRoundCountdown()
  const SIZE = 120, STROKE = 8, R = (SIZE - STROKE) / 2
  const CIRC = 2 * Math.PI * R
  const dash  = CIRC * progress
  const color = isClosed ? '#4A5070' : isUrgent ? '#F87171' : seconds <= 20 ? '#FBBF24' : '#E2B96F'

  return (
    <div style={{
      position: 'relative', width: SIZE, height: SIZE,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: isUrgent ? 'countdownUrgent 0.8s ease-in-out infinite' : 'none',
    }}>
      <svg width={SIZE} height={SIZE} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
        <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={STROKE} />
        <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none" stroke={color} strokeWidth={STROKE}
          strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC - dash}
          style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s', filter: `drop-shadow(0 0 ${isUrgent?10:6}px ${color}80)` }}
        />
      </svg>
      <div style={{ textAlign: 'center', zIndex: 1 }}>
        <div style={{ fontSize: isClosed ? 18 : 30, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums',
          lineHeight: 1, textShadow: isUrgent ? `0 0 16px ${color}` : 'none' }}>
          {isClosed ? 'END' : seconds}
        </div>
        <div style={{ fontSize: 9, letterSpacing: '0.15em', color: 'var(--text-dim)', marginTop: 4 }}>
          {isClosed ? 'ROUND' : isLocked ? 'LOCKED' : 'SEC'}
        </div>
      </div>
      {isUrgent && <div style={{ position: 'absolute', inset: -4, borderRadius: '50%',
        border: `2px solid ${color}30`, animation: 'pulseRed 1s ease-in-out infinite' }} />}
    </div>
  )
}

// ─── Prediction control panel ─────────────────────────────────
function PredictPanel() {
  const s = useGameStore()
  const { submitPrediction } = useGameEngine()
  const { isLocked }         = useRoundCountdown()
  const [confirming, setConfirming] = useState<'UP'|'DOWN'|null>(null)
  const [showDegenWarn, setShowDegenWarn] = useState(false)

  const actualWager = s.isDegenMode ? s.wagerAmount * 2 : s.wagerAmount
  const canPredict  = s.currentRound?.status === 'OPEN' && !s.userPrediction && !isLocked
  const canAfford   = s.betaCredits >= actualWager

  const handleDir = (dir: 'UP'|'DOWN') => {
    if (!canPredict || !canAfford) return
    if (s.isDegenMode && !s.degenWarningShown) { setShowDegenWarn(true); setConfirming(dir); return }
    setConfirming(dir)
  }

  const confirm = () => {
    if (!confirming) return
    submitPrediction(confirming)
    setConfirming(null)
  }

  if (s.userPrediction) {
    const p = s.userPrediction
    const isUp = p.direction === 'UP'
    const potWin = calcClientPayout(p.wager, 'WIN', p.streakAtSub, p.isDegen, p.isGhost)
    return (
      <div style={{
        padding: 20, borderRadius: 12, textAlign: 'center',
        background: isUp ? 'rgba(74,222,128,0.07)' : 'rgba(248,113,113,0.07)',
        border: `1px solid ${isUp ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}`,
      }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>{isUp ? '⬆' : '⬇'}</div>
        <div style={{ fontWeight: 700, fontSize: 18, color: isUp ? 'var(--green)' : 'var(--red)' }}>
          {p.direction} — LOCKED
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 6 }}>
          Entry <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>${p.entryPrice.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
          <span>Wager <strong style={{ color: 'var(--gold)' }}>{p.wager}β</strong></span>
          <span>Win <strong style={{ color: 'var(--green)' }}>+{potWin.toFixed(0)}β</strong></span>
        </div>
        {p.isDegen && <div style={{ marginTop: 8, fontSize: 11, color: 'var(--amber)' }}>⚡ DEGEN — 2× risk/reward</div>}
        {p.isGhost && <div style={{ marginTop: 4, fontSize: 11, color: '#C084FC' }}>👻 GHOST — 3× multiplier</div>}
      </div>
    )
  }

  return (
    <div>
      {showDegenWarn && (
        <DegenWarningModal
          onConfirm={() => { setShowDegenWarn(false); setConfirming(confirming) }}
          onCancel={() => { setShowDegenWarn(false); setConfirming(null) }}
        />
      )}

      {/* Wager */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
          <span style={{ color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>WAGER</span>
          <span style={{ color: 'var(--text-dim)' }}>Balance: <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{s.betaCredits.toFixed(0)}β</span></span>
        </div>
        <div style={{ display: 'flex', gap: 5, marginBottom: 8, flexWrap: 'wrap' }}>
          {QUICK_BETS.map(amt => (
            <button key={amt} onClick={() => s.setWager(amt)} style={{
              flex: 1, minWidth: 40, padding: '7px 4px', borderRadius: 7,
              border: `1px solid ${s.wagerAmount===amt ? 'rgba(226,185,111,0.5)' : 'var(--border)'}`,
              background: s.wagerAmount===amt ? 'var(--gold-dim)' : 'var(--bg-surface)',
              color: s.wagerAmount===amt ? 'var(--gold)' : 'var(--text-secondary)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
            }}>{amt}</button>
          ))}
        </div>
        <input type="number" value={s.wagerAmount} min={1} max={s.betaCredits}
          onChange={e => s.setWager(Math.max(1, Math.min(s.betaCredits, Number(e.target.value))))}
          style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-surface)',
            border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)',
            fontSize: 14, fontWeight: 600, outline: 'none', fontFamily: 'Inter',
          }}
          onFocus={e => e.target.style.borderColor='rgba(226,185,111,0.4)'}
          onBlur={e => e.target.style.borderColor='var(--border)'}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--text-dim)' }}>
          <span>Actual: <strong style={{ color: 'var(--text-secondary)' }}>{actualWager}β{s.isDegenMode?' (×2)':''}</strong></span>
          <span>Win: <strong style={{ color: 'var(--green)' }}>+{calcClientPayout(actualWager,'WIN',s.streak,s.isDegenMode,s.isGhostMode).toFixed(0)}β</strong></span>
        </div>
      </div>

      {/* Mode toggles */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button onClick={s.toggleDegen} style={{
          flex: 1, padding: '9px 8px', borderRadius: 8,
          border: `1px solid ${s.isDegenMode ? 'rgba(251,191,36,0.4)' : 'var(--border)'}`,
          background: s.isDegenMode ? 'rgba(251,191,36,0.08)' : 'transparent',
          color: s.isDegenMode ? 'var(--amber)' : 'var(--text-secondary)',
          fontSize: 12, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          transition: 'all 0.2s',
        }}>
          <Zap size={12} /> DEGEN
        </button>
        <button onClick={s.toggleGhost}
          title={s.ghostUsedToday ? 'Already used today (resets midnight UTC)' : 'Anonymous prediction — 3× payout if correct'}
          style={{
            flex: 1, padding: '9px 8px', borderRadius: 8,
            border: `1px solid ${s.isGhostMode ? 'rgba(192,132,252,0.4)' : 'var(--border)'}`,
            background: s.isGhostMode ? 'rgba(192,132,252,0.08)' : 'transparent',
            color: s.isGhostMode ? '#C084FC' : s.ghostUsedToday ? 'var(--text-dim)' : 'var(--text-secondary)',
            fontSize: 12, fontWeight: 700, cursor: s.ghostUsedToday ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            opacity: s.ghostUsedToday ? 0.5 : 1,
            transition: 'all 0.2s',
          }}>
          <Ghost size={12} /> GHOST {s.ghostUsedToday ? '(used)' : ''}
        </button>
      </div>

      {/* Streak bonus indicator */}
      {s.streak >= 3 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '7px 12px', borderRadius: 8, marginBottom: 12,
          background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
          fontSize: 12, color: 'var(--amber)', fontWeight: 600,
        }}>
          🔥 Streak bonus: +{(([7,5,3].find(t => s.streak>=t) ? [0.35,0.20,0.10][[7,5,3].indexOf([7,5,3].find(t=>s.streak>=t)!)] : 0)*100).toFixed(0)}% payout
        </div>
      )}

      {/* Direction buttons or confirm */}
      {confirming ? (
        <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{
            padding: 12, borderRadius: 8, marginBottom: 10, textAlign: 'center',
            border: `1px solid ${confirming==='UP' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
            background: confirming==='UP' ? 'rgba(74,222,128,0.05)' : 'rgba(248,113,113,0.05)',
          }}>
            <span style={{ color: confirming==='UP' ? 'var(--green)' : 'var(--red)', fontWeight: 600, fontSize: 14 }}>
              {confirming} — {actualWager}β wagered
            </span>
            <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 4 }}>Confirm prediction?</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button onClick={confirm} className="btn btn-gold" style={{ padding: '12px' }}>✓ Confirm</button>
            <button onClick={() => setConfirming(null)} className="btn btn-ghost" style={{ padding: '12px' }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {(['UP','DOWN'] as const).map(dir => (
            <button key={dir} onClick={() => handleDir(dir)}
              disabled={!canPredict || !canAfford}
              className={dir==='UP' ? 'btn btn-green' : 'btn btn-red'}
              style={{ padding: '18px 12px', fontSize: 16, flexDirection: 'column', gap: 4 }}
            >
              {dir==='UP' ? <TrendingUp size={22}/> : <TrendingDown size={22}/>}
              <span>{dir}</span>
            </button>
          ))}
        </div>
      )}

      {isLocked && !s.userPrediction && (
        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-dim)', marginTop: 10 }}>
          🔒 Predictions locked — T-{LOCK_BEFORE_END_SEC}s
        </p>
      )}
      {!canAfford && !s.userPrediction && (
        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--red)', marginTop: 8 }}>
          Insufficient balance for {actualWager}β wager
        </p>
      )}
    </div>
  )
}

// ─── Main GamePage ────────────────────────────────────────────
export default function GamePage() {
  const s = useGameStore()
  const { claimChest } = useGameEngine()
  const { priceHistory, currentPrice, previousPrice } = usePriceFeed()

  useDailyLogin(null)  // pass real userId when authenticated
  const { setVisible } = useWalletModal();
const { connected, publicKey } = useWallet();

  const { next: nextRank, threshold: nextXpThresh, progress: xpProgress } = nextRankInfo(s.xp)

  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--bg-deep)',
      backgroundSize: '400% 400%',

      display: 'flex', flexDirection: 'column',
      animation: s.lastResult?.streakBroken ? 'screenShake 0.6s ease-in-out' : 'none',
    }}>

      {/* Overlays (in z-order) */}
      <DailyLoginBanner />
      <ResultModal />
      <ChestModal />
      <RankUpModal />

      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', height: 58, flexShrink: 0,
        background: 'rgba(13,15,26,0.97)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'sticky', top: 0, zIndex: 40,
      }}>
        <Link to="/" style={{ textDecoration: 'none' }}><KairoxWordmark /></Link>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{
            padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 800,
            letterSpacing: '0.12em',
            background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)',
            color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--amber)',
              display: 'inline-block', animation: 'pulseGold 2s infinite' }} />
            BETA
          </div>
          <div style={{
            padding: '6px 14px', borderRadius: 8,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            fontSize: 14, fontWeight: 700, color: 'var(--gold)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {s.betaCredits.toLocaleString(undefined,{maximumFractionDigits:0})}β
          </div>
          <Link to="/leaderboard" style={{ textDecoration: 'none' }}>
            <button className="btn btn-ghost" style={{ fontSize: 12, padding: '7px 12px', gap: 5 }}>
              <Trophy size={13}/>Ranks
            </button>
          </Link>
          <button className="btn btn-outline-gold" style={{ fontSize: 12, padding: '7px 14px', gap: 6 }}>
            <Wallet size={13}/>Go Live
          </button>
          <button
  className="btn btn-outline-gold"
  style={{ fontSize: 12, padding: '7px 14px', gap: 6 }}
  onClick={() => setVisible(true)}
>
  <Wallet size={13}/>{connected ? publicKey?.toString().slice(0,4)+'...' : 'Connect Wallet'}
</button>
        </div>
      </header>

      {/* Main grid */}
      <div style={{
        flex: 1, display: 'grid',
        gridTemplateColumns: '1fr minmax(280px,320px)',
        gap: 14, padding: 14,
        maxWidth: 1440, width: '100%', margin: '0 auto',
        alignItems: 'start',
      }}>

        {/* ── LEFT ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Price card */}
          <div className="card" style={{ padding: 24 }}>
            <PriceDisplay price={currentPrice} previous={previousPrice} />
            <div style={{ marginTop: 20 }}>
              <PriceChart
                data={priceHistory}
                entryPrice={s.userPrediction?.entryPrice}
                height={170}
              />
            </div>
          </div>

          {/* Streak + Chest */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <StreakDisplay streak={s.streak} prevStreak={0} />
            <LootChest count={s.predCount} onOpen={claimChest} />
          </div>

          {/* XP bar */}
          <div className="card" style={{ padding: '14px 18px' }}>
            <XPBar xp={s.xp} rank={s.rank as never} nextRankXp={nextXpThresh || 10000} currentRankXp={0} />
          </div>

          {/* History */}
          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', color: 'var(--text-secondary)', marginBottom: 12 }}>
              PREDICTION HISTORY
            </div>
            {s.predictionHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-dim)', fontSize: 13 }}>
                No predictions yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {s.predictionHistory.slice(0,8).map(p => (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', borderRadius: 8,
                    background: p.outcome==='WIN' ? 'rgba(74,222,128,0.05)' : p.outcome==='LOSS'||p.outcome==='NEAR_MISS' ? 'rgba(248,113,113,0.05)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${p.outcome==='WIN' ? 'rgba(74,222,128,0.15)' : p.outcome==='LOSS'||p.outcome==='NEAR_MISS' ? 'rgba(248,113,113,0.15)' : 'var(--border)'}`,
                  }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: p.direction==='UP' ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)' }}>
                      {p.direction==='UP' ? <TrendingUp size={13} color="var(--green)"/> : <TrendingDown size={13} color="var(--red)"/>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: p.direction==='UP' ? 'var(--green)' : 'var(--red)' }}>{p.direction}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 8, fontVariantNumeric: 'tabular-nums' }}>
                        ${p.entryPrice.toFixed(2)}{p.resultPrice ? ` → $${p.resultPrice.toFixed(2)}` : ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 700,
                        color: p.outcome==='WIN' ? 'var(--green)' : p.outcome==='DRAW' ? 'var(--text-secondary)' : 'var(--red)',
                      }}>
                        {!p.outcome ? '⏳' : p.outcome==='WIN' ? `+${p.payout.toFixed(0)}β` : p.outcome==='DRAW' ? '±0β' : `-${p.wager}β`}
                      </span>
                      {(p.isDegen || p.isGhost) && (
                        <span style={{ fontSize: 9, color: p.isDegen ? 'var(--amber)' : '#C084FC' }}>
                          {p.isDegen ? '⚡' : '👻'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Timer + pool */}
          <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <CountdownRing />
            <div style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>
                <span style={{ color: 'var(--green)', fontWeight: 600 }}>↑ {s.currentRound ? Math.round((s.currentRound.poolUp/(s.currentRound.poolUp+s.currentRound.poolDown||1))*100) : 50}% UP</span>
                <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>{s.currentRound ? (s.currentRound.poolUp+s.currentRound.poolDown).toFixed(1) : '0'} SOL pool</span>
                <span style={{ color: 'var(--red)', fontWeight: 600 }}>DOWN {s.currentRound ? Math.round((s.currentRound.poolDown/(s.currentRound.poolUp+s.currentRound.poolDown||1))*100) : 50}% ↓</span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', display: 'flex' }}>
                <div style={{
                  width: `${s.currentRound ? (s.currentRound.poolUp/(s.currentRound.poolUp+s.currentRound.poolDown||1))*100 : 50}%`,
                  background: 'var(--green)', boxShadow: '0 0 6px rgba(74,222,128,0.5)', transition: 'width 0.5s',
                }} />
                <div style={{ flex: 1, background: 'var(--red)', boxShadow: '0 0 6px rgba(248,113,113,0.5)' }} />
              </div>
            </div>
          </div>

          {/* Prediction panel */}
          <div className="card" style={{ padding: '18px 16px' }}>
            <PredictPanel />
          </div>

          {/* Live feed */}
          <div className="card" style={{ padding: '16px 14px' }}>
            <LiveFeed />
          </div>
        </div>
      </div>

      <MusicPlayer />
    </div>
  )
}
