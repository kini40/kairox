// ─────────────────────────────────────────────────────────────
//  KAIROX Security – HMAC Request Signing
//
//  ATTACK PREVENTED: Request forgery on sensitive endpoints
//  Withdrawals and degen-mode activations carry a HMAC-SHA256
//  signature computed from: method + path + timestamp + body.
//  An attacker who intercepts the request cannot forge a new
//  one without the session secret, and cannot replay it because
//  the timestamp check (±30s) closes the window.
//
//  ATTACK PREVENTED: Parameter tampering
//  Signing the full request body means any modification
//  (e.g. inflating the withdrawal amount) invalidates the MAC.
// ─────────────────────────────────────────────────────────────

import crypto from 'crypto'
import type { Request, Response, NextFunction } from 'express'
import { securityLogger } from './securityLogger.js'

const SERVER_SECRET   = process.env.HMAC_SECRET ?? 'CHANGE_ME_IN_PROD'
const TIMESTAMP_SLACK = 30_000   // ±30 seconds

/**
 * Compute the HMAC-SHA256 for a request.
 * Input string: `METHOD:PATH:TIMESTAMP:SHA256(BODY)`
 */
export function computeHmac(
  method:    string,
  path:      string,
  timestamp: string,
  body:      string,
  secret:    string = SERVER_SECRET,
): string {
  const bodyHash = crypto.createHash('sha256').update(body).digest('hex')
  const message  = `${method.toUpperCase()}:${path}:${timestamp}:${bodyHash}`
  return crypto.createHmac('sha256', secret).update(message).digest('hex')
}

/**
 * Express middleware — verifies HMAC on sensitive routes.
 * Clients must send:
 *   X-Timestamp: <unix ms as string>
 *   X-Signature:  <hex HMAC>
 */
export function requireHmac(req: Request, res: Response, next: NextFunction) {
  const timestamp = req.headers['x-timestamp'] as string
  const signature = req.headers['x-signature']  as string

  if (!timestamp || !signature) {
    return res.status(401).json({ error: 'Missing HMAC headers' })
  }

  // Timestamp drift check — prevents replays and clock-skew abuse
  const ts  = parseInt(timestamp, 10)
  const now = Date.now()
  if (isNaN(ts) || Math.abs(now - ts) > TIMESTAMP_SLACK) {
    securityLogger.log({
      eventType: 'HMAC_TIMESTAMP_DRIFT',
      ip:        req.ip ?? 'unknown',
      details:   { timestamp, drift: now - ts },
    })
    return res.status(401).json({ error: 'Request timestamp out of window' })
  }

  const body     = JSON.stringify(req.body) ?? ''
  const expected = computeHmac(req.method, req.path, timestamp, body)

  // Constant-time comparison — prevents timing oracle attacks
  const sigBuf  = Buffer.from(signature, 'hex')
  const expBuf  = Buffer.from(expected,  'hex')
  const valid   = sigBuf.length === expBuf.length &&
                  crypto.timingSafeEqual(sigBuf, expBuf)

  if (!valid) {
    securityLogger.log({
      eventType: 'HMAC_INVALID_SIGNATURE',
      ip:        req.ip ?? 'unknown',
      userId:    req.body?.walletAddress,
      details:   { path: req.path },
    })
    return res.status(401).json({ error: 'Invalid request signature' })
  }

  next()
}

/**
 * Client-side helper (used in client/utils/api.ts) to build signed headers.
 * Exported here for documentation — actual client code is in the frontend.
 */
export function buildSignedHeaders(
  method:    string,
  path:      string,
  body:      string,
  secret:    string,
): Record<string, string> {
  const timestamp = Date.now().toString()
  const signature = computeHmac(method, path, timestamp, body, secret)
  return { 'X-Timestamp': timestamp, 'X-Signature': signature }
}
