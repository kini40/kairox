import { Router } from 'express'
import { roundManager } from '../services/roundManager.js'
import { supabaseAdmin } from '../config/supabase.js'

export const roundsRouter = Router()

roundsRouter.get('/current', (_req, res) => {
  if (!roundManager.currentRound) {
    return res.status(404).json({ error: 'No active round' })
  }
  res.json(roundManager.currentRound)
})

roundsRouter.get('/history', async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from('rounds')
    .select('*')
    .order('start_time', { ascending: false })
    .limit(20)

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})
