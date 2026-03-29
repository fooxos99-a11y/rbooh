DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_students_halaqah_points'
  ) THEN
    CREATE INDEX idx_students_halaqah_points
      ON public.students (halaqah, points DESC);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_students_account_number'
  ) THEN
    CREATE INDEX idx_students_account_number
      ON public.students (account_number);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_users_role_created_at'
  ) THEN
    CREATE INDEX idx_users_role_created_at
      ON public.users (role, created_at DESC);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_users_account_number'
  ) THEN
    CREATE INDEX idx_users_account_number
      ON public.users (account_number);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_student_plans_student_id_created_at'
  ) THEN
    CREATE INDEX idx_student_plans_student_id_created_at
      ON public.student_plans (student_id, created_at DESC);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_student_daily_reports_student_id_report_date'
  ) THEN
    CREATE INDEX idx_student_daily_reports_student_id_report_date
      ON public.student_daily_reports (student_id, report_date);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_teacher_attendance_attendance_date_check_in_time'
  ) THEN
    CREATE INDEX idx_teacher_attendance_attendance_date_check_in_time
      ON public.teacher_attendance (attendance_date, check_in_time DESC);
  END IF;
END
$$;