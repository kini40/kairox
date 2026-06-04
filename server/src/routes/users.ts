import { Router } from 'express'
import { supabaseAdmin } from '../config/supabase.js'

export const usersRouter = Router()

usersRouter.get('/:wallet', async (req, res) => {
  const { wallet } = req.params
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('wallet_address', wallet)
    .single()

  if (error) return res.status(404).json({ error: 'User not found' })
  res.json(data)
})

usersRouter.post('/', async (req, res) => {
  const { wallet_address, username } = req.body
  if (!wallet_address || !username) {
    return res.status(400).json({ error: 'wallet_address and username required' })
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .insert({ wallet_address, username, rank: 'ROOKIE', xp: 0,
              total_predictions: 0, correct_predictions: 0,
              streak_current: 0, streak_best: 0 })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

usersRouter.patch('/:id', async (req, res) => {
  const { id } = req.params
  const updates = req.body

  const { data, error } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})
