CREATE TABLE IF NOT EXISTS public.exam_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  halaqah TEXT NOT NULL,
  exam_portion_label TEXT NOT NULL,
  portion_type TEXT NOT NULL DEFAULT 'juz',
  portion_number INTEGER NOT NULL,
  juz_number INTEGER NOT NULL,
  exam_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notification_sent_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  completed_exam_id UUID NULL REFERENCES public.student_exams(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ NULL,
  cancelled_at TIMESTAMPTZ NULL,
  scheduled_by_name TEXT NULL,
  scheduled_by_role TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT exam_schedules_juz_number_check CHECK (juz_number >= 1 AND juz_number <= 30),
  CONSTRAINT exam_schedules_status_check CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  CONSTRAINT exam_schedules_portion_type_check CHECK (portion_type IN ('juz', 'hizb'))
);

CREATE INDEX IF NOT EXISTS exam_schedules_student_id_idx ON public.exam_schedules(student_id);
CREATE INDEX IF NOT EXISTS exam_schedules_halaqah_idx ON public.exam_schedules(halaqah);
CREATE INDEX IF NOT EXISTS exam_schedules_status_idx ON public.exam_schedules(status);
CREATE INDEX IF NOT EXISTS exam_schedules_exam_date_idx ON public.exam_schedules(exam_date);
CREATE INDEX IF NOT EXISTS exam_schedules_portion_idx ON public.exam_schedules(student_id, portion_type, portion_number, status);

CREATE OR REPLACE FUNCTION set_exam_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_exam_schedules_updated_at ON public.exam_schedules;
CREATE TRIGGER trg_exam_schedules_updated_at
BEFORE UPDATE ON public.exam_schedules
FOR EACH ROW
EXECUTE FUNCTION set_exam_schedules_updated_at();