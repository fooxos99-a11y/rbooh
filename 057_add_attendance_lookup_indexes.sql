DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_attendance_records_date_halaqah'
  ) THEN
    CREATE INDEX idx_attendance_records_date_halaqah
      ON public.attendance_records (date, halaqah);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_attendance_records_created_at'
  ) THEN
    CREATE INDEX idx_attendance_records_created_at
      ON public.attendance_records (created_at);
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'attendance_records'
      AND column_name = 'updated_at'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_attendance_records_updated_at'
  ) THEN
    CREATE INDEX idx_attendance_records_updated_at
      ON public.attendance_records (updated_at);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_evaluations_attendance_record_id'
  ) THEN
    CREATE INDEX idx_evaluations_attendance_record_id
      ON public.evaluations (attendance_record_id);
  END IF;
END
$$;