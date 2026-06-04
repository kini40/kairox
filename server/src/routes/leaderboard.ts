import { Router } from 'express'
import { leaderboardService } from '../services/leaderboardService.js'

export const leaderboardRouter = Router()

leaderboardRouter.get('/:period', async (req, res) => {
  const period = req.params.period as 'daily' | 'weekly' | 'alltime'
  if (!['daily','weekly','alltime'].includes(period)) {
    return res.status(400).json({ error: 'Invalid period' })
  }
  try {
    const snapshot = await leaderboardService.fetch(period)
    res.json(snapshot)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

leaderboardRouter.get('/rival/:userId', async (req, res) => {
  const { userId } = req.params
  try {
    const { rivalService } = await import('../services/rivalService.js')
    const session = rivalService.getSession(userId)
    res.json({ rival: session?.rivalData ?? null })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})
