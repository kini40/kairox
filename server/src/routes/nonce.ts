// Nonce issuance endpoint — clients call this before sensitive operations
import { Router } from 'express'
import { nonceStore } from '../security/nonceStore.js'
import { loginRateLimiter } from '../middleware/rateLimiter.js'

export const nonceRouter = Router()

// GET /api/nonce — issue a fresh nonce
// Rate-limited to prevent nonce farming
nonceRouter.get('/', loginRateLimiter, (req, res) => {
  const userId = req.query.userId as string | undefined
  const nonce  = nonceStore.issue(userId ?? null)
  res.json({ nonce, expiresIn: 30 })
})
