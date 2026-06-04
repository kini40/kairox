import { createClient } from '@supabase/supabase-js'

const url     = process.env.SUPABASE_URL            ?? ''
const svcKey  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

if (!url || !svcKey) {
  console.warn('[Supabase] Server env vars not set — DB operations will fail gracefully')
}

export const supabaseAdmin = createClient(url, svcKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
