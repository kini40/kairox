// ─────────────────────────────────────────────────────────────
//  KAIROX Server – Entry Point (security-hardened)
// ─────────────────────────────────────────────────────────────

import 'dotenv/config'
import express           from 'express'
import { createServer }  from 'http'
import { Server as SocketIOServer } from 'socket.io'

import { priceRouter }        from './routes/price.js'
import { roundsRouter }       from './routes/rounds.js'
import { usersRouter }        from './routes/users.js'
import { leaderboardRouter }  from './routes/leaderboard.js'
import { predictionsRouter }  from './routes/predictions.js'
import { walletRouter }       from './routes/wallet.js'
import { adminRouter }        from './routes/admin.js'
import { nonceRouter }        from './routes/nonce.js'
import { errorMiddleware }    from './middleware/error.js'
import { rateLimiter }        from './middleware/rateLimiter.js'
import { corsMiddleware, securityHeaders } from './middleware/security.js'
import { registerSocketHandlers } from './services/socketHandlers.js'
import { roundManager }           from './services/roundManager.js'
import { priceFeedService }       from './services/priceFeedService.js'
import { weeklyLossBonusService } from './services/weeklyLossBonus.js'
import { leaderboardService }     from './services/leaderboardService.js'
import { rivalService }           from './services/rivalService.js'
import { notificationService }    from './services/notificationService.js'
import { feedService }            from './services/feedService.js'

const PORT        = parseInt(process.env.PORT ?? '4000', 10)
const CLIENT_URLS = (process.env.CLIENT_URL ?? 'http://localhost:5173').split(',').map(s => s.trim())

const app    = express()
const server = createServer(app)

// ── Socket.IO ────────────────────────────────────────────────
const io = new SocketIOServer(server, {
  cors: {
    origin:      [...CLIENT_URLS, 'http://localhost:5173', 'http://localhost:4173'],
    methods:     ['GET', 'POST'],
    credentials: true,
  },
  transports:         ['websocket', 'polling'],
  pingTimeout:        20000,
  pingInterval:       10000,
  maxHttpBufferSize:  1e5,   // 100KB max socket message
})

// ── Security middleware (applied first) ───────────────────────
app.use(corsMiddleware())
app.use(securityHeaders())
app.use(express.json({ limit: '256kb' }))
app.use(rateLimiter)

// ── Routes ────────────────────────────────────────────────────
app.use('/api/nonce',        nonceRouter)
app.use('/api/price',        priceRouter)
app.use('/api/rounds',       roundsRouter)
app.use('/api/users',        usersRouter)
app.use('/api/leaderboard',  leaderboardRouter)
app.use('/api/predictions',  predictionsRouter)
app.use('/api/wallet',       walletRouter)
app.use('/api/admin',        adminRouter)

app.get('/api/health', (_req, res) => {
  res.json({
    status:    'ok',
    timestamp: new Date().toISOString(),
    network:   process.env.SOLANA_NETWORK ?? 'devnet',
    round:     roundManager.currentRound?.id ?? null,
    price:     priceFeedService.lastPrice,
    uptime:    Math.floor(process.uptime()),
  })
})

app.use(errorMiddleware)

// ── Socket handlers ───────────────────────────────────────────
registerSocketHandlers(io)

// ── Services ──────────────────────────────────────────────────
priceFeedService.start(io)
roundManager.start(io)
weeklyLossBonusService.start(io)
leaderboardService.start(io)
rivalService.start(io)
notificationService.start(io)
feedService.start(io)

// ── Listen ────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\n🔒 KAIROX Server  http://localhost:${PORT}`)
  console.log(`   NODE_ENV: ${process.env.NODE_ENV ?? 'development'}`)
  console.log(`   Network:  ${process.env.SOLANA_NETWORK ?? 'devnet'}`)
  console.log(`   CORS:     ${CLIENT_URLS.join(', ')}\n`)
})

export { io }
