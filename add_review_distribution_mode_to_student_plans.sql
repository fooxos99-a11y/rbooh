ALTER TABLE public.student_plans
ADD COLUMN IF NOT EXISTS review_distribution_mode TEXT;

UPDATE public.student_plans
SET review_distribution_mode = 'fixed'
WHERE review_distribution_mode IS NULL;

ALTER TABLE public.student_plans
ALTER COLUMN review_distribution_mode SET DEFAULT 'fixed';

ALTER TABLE public.student_plans
ALTER COLUMN review_distribution_mode SET NOT NULL;

ALTER TABLE public.student_plans
DROP CONSTRAINT IF EXISTS student_plans_review_distribution_mode_check;

ALTER TABLE public.student_plans
ADD CONSTRAINT student_plans_review_distribution_mode_check
CHECK (review_distribution_mode IN ('fixed', 'weekly'));
