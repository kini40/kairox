-- ============================================================
--  KAIROX – Complete Supabase Schema  (v2 – full game engine)
--  Run in Supabase SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── users ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.users (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address       TEXT UNIQUE,                  -- null for beta anon accounts
  username             TEXT UNIQUE NOT NULL,
  rank                 TEXT NOT NULL DEFAULT 'BRONZE'
                         CHECK (rank IN ('BRONZE','SILVER','GOLD','DIAMOND','ORACLE')),
  xp                   INTEGER NOT NULL DEFAULT 0,
  total_predictions    INTEGER NOT NULL DEFAULT 0,
  correct_predictions  INTEGER NOT NULL DEFAULT 0,
  streak_current       INTEGER NOT NULL DEFAULT 0,
  streak_best          INTEGER NOT NULL DEFAULT 0,

  -- Daily login streak
  login_streak         INTEGER NOT NULL DEFAULT 0,
  last_login_date      DATE,

  -- Ghost mode
  last_ghost_date      DATE,

  -- Balances
  beta_credits         NUMERIC(18,4) NOT NULL DEFAULT 1000,
  sol_balance          NUMERIC(18,9) NOT NULL DEFAULT 0,

  -- Weekly cashback
  total_sol_lost_week  NUMERIC(18,9) NOT NULL DEFAULT 0,
  total_credits_lost_week NUMERIC(18,4) NOT NULL DEFAULT 0,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_wallet    ON public.users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_xp        ON public.users(xp DESC);
CREATE INDEX IF NOT EXISTS idx_users_username  ON public.users(username);

-- ── rounds ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.rounds (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  start_price NUMERIC(18,6) NOT NULL,
  end_price   NUMERIC(18,6),
  start_time  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time    TIMESTAMPTZ NOT NULL,
  lock_time   TIMESTAMPTZ NOT NULL,
  status      TEXT NOT NULL DEFAULT 'OPEN'
                CHECK (status IN ('OPEN','LOCKED','CLOSED','SETTLING','SETTLED')),
  pool_up     NUMERIC(18,9) NOT NULL DEFAULT 0,
  pool_down   NUMERIC(18,9) NOT NULL DEFAULT 0,
  total_preds INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rounds_status     ON public.rounds(status);
CREATE INDEX IF NOT EXISTS idx_rounds_start_time ON public.rounds(start_time DESC);

-- ── predictions ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.predictions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  round_id      UUID NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  direction     TEXT NOT NULL CHECK (direction IN ('UP','DOWN')),
  entry_price   NUMERIC(18,6) NOT NULL,
  result_price  NUMERIC(18,6),
  outcome       TEXT CHECK (outcome IN ('WIN','LOSS','DRAW','NEAR_MISS')),
  sol_wagered   NUMERIC(18,9) NOT NULL DEFAULT 0,
  sol_won       NUMERIC(18,9) NOT NULL DEFAULT 0,
  multiplier    NUMERIC(8,4)  NOT NULL DEFAULT 0,
  streak_at_sub INTEGER      NOT NULL DEFAULT 0,   -- streak when submitted
  streak_bonus  NUMERIC(6,4) NOT NULL DEFAULT 0,   -- e.g. 0.10 for 3-streak
  xp_awarded    INTEGER      NOT NULL DEFAULT 0,
  is_degen      BOOLEAN      NOT NULL DEFAULT FALSE,
  is_ghost      BOOLEAN      NOT NULL DEFAULT FALSE,
  is_near_miss  BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, round_id)
);

CREATE INDEX IF NOT EXISTS idx_pred_user   ON public.predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_pred_round  ON public.predictions(round_id);
CREATE INDEX IF NOT EXISTS idx_pred_outcome ON public.predictions(outcome);
CREATE INDEX IF NOT EXISTS idx_pred_created ON public.predictions(created_at DESC);

-- ── weekly_loss_pool ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.weekly_loss_pool (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  week_start    DATE NOT NULL,
  total_lost    NUMERIC(18,9) NOT NULL DEFAULT 0,
  bonus_claimed BOOLEAN NOT NULL DEFAULT FALSE,
  bonus_amount  NUMERIC(18,9) NOT NULL DEFAULT 0,
  bonus_pct     NUMERIC(5,4)  NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_wlp_user_week ON public.weekly_loss_pool(user_id, week_start);

-- ── leaderboard ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.leaderboard (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  period     TEXT NOT NULL CHECK (period IN ('daily','weekly','alltime')),
  score      INTEGER NOT NULL DEFAULT 0,
  rank       INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, period)
);

CREATE INDEX IF NOT EXISTS idx_lb_period_rank ON public.leaderboard(period, rank);

-- ── chest_rewards ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.chest_rewards (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL,
  xp_awarded  INTEGER NOT NULL DEFAULT 0,
  credits     NUMERIC(18,4) NOT NULL DEFAULT 0,
  sol         NUMERIC(18,9) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chest_user ON public.chest_rewards(user_id);

-- ============================================================
--  Row Level Security
-- ============================================================

ALTER TABLE public.users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_loss_pool  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chest_rewards     ENABLE ROW LEVEL SECURITY;

-- Public reads
CREATE POLICY "public_read_rounds"       ON public.rounds      FOR SELECT USING (true);
CREATE POLICY "public_read_leaderboard"  ON public.leaderboard FOR SELECT USING (true);
-- Users (public read for usernames/ranks; wallet hidden by default)
CREATE POLICY "public_read_users"        ON public.users       FOR SELECT USING (true);

-- Service role full access (server uses service role key)
CREATE POLICY "service_all_predictions"   ON public.predictions      FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_all_users"         ON public.users            FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_all_rounds"        ON public.rounds           FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_all_wlp"           ON public.weekly_loss_pool FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_all_lb"            ON public.leaderboard      FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_all_chests"        ON public.chest_rewards    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
--  Stored Procedures (called by server via supabase.rpc)
-- ============================================================

-- update_user_prediction_stats: called after every settled prediction
CREATE OR REPLACE FUNCTION update_user_prediction_stats(
  p_user_id  UUID,
  p_won      BOOLEAN,
  p_xp       INTEGER,
  p_sol_won  NUMERIC,
  p_sol_lost NUMERIC,
  p_streak   INTEGER
) RETURNS void AS $$
DECLARE
  v_old_rank TEXT;
  v_new_xp   INTEGER;
  v_new_rank TEXT;
BEGIN
  SELECT rank INTO v_old_rank FROM public.users WHERE id = p_user_id;

  UPDATE public.users SET
    total_predictions   = total_predictions + 1,
    correct_predictions = correct_predictions + (CASE WHEN p_won THEN 1 ELSE 0 END),
    xp                  = xp + p_xp,
    sol_balance         = sol_balance + p_sol_won,
    total_sol_lost_week = total_sol_lost_week + p_sol_lost,
    streak_current      = p_streak,
    streak_best         = GREATEST(streak_best, p_streak),
    updated_at          = NOW()
  WHERE id = p_user_id
  RETURNING xp INTO v_new_xp;

  -- Recalculate rank
  v_new_rank := CASE
    WHEN v_new_xp >= 10000 THEN 'ORACLE'
    WHEN v_new_xp >= 4000  THEN 'DIAMOND'
    WHEN v_new_xp >= 1500  THEN 'GOLD'
    WHEN v_new_xp >= 500   THEN 'SILVER'
    ELSE 'BRONZE'
  END;

  IF v_new_rank <> v_old_rank THEN
    UPDATE public.users SET rank = v_new_rank WHERE id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- add_user_xp: generic XP award (chests, login bonus)
CREATE OR REPLACE FUNCTION add_user_xp(
  p_user_id UUID,
  p_xp      INTEGER
) RETURNS void AS $$
BEGIN
  UPDATE public.users SET
    xp         = xp + p_xp,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Re-rank
  UPDATE public.users SET
    rank = CASE
      WHEN xp >= 10000 THEN 'ORACLE'
      WHEN xp >= 4000  THEN 'DIAMOND'
      WHEN xp >= 1500  THEN 'GOLD'
      WHEN xp >= 500   THEN 'SILVER'
      ELSE 'BRONZE'
    END
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- record_daily_login: update login streak + award XP
CREATE OR REPLACE FUNCTION record_daily_login(
  p_user_id    UUID,
  p_new_streak INTEGER,
  p_xp_awarded INTEGER
) RETURNS void AS $$
BEGIN
  UPDATE public.users SET
    login_streak    = p_new_streak,
    last_login_date = CURRENT_DATE,
    xp              = xp + p_xp_awarded,
    updated_at      = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- credit_weekly_bonus: add SOL back to user balance
CREATE OR REPLACE FUNCTION credit_weekly_bonus(
  p_user_id UUID,
  p_amount  NUMERIC
) RETURNS void AS $$
BEGIN
  UPDATE public.users SET
    sol_balance = sol_balance + p_amount,
    updated_at  = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- reset_weekly_loss_totals: run every Monday after bonus calc
CREATE OR REPLACE FUNCTION reset_weekly_loss_totals()
RETURNS void AS $$
BEGIN
  UPDATE public.users SET
    total_sol_lost_week    = 0,
    total_credits_lost_week = 0,
    updated_at             = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- refresh_leaderboard: recalculate all period rankings
CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS void AS $$
BEGIN
  -- All-time
  INSERT INTO public.leaderboard (user_id, period, score, rank, updated_at)
  SELECT u.id, 'alltime',
    (u.correct_predictions * 100 + u.xp) AS score,
    ROW_NUMBER() OVER (ORDER BY (u.correct_predictions * 100 + u.xp) DESC),
    NOW()
  FROM public.users u
  ON CONFLICT (user_id, period)
  DO UPDATE SET score = EXCLUDED.score, rank = EXCLUDED.rank, updated_at = NOW();

  -- Weekly
  INSERT INTO public.leaderboard (user_id, period, score, rank, updated_at)
  SELECT p.user_id, 'weekly',
    COALESCE(SUM(CASE WHEN p.outcome = 'WIN' THEN 100 ELSE 0 END), 0) AS score,
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(CASE WHEN p.outcome = 'WIN' THEN 100 ELSE 0 END), 0) DESC),
    NOW()
  FROM public.predictions p
  WHERE p.created_at >= NOW() - INTERVAL '7 days'
  GROUP BY p.user_id
  ON CONFLICT (user_id, period)
  DO UPDATE SET score = EXCLUDED.score, rank = EXCLUDED.rank, updated_at = NOW();

  -- Daily
  INSERT INTO public.leaderboard (user_id, period, score, rank, updated_at)
  SELECT p.user_id, 'daily',
    COALESCE(SUM(CASE WHEN p.outcome = 'WIN' THEN 100 ELSE 0 END), 0) AS score,
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(CASE WHEN p.outcome = 'WIN' THEN 100 ELSE 0 END), 0) DESC),
    NOW()
  FROM public.predictions p
  WHERE p.created_at >= NOW() - INTERVAL '24 hours'
  GROUP BY p.user_id
  ON CONFLICT (user_id, period)
  DO UPDATE SET score = EXCLUDED.score, rank = EXCLUDED.rank, updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── withdrawal_requests ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT NOT NULL,
  amount_sol     NUMERIC(18,9) NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','instant','queued','failed','completed')),
  tx_signature   TEXT,
  request_id     TEXT UNIQUE NOT NULL,
  error_message  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_wd_wallet ON public.withdrawal_requests(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wd_status ON public.withdrawal_requests(status);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_all_withdrawals" ON public.withdrawal_requests
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
--  SECURITY TABLES  (v3 addition)
-- ============================================================

-- ── security_events ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.security_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type  TEXT NOT NULL,
  user_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ip          TEXT,
  socket_id   TEXT,
  severity    TEXT NOT NULL DEFAULT 'LOW'
                CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sec_event_type  ON public.security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_sec_severity    ON public.security_events(severity);
CREATE INDEX IF NOT EXISTS idx_sec_created     ON public.security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sec_user        ON public.security_events(user_id);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_all_security_events" ON public.security_events
  FOR ALL USING (auth.role() = 'service_role');

-- ── processed_transactions ────────────────────────────────────
-- Double-spend prevention: every processed tx signature stored here
CREATE TABLE IF NOT EXISTS public.processed_transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  signature       TEXT UNIQUE NOT NULL,
  user_id         UUID REFERENCES public.users(id) ON DELETE SET NULL,
  amount_lamports BIGINT NOT NULL,
  tx_type         TEXT NOT NULL CHECK (tx_type IN ('deposit','withdrawal','payout')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ptx_sig     ON public.processed_transactions(signature);
CREATE INDEX IF NOT EXISTS idx_ptx_user    ON public.processed_transactions(user_id);

ALTER TABLE public.processed_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_all_ptx" ON public.processed_transactions
  FOR ALL USING (auth.role() = 'service_role');

-- ── Add security columns to users ─────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS banned           BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ban_reason       TEXT,
  ADD COLUMN IF NOT EXISTS banned_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bot_flag         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS bot_flag_reason  TEXT,
  ADD COLUMN IF NOT EXISTS bot_flagged_at   TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_banned   ON public.users(banned) WHERE banned = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_bot_flag ON public.users(bot_flag) WHERE bot_flag = TRUE;
