import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, TrendingUp, Zap, Shield, Trophy } from 'lucide-react'
import { KairoxLogo } from '../components/ui/KairoxLogo'

/* ── Animated particle field (CSS-only driven by JS init) ── */
function ParticleField() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const N = 40
    const frag = document.createDocumentFragment()
    for (let i = 0; i < N; i++) {
      const el = document.createElement('div')
      const size = 1 + Math.random() * 2
      const x    = Math.random() * 100
      const y    = Math.random() * 100
      const dur  = 8 + Math.random() * 16
      const del  = Math.random() * -20
      el.style.cssText = `
        position:absolute; border-radius:50%; pointer-events:none;
        left:${x}%; top:${y}%;
        width:${size}px; height:${size}px;
        background:rgba(226,185,111,${0.15 + Math.random() * 0.25});
        animation: heroFloat ${dur}s ${del}s ease-in-out infinite;
        box-shadow:0 0 ${size * 2}px rgba(226,185,111,0.3);
      `
      frag.appendChild(el)
    }
    ref.current.appendChild(frag)
  }, [])

  return <div ref={ref} style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }} />
}

/* ── Price ticker ── */
const TICKER_ITEMS = [
  { sym: 'SOL/USD', price: '168.42', change: '+2.34%', up: true },
  { sym: 'BTC/USD', price: '67,142', change: '+1.1%',  up: true },
  { sym: 'ETH/USD', price: '3,482',  change: '-0.8%',  up: false },
  { sym: 'SOL/USD', price: '168.42', change: '+2.34%', up: true },
  { sym: 'BNB/USD', price: '592',    change: '+0.5%',  up: true },
  { sym: 'BONK/USD',price: '0.0000243', change: '+8.2%', up: true },
  { sym: 'JTO/USD', price: '4.21',   change: '-1.2%',  up: false },
  { sym: 'WIF/USD', price: '2.87',   change: '+5.4%',  up: true },
]

function PriceTicker() {
  const doubled = [...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS]
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 20,
      background: 'rgba(13,15,26,0.95)',
      borderTop: '1px solid rgba(226,185,111,0.12)',
      height: 36, overflow: 'hidden',
      display: 'flex', alignItems: 'center',
    }}>
      <div style={{
        display: 'flex', gap: 0, alignItems: 'center',
        animation: 'tickerScroll 40s linear infinite',
        whiteSpace: 'nowrap',
      }}>
        {doubled.map((item, i) => (
          <div key={i} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '0 24px',
            borderRight: '1px solid rgba(255,255,255,0.05)',
            fontSize: 12,
          }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{item.sym}</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              ${item.price}
            </span>
            <span style={{ color: item.up ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
              {item.change}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

const FEATURES = [
  { icon: TrendingUp, title: 'Predict & Win',    desc: 'Call SOL price UP or DOWN every 60s. Win up to 1.8× your wager.',  color: 'var(--green)' },
  { icon: Zap,        title: 'Degen Mode',        desc: '2× the wager. 3.5× the payout. For the bold and the reckless.',    color: 'var(--amber)' },
  { icon: Trophy,     title: 'Ranked Leaderboard',desc: 'Climb daily, weekly, and all-time ranks. Earn XP and unlock tiers.',color: 'var(--gold)'  },
  { icon: Shield,     title: 'Ghost Mode',        desc: 'Predict anonymously. Your identity stays hidden from rivals.',      color: '#9BE8FF'      },
]

export default function LandingPage() {
  const nav = useNavigate()
  const [priceVal, setPriceVal] = useState(168.42)

  useEffect(() => {
    const t = setInterval(() => {
      setPriceVal(p => +(p + (Math.random() - 0.48) * 0.3).toFixed(2))
    }, 1500)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-deep)', position: 'relative', paddingBottom: 36 }}>

      {/* Grid bg */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(226,185,111,0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(226,185,111,0.025) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
        pointerEvents: 'none',
      }} />

      {/* Radial glow */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 50% at 50% 30%, rgba(226,185,111,0.06) 0%, transparent 70%)',
      }} />

      <ParticleField />

      {/* ── Minimal nav ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 30,
        height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px',
        background: 'rgba(13,15,26,0.8)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <KairoxLogo size={36} />
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, letterSpacing: '0.12em', color: 'var(--gold)' }}>
            KAIROX
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => nav('/leaderboard')}>Leaderboard</button>
          <button className="btn btn-outline-gold" style={{ fontSize: 13 }} onClick={() => nav('/game')}>Play Now</button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        paddingTop: 60, paddingBottom: 50,
        position: 'relative', zIndex: 1,
        textAlign: 'center', padding: '100px 24px 80px',
      }}>
        {/* Logo */}
        <div style={{ animation: 'heroFloat 5s ease-in-out infinite', marginBottom: 32 }}>
          <KairoxLogo size={96} animate />
        </div>

        {/* Title */}
        <h1 style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: 'clamp(48px, 8vw, 96px)',
          letterSpacing: '0.08em',
          color: 'var(--gold)',
          textShadow: '0 0 60px rgba(226,185,111,0.3)',
          lineHeight: 1,
          marginBottom: 20,
        }}>
          KAIROX
        </h1>

        <p style={{
          fontSize: 'clamp(18px, 3vw, 26px)',
          color: 'var(--text-secondary)',
          letterSpacing: '0.2em',
          fontWeight: 300,
          marginBottom: 12,
        }}>
          Predict. Earn. Dominate.
        </p>

        <p style={{
          fontSize: 15, color: 'var(--text-dim)', maxWidth: 480,
          lineHeight: 1.6, marginBottom: 48,
        }}>
          The premier Web3 price prediction arena on Solana.
          Call the market every 60 seconds. Win real SOL.
        </p>

        {/* Live price preview */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16, marginBottom: 48,
          padding: '14px 28px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-gold)',
          borderRadius: 12,
          boxShadow: '0 0 32px rgba(226,185,111,0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #9945FF, #14F195)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff' }}>◎</div>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', letterSpacing: '0.1em' }}>SOL/USD</span>
          </div>
          <div style={{ fontVariantNumeric: 'tabular-nums', fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>
            ${priceVal.toFixed(2)}
          </div>
          <div style={{
            fontSize: 12, fontWeight: 600,
            color: 'var(--green)',
            background: 'var(--green-dim)',
            padding: '3px 8px', borderRadius: 6,
          }}>LIVE</div>
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            className="btn btn-gold"
            style={{ fontSize: 15, padding: '14px 32px', minWidth: 220 }}
            onClick={() => nav('/game')}
          >
            Play Beta (Free)
            <ArrowRight size={16} />
          </button>
          <button
            className="btn btn-outline-gold"
            style={{ fontSize: 15, padding: '14px 32px', minWidth: 220 }}
            onClick={() => nav('/game')}
          >
            Connect Wallet &amp; Play Live
          </button>
        </div>

        {/* Social proof */}
        <div style={{ display: 'flex', gap: 40, marginTop: 56, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { label: 'Free Credits', value: '1,000β' },
            { label: 'Round Length', value: '60s' },
            { label: 'Win Payout', value: '1.8×' },
            { label: 'Degen Payout', value: '3.5×' },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 28, fontWeight: 800, color: 'var(--gold)',
                textShadow: '0 0 16px rgba(226,185,111,0.3)',
              }}>
                {value}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.12em', marginTop: 4 }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ padding: '80px 24px', maxWidth: 960, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <h2 style={{
          textAlign: 'center', marginBottom: 48,
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800, fontSize: 32,
          letterSpacing: '0.1em', color: 'var(--text-primary)',
        }}>
          GAME MECHANICS
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
        }}>
          {FEATURES.map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="card" style={{ padding: 24 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: `${color}15`,
                border: `1px solid ${color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 14,
              }}>
                <Icon size={18} color={color} />
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>{title}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Rank tiers */}
      <section style={{ padding: '0 24px 100px', maxWidth: 860, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <h2 style={{
          textAlign: 'center', marginBottom: 12,
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800, fontSize: 32,
          letterSpacing: '0.1em', color: 'var(--text-primary)',
        }}>
          RANK SYSTEM
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 40, fontSize: 14 }}>
          Earn XP with every prediction. Rise through the ranks.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { tier: 'Rookie',          emoji: '🔰', xp: '0',     color: '#8A8FAD' },
            { tier: 'Bronze Trader',   emoji: '🥉', xp: '500',   color: '#CD7F32' },
            { tier: 'Silver Hunter',   emoji: '🥈', xp: '2,000', color: '#A8A9AD' },
            { tier: 'Gold Shark',      emoji: '🥇', xp: '6,000', color: '#E2B96F' },
            { tier: 'Diamond Oracle',  emoji: '💎', xp: '15,000',color: '#9BE8FF' },
            { tier: 'Legendary Oracle',emoji: '👁️', xp: '40,000',color: '#C084FC' },
          ].map(({ tier, emoji, xp, color }, i) => (
            <div key={tier} className="card" style={{
              padding: '16px 12px', textAlign: 'center',
              border: `1px solid ${color}20`,
              background: `${color}06`,
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{emoji}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color, letterSpacing: '0.04em', marginBottom: 4 }}>{tier}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{xp} XP</div>
            </div>
          ))}
        </div>
      </section>

      <PriceTicker />
    </div>
  )
}
