import { useEffect, useRef } from 'react'

interface ParticleProps {
  direction: 'up' | 'down' | null
  trigger: number
}

export function PriceParticles({ direction, trigger }: ParticleProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!direction || !containerRef.current || trigger === 0) return
    const container = containerRef.current
    const color = direction === 'up' ? '#4ADE80' : '#F87171'
    const count = 12

    for (let i = 0; i < count; i++) {
      const el = document.createElement('div')
      const angle = direction === 'up'
        ? (Math.random() * 120 - 60) - 90  // upward spread
        : (Math.random() * 120 - 60) + 90   // downward spread
      const dist = 40 + Math.random() * 60
      const dx = Math.cos((angle * Math.PI) / 180) * dist
      const dy = Math.sin((angle * Math.PI) / 180) * dist
      const size = 4 + Math.random() * 6
      const delay = Math.random() * 0.15

      el.style.cssText = `
        position: absolute;
        left: 50%;
        top: 50%;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: ${color};
        box-shadow: 0 0 6px ${color};
        pointer-events: none;
        --dx: ${dx}px;
        --dy: ${dy}px;
        animation: particleDrift 0.8s ${delay}s ease-out forwards;
        transform: translate(-50%, -50%);
        opacity: 1;
        z-index: 10;
      `
      container.appendChild(el)
      setTimeout(() => el.remove(), 1000)
    }
  }, [trigger, direction])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'visible',
        zIndex: 10,
      }}
    />
  )
}
