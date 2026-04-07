CREATE TABLE IF NOT EXISTS public.student_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  halaqah TEXT NOT NULL,
  exam_portion_label TEXT NOT NULL,
  portion_type TEXT NOT NULL DEFAULT 'juz',
  portion_number INTEGER NOT NULL,
  juz_number INTEGER,
  exam_date DATE NOT NULL DEFAULT CURRENT_DATE,
  alerts_count INTEGER NOT NULL DEFAULT 0,
  mistakes_count INTEGER NOT NULL DEFAULT 0,
  final_score NUMERIC(6,2) NOT NULL,
  passed BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  tested_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT student_exams_juz_number_check CHECK (juz_number IS NULL OR (juz_number >= 1 AND juz_number <= 30)),
  CONSTRAINT student_exams_alerts_count_check CHECK (alerts_count >= 0),
  CONSTRAINT student_exams_mistakes_count_check CHECK (mistakes_count >= 0),
  CONSTRAINT student_exams_portion_type_check CHECK (portion_type IN ('juz', 'hizb'))
);

CREATE INDEX IF NOT EXISTS idx_student_exams_student_id ON public.student_exams(student_id);
CREATE INDEX IF NOT EXISTS idx_student_exams_halaqah ON public.student_exams(halaqah);
CREATE INDEX IF NOT EXISTS idx_student_exams_exam_date ON public.student_exams(exam_date DESC);
CREATE INDEX IF NOT EXISTS idx_student_exams_portion_idx ON public.student_exams(student_id, portion_type, portion_number);

CREATE OR REPLACE FUNCTION set_student_exams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_student_exams_updated_at ON public.student_exams;
CREATE TRIGGER trg_student_exams_updated_at
BEFORE UPDATE ON public.student_exams
FOR EACH ROW
EXECUTE FUNCTION set_student_exams_updated_at();