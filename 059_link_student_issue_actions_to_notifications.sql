DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'student_issue_actions'
      AND column_name = 'notification_id'
  ) THEN
    ALTER TABLE public.student_issue_actions
      ADD COLUMN notification_id uuid;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'student_issue_actions_notification_id_fkey'
  ) THEN
    ALTER TABLE public.student_issue_actions
      ADD CONSTRAINT student_issue_actions_notification_id_fkey
      FOREIGN KEY (notification_id)
      REFERENCES public.notifications(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_student_issue_actions_notification_id'
  ) THEN
    CREATE INDEX idx_student_issue_actions_notification_id
      ON public.student_issue_actions (notification_id);
  END IF;
END
$$;
