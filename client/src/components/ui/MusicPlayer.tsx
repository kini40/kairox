import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, Music } from 'lucide-react'

export function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [volume, setVolume] = useState(0.5)
  const [muted, setMuted] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : volume
      audioRef.current.loop = true
    }
  }, [volume, muted])

  const toggle = () => {
    if (!audioRef.current) return
    if (playing) { audioRef.current.pause(); setPlaying(false) }
    else {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {})
    }
  }

  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 90,
      display: 'flex', alignItems: 'center', gap: 0,
      transition: 'all 0.3s ease',
    }}>
      <audio ref={audioRef} src="/assets/music/kairox-theme.mp3" preload="none" />

      {/* Expanded panel */}
      {expanded && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-gold)',
          borderRadius: '12px 0 0 12px',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          animation: 'slideInRight 0.25s ease-out',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        }}>
          {/* Visualizer bars */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 16 }}>
            {[6,10,14,8,12,16,10].map((h, i) => (
              <div key={i} style={{
                width: 2,
                height: playing ? h : 3,
                background: playing ? 'var(--gold)' : 'var(--text-dim)',
                borderRadius: 1,
                transition: `height ${0.2 + i * 0.05}s ease`,
                animation: playing ? `none` : 'none',
              }} />
            ))}
          </div>

          <span style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
            {playing ? '▶ KAIROX Theme' : 'KAIROX Theme'}
          </span>

          {/* Volume */}
          <button onClick={() => setMuted(m => !m)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: muted ? 'var(--text-dim)' : 'var(--gold)', padding: 0,
          }}>
            {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
          </button>
          <input
            type="range" min={0} max={1} step={0.05}
            value={muted ? 0 : volume}
            onChange={e => { setVolume(Number(e.target.value)); setMuted(false) }}
            style={{ width: 60, accentColor: 'var(--gold)', cursor: 'pointer' }}
          />
        </div>
      )}

      {/* Main toggle button */}
      <button
        onClick={toggle}
        onMouseEnter={() => setExpanded(true)}
        style={{
          width: 44, height: 44,
          borderRadius: expanded ? '0 12px 12px 0' : 12,
          background: playing
            ? 'linear-gradient(135deg, #C9A35A, #E2B96F)'
            : 'var(--bg-card)',
          border: '1px solid var(--border-gold)',
          color: playing ? '#0D0F1A' : 'var(--gold)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: playing ? '0 0 20px rgba(226,185,111,0.4)' : '0 4px 12px rgba(0,0,0,0.4)',
          transition: 'all 0.2s ease',
          flexShrink: 0,
        }}
      >
        {playing ? <Pause size={16} /> : <Music size={16} />}
      </button>

      {expanded && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: -1 }}
          onClick={() => setExpanded(false)}
        />
      )}
    </div>
  )
}
