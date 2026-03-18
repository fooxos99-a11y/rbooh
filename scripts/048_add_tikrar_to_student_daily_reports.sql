ALTER TABLE public.student_daily_reports
  ADD COLUMN IF NOT EXISTS tikrar_done BOOLEAN NOT NULL DEFAULT false;