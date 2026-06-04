// ─────────────────────────────────────────────────────────────
//  KAIROX – Browser Fingerprinting
//
//  ATTACK PREVENTED: Multi-account abuse, VPN evasion
//  Lightweight canvas + audio fingerprint — no external dep.
//  Not infallible, but raises the cost of multi-accounting.
//  Stored in localStorage; sent to server on identify.
// ─────────────────────────────────────────────────────────────

export async function getFingerprint(): Promise<string> {
  const cached = localStorage.getItem('kx_fp')
  if (cached) return cached

  const fp = await computeFingerprint()
  localStorage.setItem('kx_fp', fp)
  return fp
}

async function computeFingerprint(): Promise<string> {
  const parts: string[] = []

  // 1. Canvas fingerprint
  try {
    const canvas  = document.createElement('canvas')
    const ctx     = canvas.getContext('2d')
    if (ctx) {
      canvas.width  = 200
      canvas.height = 50
      ctx.fillStyle = '#1a1a2e'
      ctx.fillRect(0, 0, 200, 50)
      ctx.font      = '14px Arial'
      ctx.fillStyle = '#e2b96f'
      ctx.fillText('KAIROX_FP_2024🔥', 10, 30)
      ctx.strokeStyle = '#00f5ff'
      ctx.beginPath()
      ctx.arc(150, 25, 20, 0, Math.PI * 2)
      ctx.stroke()
      parts.push(canvas.toDataURL().slice(-50))
    }
  } catch {}

  // 2. Screen & timezone
  parts.push([
    screen.width, screen.height, screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
    navigator.hardwareConcurrency ?? 0,
  ].join('|'))

  // 3. WebGL renderer string (GPU fingerprint)
  try {
    const gl = document.createElement('canvas').getContext('webgl')
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info')
      if (ext) {
        parts.push(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '')
      }
    }
  } catch {}

  // 4. Audio context sample rate
  try {
    const ac = new (window.AudioContext || (window as any).webkitAudioContext)()
    parts.push(String(ac.sampleRate))
    await ac.close()
  } catch {}

  // Hash parts together
  const raw  = parts.join('::')
  const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32)
}
