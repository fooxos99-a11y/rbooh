DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'student_daily_reports'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'student_daily_reports'
        AND column_name = 'plan_session_number'
    ) THEN
      ALTER TABLE public.student_daily_reports
        ADD COLUMN plan_session_number INTEGER;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'student_daily_reports'
        AND column_name = 'plan_session_number'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_student_daily_reports_student_session
        ON public.student_daily_reports(student_id, plan_session_number);
    END IF;
  END IF;
END
$$;