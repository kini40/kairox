// ─────────────────────────────────────────────────────────────
//  KAIROX – Input Sanitization
//
//  ATTACK PREVENTED: XSS via stored usernames
//  All user-supplied strings displayed in the UI must be
//  sanitized before rendering. This is the client-side
//  companion to the server's sanitizeUsername() function.
// ─────────────────────────────────────────────────────────────

/**
 * Strip HTML/script injection from a username.
 * Mirrors server-side sanitizeUsername() in middleware/security.ts
 */
export function sanitizeUsername(raw: string): string {
  if (typeof raw !== 'string') return ''
  return raw
    .replace(/<[^>]*>/g, '')           // strip HTML tags
    .replace(/javascript:/gi, '')      // strip JS URIs
    .replace(/on\w+\s*=/gi, '')        // strip event handlers
    .replace(/[^a-zA-Z0-9_\-\.]/g, '') // allow only safe chars
    .slice(0, 24)
    .trim()
}

/**
 * Safely render a string as text (escape HTML entities).
 * Use this whenever rendering user data in dangerouslySetInnerHTML
 * contexts — though preferring text nodes is always safer.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Validate a Solana public key format (base58, 32-44 chars).
 * Never trust client-supplied pubkeys without validation.
 */
export function isValidSolanaAddress(addr: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr)
}

/**
 * Clamp a wager amount to safe bounds — client-side pre-check
 * before sending to server (server re-validates regardless).
 */
export function clampWager(amount: number, min = 0.001, max = 10): number {
  if (!isFinite(amount) || isNaN(amount)) return min
  return Math.max(min, Math.min(max, amount))
}
