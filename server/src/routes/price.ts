import { Router } from 'express'
import { priceFeedService } from '../services/priceFeedService.js'

export const priceRouter = Router()

priceRouter.get('/current', (_req, res) => {
  res.json({ price: priceFeedService.lastPrice, timestamp: Date.now() })
})
