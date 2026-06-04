// ─────────────────────────────────────────────────────────────
//  KAIROX Security – Security Event Logger
//
//  All security-relevant events are persisted to the
//  security_events table in Supabase and mirrored to stdout
//  in structured JSON format for log aggregation (Datadog,
//  Logtail, etc.).
//
//  This creates a complete audit trail for:
//   - Bot detection hits
//   - HMAC failures
//   - Rate limit exceeded
//   - Banned user attempts
//   - Transaction double-spend attempts
//   - Suspicious win-rate flags
// ─────────────────────────────────────────────────────────────

import { supabaseAdmin } from '../config/supabase.js'

export type SecurityEventType =
  // Prediction integrity
  | 'ROUND_LOCKED_VIOLATION'       // prediction after lock time
  | 'DOUBLE_PREDICTION'            // second prediction same round
  | 'INVALID_ROUND_ID'
  | 'SERVER_PRICE_MISMATCH'        // client sent price, server ignored it

  // Rate limits
  | 'RATE_LIMIT_API'
  | 'RATE_LIMIT_SOCKET'
  | 'RATE_LIMIT_LOGIN'
  | 'RATE_LIMIT_WITHDRAWAL'

  // Replay / timing
  | 'NONCE_INVALID'
  | 'NONCE_REPLAYED'
  | 'HMAC_INVALID_SIGNATURE'
  | 'HMAC_TIMESTAMP_DRIFT'

  // Bot / anomaly
  | 'BOT_TIMING_FLAG'              // submits too fast too consistently
  | 'HIGH_WIN_RATE_FLAG'           // >75% over 20+ preds
  | 'MULTI_ACCOUNT_IP'             // >3 accounts same IP
  | 'SUSPICIOUS_PATTERN'

  // Wallet / on-chain
  | 'TX_DOUBLE_SPEND'              // tx sig already processed
  | 'TX_UNCONFIRMED'               // tried to credit before confirmed
  | 'WITHDRAWAL_SIGNATURE_INVALID'
  | 'VAULT_BALANCE_INSUFFICIENT'

  // Auth
  | 'BANNED_USER_ATTEMPT'
  | 'GHOST_USED_TODAY'
  | 'DEGEN_BALANCE_VIOLATION'

  // Admin
  | 'ADMIN_LOGIN'
  | 'ADMIN_BAN_USER'
  | 'ADMIN_VOID_ROUND'

export interface SecurityEvent {
  eventType: SecurityEventType
  userId?:   string | null
  ip?:       string
  socketId?: string
  details?:  Record<string, unknown>
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

// Severity defaults by event type
const SEVERITY_MAP: Partial<Record<SecurityEventType, SecurityEvent['severity']>> = {
  TX_DOUBLE_SPEND:              'CRITICAL',
  WITHDRAWAL_SIGNATURE_INVALID: 'CRITICAL',
  BANNED_USER_ATTEMPT:          'HIGH',
  BOT_TIMING_FLAG:              'HIGH',
  HIGH_WIN_RATE_FLAG:           'MEDIUM',
  HMAC_INVALID_SIGNATURE:       'HIGH',
  MULTI_ACCOUNT_IP:             'MEDIUM',
  RATE_LIMIT_WITHDRAWAL:        'MEDIUM',
  NONCE_REPLAYED:               'HIGH',
}

class SecurityLogger {
  private queue: SecurityEvent[] = []
  private flushing = false

  log(event: SecurityEvent) {
    const full = {
      ...event,
      severity: event.severity ?? SEVERITY_MAP[event.eventType] ?? 'LOW',
      timestamp: new Date().toISOString(),
    }

    // Always log to stdout immediately (for log aggregators)
    console.warn('[SECURITY]', JSON.stringify(full))

    // Queue DB write (non-blocking)
    this.queue.push(event)
    if (!this.flushing) this.flush()
  }

  private async flush() {
    if (this.queue.length === 0) return
    this.flushing = true

    const batch = this.queue.splice(0, 50)  // write max 50 at a time

    try {
      await supabaseAdmin.from('security_events').insert(
        batch.map(e => ({
          event_type: e.eventType,
          user_id:    e.userId   ?? null,
          ip:         e.ip       ?? null,
          socket_id:  e.socketId ?? null,
          details:    e.details  ?? null,
          severity:   e.severity ?? SEVERITY_MAP[e.eventType] ?? 'LOW',
        }))
      )
    } catch (err) {
      console.error('[SecurityLogger] DB flush error:', err)
      // Re-queue on failure (with cap to prevent unbounded growth)
      if (this.queue.length < 500) {
        this.queue.push(...batch)
      }
    }

    this.flushing = false
    if (this.queue.length > 0) setTimeout(() => this.flush(), 2000)
  }
}

export const securityLogger = new SecurityLogger()
