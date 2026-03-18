ALTER TABLE public.student_daily_reports
  ADD COLUMN IF NOT EXISTS memorization_reward_claimed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tikrar_reward_claimed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_reward_claimed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS linking_reward_claimed BOOLEAN NOT NULL DEFAULT false;