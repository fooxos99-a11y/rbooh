ALTER TABLE public.student_plans
  ADD COLUMN IF NOT EXISTS review_start_mode text NOT NULL DEFAULT 'auto';

UPDATE public.student_plans
SET review_start_mode = 'auto'
WHERE review_start_mode IS NULL;

ALTER TABLE public.student_plans
  DROP CONSTRAINT IF EXISTS student_plans_review_start_mode_check;

ALTER TABLE public.student_plans
  ADD CONSTRAINT student_plans_review_start_mode_check
  CHECK (review_start_mode IN ('auto', 'oldest', 'newest'));
