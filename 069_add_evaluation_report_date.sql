ALTER TABLE public.evaluations
  ADD COLUMN IF NOT EXISTS report_date DATE;

UPDATE public.evaluations AS evaluation
SET report_date = attendance.date
FROM public.attendance_records AS attendance
WHERE evaluation.attendance_record_id = attendance.id
  AND evaluation.report_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_evaluations_report_date
  ON public.evaluations (report_date);