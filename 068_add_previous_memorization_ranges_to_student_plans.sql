ALTER TABLE public.student_plans
ADD COLUMN IF NOT EXISTS previous_memorization_ranges jsonb NOT NULL DEFAULT '[]'::jsonb;