// ─────────────────────────────────────────────────────────────
//  KAIROX – Client-side HMAC  (Web Crypto API, no Node deps)
// ─────────────────────────────────────────────────────────────

// Compute HMAC-SHA256 using the browser's SubtleCrypto API.
// Must match the server's computeHmac() function exactly.

export async function computeHmacClient(
  method:    string,
  path:      string,
  timestamp: string,
  body:      string,
  secret:    string,
): Promise<string> {
  const encoder   = new TextEncoder()

  // SHA256 the body first
  const bodyDigest = await crypto.subtle.digest('SHA-256', encoder.encode(body))
  const bodyHash   = Array.from(new Uint8Array(bodyDigest))
    .map(b => b.toString(16).padStart(2, '0')).join('')

  const message = `${method.toUpperCase()}:${path}:${timestamp}:${bodyHash}`

  // Import key
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  // Sign
  const sig    = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0')).join('')
}
