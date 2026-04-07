DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'circle_name'
  ) THEN
    UPDATE public.users
    SET halaqah = NULLIF(regexp_replace(btrim(COALESCE(halaqah, circle_name)), '\s+', ' ', 'g'), '')
    WHERE role IN ('teacher', 'deputy_teacher')
      AND COALESCE(halaqah, circle_name) IS NOT NULL
      AND COALESCE(halaqah, '') <> regexp_replace(btrim(COALESCE(halaqah, circle_name)), '\s+', ' ', 'g');
  ELSE
    UPDATE public.users
    SET halaqah = NULLIF(regexp_replace(btrim(halaqah), '\s+', ' ', 'g'), '')
    WHERE role IN ('teacher', 'deputy_teacher')
      AND halaqah IS NOT NULL
      AND halaqah <> regexp_replace(btrim(halaqah), '\s+', ' ', 'g');
  END IF;
END $$;

UPDATE public.students
SET halaqah = NULLIF(regexp_replace(btrim(halaqah), '\s+', ' ', 'g'), '')
WHERE halaqah IS NOT NULL
  AND halaqah <> regexp_replace(btrim(halaqah), '\s+', ' ', 'g');

UPDATE public.attendance_records
SET halaqah = NULLIF(regexp_replace(btrim(halaqah), '\s+', ' ', 'g'), '')
WHERE halaqah IS NOT NULL
  AND halaqah <> regexp_replace(btrim(halaqah), '\s+', ' ', 'g');