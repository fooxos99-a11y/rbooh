ALTER TABLE public.enrollment_requests
  ADD COLUMN IF NOT EXISTS partial_juz_ranges jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.enrollment_requests
SET partial_juz_ranges = '[]'::jsonb
WHERE partial_juz_ranges IS NULL;