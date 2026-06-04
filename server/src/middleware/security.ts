// ─────────────────────────────────────────────────────────────
//  KAIROX Security – Express Security Middleware Stack
//
//  Configures Helmet.js, CORS, and other HTTP security
//  headers as a single middleware chain.
// ─────────────────────────────────────────────────────────────

import type { RequestHandler, Request, Response, NextFunction } from 'express'

const ALLOWED_ORIGINS = (process.env.CLIENT_URL ?? 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())

// ── CORS ──────────────────────────────────────────────────────
// ATTACK PREVENTED: Cross-Origin Request Forgery (CSRF)
// Restricts which origins may call the API. In production
// this must be set to only your deployed frontend domain.

export function corsMiddleware(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin

    // Allow listed origins OR same-origin requests
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin',      origin)
        res.setHeader('Access-Control-Allow-Credentials', 'true')
        res.setHeader('Access-Control-Allow-Methods',     'GET,POST,PATCH,DELETE,OPTIONS')
        res.setHeader('Access-Control-Allow-Headers',     'Content-Type,Authorization,X-Timestamp,X-Signature,X-Wallet-Address,X-Nonce')
        res.setHeader('Access-Control-Max-Age',           '86400')
      }

      if (req.method === 'OPTIONS') {
        return res.sendStatus(204)
      }
      return next()
    }

    // Unknown origin — reject
    return res.status(403).json({ error: 'CORS policy: origin not allowed' })
  }
}

// ── Security headers (Helmet-equivalent, no external dep) ────
// ATTACK PREVENTED: XSS via Content-Security-Policy
// ATTACK PREVENTED: Clickjacking via X-Frame-Options
// ATTACK PREVENTED: MIME sniffing via X-Content-Type-Options
// ATTACK PREVENTED: Info leakage via Referrer-Policy

export function securityHeaders(): RequestHandler {
  return (_req: Request, res: Response, next: NextFunction) => {
    // Prevent browsers executing injected scripts
    res.setHeader('Content-Security-Policy',
      "default-src 'none'; " +
      "script-src 'self'; " +
      "connect-src 'self'; " +
      "img-src 'self' data:; " +
      "style-src 'self' 'unsafe-inline';"
    )
    // Prevent clickjacking iframes
    res.setHeader('X-Frame-Options', 'DENY')
    // Prevent MIME-type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff')
    // Don't leak referrer to third parties
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    // HSTS — enforce HTTPS for 1 year in production
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
    }
    // Remove X-Powered-By to avoid fingerprinting
    res.removeHeader('X-Powered-By')
    // Permissions policy — disable dangerous browser features
    res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()')

    next()
  }
}

// ── Banned user check ─────────────────────────────────────────
// ATTACK PREVENTED: Banned users re-accessing after ban
// Applied to all prediction and wallet routes.

import { botDetector }    from '../security/botDetector.js'
import { securityLogger } from '../security/securityLogger.js'

export function bannedUserGuard(): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.body?.userId || (req.headers['x-user-id'] as string)
    if (!userId) return next()

    const banned = await botDetector.isBanned(userId)
    if (banned) {
      securityLogger.log({
        eventType: 'BANNED_USER_ATTEMPT',
        userId,
        ip:        req.ip,
        details:   { path: req.path },
        severity:  'HIGH',
      })
      return res.status(403).json({ error: 'Account suspended. Contact support.' })
    }

    next()
  }
}

// ── Input sanitizer ───────────────────────────────────────────
// ATTACK PREVENTED: XSS via stored usernames/display names
// Strips HTML tags and dangerous characters from text fields.

export function sanitizeUsername(username: string): string {
  if (typeof username !== 'string') return ''
  // Remove HTML tags
  let clean = username.replace(/<[^>]*>/g, '')
  // Remove script injection patterns
  clean = clean.replace(/javascript:/gi, '')
  clean = clean.replace(/on\w+=/gi,      '')
  // Limit length
  clean = clean.slice(0, 24)
  // Allow only alphanumeric, underscore, hyphen, dot
  clean = clean.replace(/[^a-zA-Z0-9_\-\.]/g, '')
  return clean.trim()
}

// ── JSON body size limiter ────────────────────────────────────
// ATTACK PREVENTED: Resource exhaustion via large payloads
// Express's built-in limit is set in index.ts (256kb), but
// prediction-specific routes should be much smaller.

export function tinyBodyLimit(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] ?? '0', 10)
    if (contentLength > 4096) {  // 4KB max for prediction endpoints
      return res.status(413).json({ error: 'Request body too large' })
    }
    next()
  }
}
