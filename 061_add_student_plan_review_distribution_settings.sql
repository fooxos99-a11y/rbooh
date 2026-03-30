ALTER TABLE public.student_plans
ADD COLUMN IF NOT EXISTS review_distribution_days INTEGER;

ALTER TABLE public.student_plans
ADD COLUMN IF NOT EXISTS review_minimum_pages NUMERIC(6,2);

UPDATE public.student_plans
SET review_distribution_days = 7
WHERE review_distribution_days IS NULL;

UPDATE public.student_plans
SET review_minimum_pages = 10
WHERE review_minimum_pages IS NULL;

ALTER TABLE public.student_plans
ALTER COLUMN review_distribution_days SET DEFAULT 7;

ALTER TABLE public.student_plans
ALTER COLUMN review_distribution_days SET NOT NULL;

ALTER TABLE public.student_plans
ALTER COLUMN review_minimum_pages SET DEFAULT 10;

ALTER TABLE public.student_plans
ALTER COLUMN review_minimum_pages SET NOT NULL;

ALTER TABLE public.student_plans
DROP CONSTRAINT IF EXISTS student_plans_review_distribution_days_check;

ALTER TABLE public.student_plans
ADD CONSTRAINT student_plans_review_distribution_days_check
CHECK (review_distribution_days > 0);

ALTER TABLE public.student_plans
DROP CONSTRAINT IF EXISTS student_plans_review_minimum_pages_check;

ALTER TABLE public.student_plans
ADD CONSTRAINT student_plans_review_minimum_pages_check
CHECK (review_minimum_pages > 0);