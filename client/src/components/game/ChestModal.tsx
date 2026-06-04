import { useState } from 'react'
import { useGameStore } from '../../store/gameStore'

export function ChestModal() {
  const { pendingChest, dismissChest } = useGameStore()
  const [opened, setOpened] = useState(false)

  if (!pendingChest) return null

  const { label, xp, credits, sol } = pendingChest
  const isEmpty = pendingChest.type === 'EMPTY'

  const handleOpen = () => {
    if (opened) { dismissChest(); setOpened(false); return }
    setOpened(true)
  }

  return (
    <>
      <div onClick={handleOpen} style={{
        position: 'fixed', inset: 0, zIndex: 310,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }} />

      <div style={{
        position: 'fixed', left: '50%', top: '50%', zIndex: 311,
        transform: 'translate(-50%,-50%)',
        width: '100%', maxWidth: 340, padding: '0 16px',
        pointerEvents: 'none',
      }}>
        <div style={{
          background: 'var(--bg-card)',
          border: `1px solid ${opened && !isEmpty ? 'rgba(226,185,111,0.5)' : 'var(--border)'}`,
          borderRadius: 16,
          padding: '32px 24px',
          textAlign: 'center',
          boxShadow: opened && !isEmpty
            ? '0 0 60px rgba(226,185,111,0.25), 0 8px 40px rgba(0,0,0,0.6)'
            : '0 8px 32px rgba(0,0,0,0.5)',
          pointerEvents: 'auto',
          animation: 'fadeIn 0.3s ease-out',
        }}>
          {/* Chest / result icon */}
          <div style={{
            fontSize: 64, marginBottom: 16,
            animation: !opened ? 'heroFloat 2s ease-in-out infinite'
                       : 'chestSpin 0.8s cubic-bezier(0.34,1.56,0.64,1) forwards',
          }}>
            {!opened ? '🎁' : isEmpty ? '📭' : '✨'}
          </div>

          <div style={{
            fontFamily: "'Syne',sans-serif", fontWeight: 800,
            fontSize: 22, letterSpacing: '0.06em',
            color: opened && !isEmpty ? 'var(--gold)' : 'var(--text-primary)',
            marginBottom: 8,
            textShadow: opened && !isEmpty ? '0 0 20px rgba(226,185,111,0.4)' : 'none',
          }}>
            {!opened ? 'LOOT CHEST!' : label}
          </div>

          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.5 }}>
            {!opened
              ? 'Every 5 predictions earns a chest. Tap to reveal!'
              : isEmpty
                ? 'Sometimes the chest is empty… but you earned 25 XP just for opening it.'
                : 'Reward added to your balance!'
            }
          </div>

          {/* Reward breakdown */}
          {opened && !isEmpty && (
            <div style={{
              display: 'flex', justifyContent: 'center', gap: 20,
              padding: '12px 0', marginBottom: 20,
            }}>
              {xp > 0 && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--gold)' }}>+{xp}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>XP</div>
                </div>
              )}
              {credits > 0 && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--green)' }}>+{credits}β</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>CREDITS</div>
                </div>
              )}
              {sol > 0 && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--green)' }}>+{sol} SOL</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>SOL</div>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleOpen}
            style={{
              width: '100%', padding: '12px',
              borderRadius: 8, border: 'none', cursor: 'pointer',
              background: !opened
                ? 'linear-gradient(135deg,#C9A35A,#E2B96F)'
                : 'rgba(255,255,255,0.08)',
              color: !opened ? '#0D0F1A' : 'var(--text-secondary)',
              fontSize: 14, fontWeight: 700, fontFamily: 'Inter',
            }}
          >
            {!opened ? '🎁 Open Chest' : 'Continue'}
          </button>
        </div>
      </div>
    </>
  )
}
