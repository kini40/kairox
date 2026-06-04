import { useState } from 'react'

interface Props {
  count: number  // predictions made this cycle (0-5)
  onOpen?: () => void
}

export function LootChest({ count, onOpen }: Props) {
  const [opening, setOpening] = useState(false)
  const [opened, setOpened] = useState(false)
  const total    = 5
  const progress = (count % total) / total
  const ready    = count > 0 && count % total === 0

  const handleOpen = () => {
    if (!ready || opening || opened) return
    setOpening(true)
    setTimeout(() => { setOpening(false); setOpened(true); onOpen?.() }, 900)
    setTimeout(() => setOpened(false), 3000)
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 16px',
      borderRadius: 10,
      background: ready ? 'var(--gold-dim)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${ready ? 'var(--border-gold)' : 'var(--border)'}`,
      cursor: ready ? 'pointer' : 'default',
      transition: 'all 0.3s',
    }}
    onClick={handleOpen}
    >
      {/* Chest icon */}
      <div style={{
        fontSize: 24,
        animation: opening ? 'chestSpin 0.8s ease-out'
                 : ready    ? 'heroFloat 2s ease-in-out infinite'
                 : 'none',
      }}>
        {opened ? '✨' : ready ? '🎁' : '🗝️'}
      </div>

      {/* Progress */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 11, letterSpacing: '0.1em', color: ready ? 'var(--gold)' : 'var(--text-secondary)' }}>
            {ready ? '⬡ CHEST READY!' : 'LOOT CHEST'}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
            {count % total}/{total}
          </span>
        </div>

        <div style={{
          height: 4, background: 'rgba(255,255,255,0.06)',
          borderRadius: 2, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: ready ? '100%' : `${progress * 100}%`,
            background: ready
              ? 'linear-gradient(90deg, #C9A35A, #E2B96F, #F0CE8A)'
              : 'var(--text-dim)',
            borderRadius: 2,
            transition: 'width 0.5s ease, background 0.3s',
            boxShadow: ready ? '0 0 8px rgba(226,185,111,0.6)' : 'none',
          }} />
        </div>
      </div>
    </div>
  )
}
