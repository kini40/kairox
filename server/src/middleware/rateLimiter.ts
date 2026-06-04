// ─────────────────────────────────────────────────────────────
//  KAIROX Security – Rate Limiters
//
//  ATTACK PREVENTED: Brute-force, DoS, credential stuffing
//  Multiple layered limiters protect different endpoints
//  with appropriate thresholds for their risk profile.
// ─────────────────────────────────────────────────────────────

import { type Request, type Response, type NextFunction } from 'express'
import { securityLogger } from '../security/securityLogger.js'

// Sliding window rate limiter — no external dependency required.
// For production at scale, replace window store with Redis.

interface WindowEntry { count: number; windowStart: number }
const windows = new Map<string, WindowEntry>()

function slidingWindow(key: string, limit: number, windowMs: number): boolean {
  const now   = Date.now()
  const entry = windows.get(key)

  if (!entry || now - entry.windowStart > windowMs) {
    windows.set(key, { count: 1, windowStart: now })
    return true   // allowed
  }

  entry.count++
  if (entry.count > limit) return false  // blocked
  return true
}

// GC every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - 60_000 * 15
  for (const [k, v] of windows) {
    if (v.windowStart < cutoff) windows.delete(k)
  }
}, 300_000)

// ── General API: 30 req/min per wallet or IP ─────────────────
export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const key = (req.headers['x-wallet-address'] as string) || req.ip || 'anonymous'
  if (!slidingWindow(`api:${key}`, 30, 60_000)) {
    securityLogger.log({
      eventType: 'RATE_LIMIT_API',
      ip:        req.ip,
      details:   { path: req.path, key },
    })
    return res.status(429).json({
      error: 'Too many requests. Please slow down.',
      retryAfter: 60,
    })
  }
  next()
}

// ── Login: 5 attempts/min per IP, 15-minute cooldown ─────────
const loginCooldowns = new Map<string, number>()

export function loginRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip ?? 'unknown'

  // Cooldown check (independent of sliding window)
  const cooldownUntil = loginCooldowns.get(ip) ?? 0
  if (Date.now() < cooldownUntil) {
    const secondsLeft = Math.ceil((cooldownUntil - Date.now()) / 1000)
    return res.status(429).json({
      error: `Too many login attempts. Try again in ${secondsLeft}s`,
      retryAfter: secondsLeft,
    })
  }

  if (!slidingWindow(`login:${ip}`, 5, 60_000)) {
    // Apply 15-minute cooldown
    loginCooldowns.set(ip, Date.now() + 15 * 60_000)
    securityLogger.log({
      eventType: 'RATE_LIMIT_LOGIN',
      ip,
      details:   { cooldownMinutes: 15 },
      severity:  'MEDIUM',
    })
    return res.status(429).json({
      error: 'Too many login attempts. Cooldown: 15 minutes.',
      retryAfter: 900,
    })
  }

  next()
}

// ── Withdrawals: max 3/hour per wallet ───────────────────────
export function withdrawalRateLimiter(req: Request, res: Response, next: NextFunction) {
  const wallet = req.body?.walletAddress || (req.headers['x-wallet-address'] as string)
  if (!wallet) return next()  // let auth middleware handle missing wallet

  if (!slidingWindow(`withdrawal:${wallet}`, 3, 3_600_000)) {
    securityLogger.log({
      eventType: 'RATE_LIMIT_WITHDRAWAL',
      ip:        req.ip,
      details:   { wallet },
      severity:  'MEDIUM',
    })
    return res.status(429).json({
      error: 'Withdrawal limit reached (3 per hour). Try again later.',
      retryAfter: 3600,
    })
  }
  next()
}

// ── Timestamp drift guard: reject if >30s old ────────────────
// Prevents storing and replaying old requests.
export function timestampGuard(req: Request, res: Response, next: NextFunction) {
  const ts = parseInt(req.headers['x-timestamp'] as string ?? '0', 10)
  if (!ts) return next()   // not all endpoints require timestamp

  const drift = Math.abs(Date.now() - ts)
  if (drift > 30_000) {
    return res.status(400).json({
      error: 'Request timestamp too old. Check your system clock.',
    })
  }
  next()
}

// ── Socket.io prediction throttle ────────────────────────────
// Returns a per-socket throttle function. Returns true if allowed.

interface SocketThrottle { lastSent: number; count: number; windowStart: number }
const socketThrottles = new Map<string, SocketThrottle>()

export function throttleSocket(socketId: string): boolean {
  const now  = Date.now()
  const data = socketThrottles.get(socketId)

  if (!data || now - data.windowStart > 1000) {
    // New 1s window
    socketThrottles.set(socketId, { lastSent: now, count: 1, windowStart: now })
    return true
  }

  data.count++
  data.lastSent = now
  return data.count <= 2   // max 2 prediction events/second
}

export function cleanupSocketThrottle(socketId: string) {
  socketThrottles.delete(socketId)
}
