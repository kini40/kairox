import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseKey) {
  console.warn('[KAIROX] Supabase env vars not set — DB features disabled')
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '', {
  auth: { persistSession: true, autoRefreshToken: true },
})

// ─── Typed table helpers ──────────────────────────────────────────────────────

export type Tables = {
  users: {
    id: string
    wallet_address: string
    username: string
    rank: string
    total_predictions: number
    correct_predictions: number
    streak_current: number
    streak_best: number
    xp: number
    created_at: string
  }
  predictions: {
    id: string
    user_id: string
    round_id: string
    direction: 'UP' | 'DOWN'
    entry_price: number
    result_price: number | null
    outcome: 'WIN' | 'LOSS' | 'PUSH' | null
    sol_wagered: number
    sol_won: number
    is_degen: boolean
    is_ghost: boolean
    created_at: string
  }
  rounds: {
    id: string
    start_price: number
    end_price: number | null
    start_time: string
    end_time: string
    status: 'OPEN' | 'CLOSED' | 'SETTLED'
  }
  weekly_loss_pool: {
    id: string
    user_id: string
    week_start: string
    total_lost: number
    bonus_claimed: boolean
    bonus_amount: number
  }
  leaderboard: {
    id: string
    user_id: string
    period: 'daily' | 'weekly' | 'alltime'
    score: number
    rank: number
    updated_at: string
  }
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

export async function getUserByWallet(walletAddress: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('wallet_address', walletAddress)
    .single()
  return { data, error }
}

export async function createUser(walletAddress: string, username: string) {
  const { data, error } = await supabase
    .from('users')
    .insert({
      wallet_address: walletAddress,
      username,
      rank: 'ROOKIE',
      total_predictions: 0,
      correct_predictions: 0,
      streak_current: 0,
      streak_best: 0,
      xp: 0,
    })
    .select()
    .single()
  return { data, error }
}

export async function getLeaderboard(period: 'daily' | 'weekly' | 'alltime', limit = 50) {
  const { data, error } = await supabase
    .from('leaderboard')
    .select('*, users(username, rank, wallet_address)')
    .eq('period', period)
    .order('rank', { ascending: true })
    .limit(limit)
  return { data, error }
}

export async function savePrediction(prediction: Omit<Tables['predictions'], 'id'>) {
  const { data, error } = await supabase
    .from('predictions')
    .insert(prediction)
    .select()
    .single()
  return { data, error }
}

export async function getUserPredictionHistory(userId: string, limit = 20) {
  const { data, error } = await supabase
    .from('predictions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return { data, error }
}
