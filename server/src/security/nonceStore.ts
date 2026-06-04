// ─────────────────────────────────────────────────────────────
//  KAIROX Security – Nonce Store
//
//  ATTACK PREVENTED: Replay attacks
//  A replay attack occurs when an attacker captures a valid
//  signed request and re-submits it later. By requiring each
//  request to carry a short-lived server-issued nonce, and
//  marking that nonce as "used" on first consumption, we
//  guarantee each request can only be processed once.
//
//  ATTACK PREVENTED: Timing attacks
//  Nonces expire after 30s, so an attacker cannot store a
//  valid request and submit it when market conditions are
//  favourable (e.g. waiting to see where price moved).
// ─────────────────────────────────────────────────────────────

import crypto from 'crypto'

interface NonceEntry {
  usedAt:    number | null   // null = not yet consumed
  createdAt: number
  userId:    string | null   // bind nonce to user when possible
}

const NONCE_TTL_MS    = 30_000   // nonce valid for 30 seconds
const NONCE_LEN_BYTES = 16       // 128-bit nonce → 32 hex chars
const MAX_STORE_SIZE  = 50_000   // GC ceiling — prevents memory exhaustion

// In production replace with Redis:
//   await redis.set(`nonce:${nonce}`, JSON.stringify(entry), 'PX', NONCE_TTL_MS)
const store = new Map<string, NonceEntry>()

// ── Garbage-collect expired/consumed nonces every 60s ────────
setInterval(() => {
  const cutoff = Date.now() - NONCE_TTL_MS * 2
  for (const [k, v] of store) {
    if (v.createdAt < cutoff) store.delete(k)
  }
}, 60_000)

export const nonceStore = {
  // Issue a fresh nonce tied to an optional userId
  issue(userId: string | null = null): string {
    // Enforce GC ceiling to prevent memory exhaustion DoS
    if (store.size >= MAX_STORE_SIZE) {
      // Force-evict oldest 10%
      const keys = Array.from(store.keys()).slice(0, MAX_STORE_SIZE / 10)
      keys.forEach(k => store.delete(k))
    }

    const nonce = crypto.randomBytes(NONCE_LEN_BYTES).toString('hex')
    store.set(nonce, { usedAt: null, createdAt: Date.now(), userId })
    return nonce
  },

  // Consume a nonce — returns false if invalid, expired, already used,
  // or bound to a different user
  consume(nonce: string, userId: string | null = null): boolean {
    const entry = store.get(nonce)
    if (!entry) return false                              // unknown nonce
    if (entry.usedAt !== null) return false               // already consumed
    if (Date.now() - entry.createdAt > NONCE_TTL_MS) {    // expired
      store.delete(nonce)
      return false
    }
    // If nonce was issued for a specific user, validate it
    if (entry.userId && userId && entry.userId !== userId) return false

    entry.usedAt = Date.now()
    return true
  },

  // Peek — check validity without consuming (for pre-validation)
  isValid(nonce: string): boolean {
    const entry = store.get(nonce)
    return !!(entry && entry.usedAt === null && Date.now() - entry.createdAt <= NONCE_TTL_MS)
  },

  size: () => store.size,
}
