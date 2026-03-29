ALTER TABLE public.student_daily_reports
  ADD COLUMN IF NOT EXISTS memorization_pages_count numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tikrar_pages_count numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_pages_count numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS linking_pages_count numeric NOT NULL DEFAULT 0;

UPDATE public.student_daily_reports
SET
  memorization_pages_count = COALESCE(memorization_pages_count, 0),
  tikrar_pages_count = COALESCE(tikrar_pages_count, 0),
  review_pages_count = COALESCE(review_pages_count, 0),
  linking_pages_count = COALESCE(linking_pages_count, 0)
WHERE memorization_pages_count IS NULL
   OR tikrar_pages_count IS NULL
   OR review_pages_count IS NULL
   OR linking_pages_count IS NULL;
