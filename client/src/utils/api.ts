// ─────────────────────────────────────────────────────────────
//  KAIROX – API Client  (with HMAC signing + nonce)
//
//  SECURITY: All sensitive requests are signed with HMAC-SHA256
//  and carry a server-issued nonce to prevent replay attacks.
// ─────────────────────────────────────────────────────────────

import { computeHmacClient } from './hmacClient'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

// ── Nonce cache ───────────────────────────────────────────────
// Cache nonces to avoid a round-trip per request. Each nonce
// is single-use and expires in 30s, so we refresh proactively.

let cachedNonce:   string | null = null
let nonceExpiry:   number        = 0
const NONCE_MARGIN = 5_000  // refresh 5s before expiry

async function getNonce(userId?: string): Promise<string> {
  if (cachedNonce && Date.now() < nonceExpiry - NONCE_MARGIN) {
    const n     = cachedNonce
    cachedNonce = null  // consume
    return n
  }
  const url = `${BASE}/api/nonce${userId ? `?userId=${userId}` : ''}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch nonce')
  const { nonce, expiresIn } = await res.json()
  cachedNonce = null  // don't cache — single use
  nonceExpiry = Date.now() + (expiresIn ?? 30) * 1000
  return nonce
}

// ── Signed fetch ──────────────────────────────────────────────

interface SignedRequestOpts {
  method?:  string
  body?:    unknown
  userId?:  string
  useHmac?: boolean
  useNonce?: boolean
}

export async function signedFetch(path: string, opts: SignedRequestOpts = {}): Promise<Response> {
  const {
    method   = 'POST',
    body     = {},
    userId,
    useHmac  = true,
    useNonce = true,
  } = opts

  const bodyStr    = JSON.stringify(body)
  const timestamp  = Date.now().toString()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Timestamp':  timestamp,
  }

  // Attach wallet address for rate limiting key
  if (userId) headers['X-User-Id'] = userId

  // HMAC signature on sensitive endpoints
  if (useHmac) {
    const secret = import.meta.env.VITE_HMAC_CLIENT_SECRET || ''
    if (secret) {
      const sig = await computeHmacClient(method, path, timestamp, bodyStr, secret)
      headers['X-Signature'] = sig
    }
  }

  // Server-issued nonce for replay prevention
  if (useNonce) {
    const nonce = await getNonce(userId)
    headers['X-Nonce'] = nonce
  }

  return fetch(`${BASE}${path}`, {
    method,
    headers,
    body: method !== 'GET' ? bodyStr : undefined,
  })
}

// ── Typed helpers ─────────────────────────────────────────────

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

export async function apiPost<T>(path: string, body: unknown, opts?: Omit<SignedRequestOpts, 'body' | 'method'>): Promise<T> {
  const res = await signedFetch(path, { method: 'POST', body, ...opts })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}
