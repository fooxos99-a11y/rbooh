CREATE TABLE IF NOT EXISTS public.student_daily_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  plan_session_number INTEGER,
  memorization_done BOOLEAN NOT NULL DEFAULT false,
  tikrar_done BOOLEAN NOT NULL DEFAULT false,
  review_done BOOLEAN NOT NULL DEFAULT false,
  linking_done BOOLEAN NOT NULL DEFAULT false,
  memorization_reward_claimed BOOLEAN NOT NULL DEFAULT false,
  tikrar_reward_claimed BOOLEAN NOT NULL DEFAULT false,
  review_reward_claimed BOOLEAN NOT NULL DEFAULT false,
  linking_reward_claimed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(student_id, report_date)
);

CREATE INDEX IF NOT EXISTS idx_student_daily_reports_student_date
  ON public.student_daily_reports(student_id, report_date DESC);

CREATE INDEX IF NOT EXISTS idx_student_daily_reports_student_session
  ON public.student_daily_reports(student_id, plan_session_number);

ALTER TABLE public.student_daily_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all operations for student daily reports" ON public.student_daily_reports;

CREATE POLICY "Enable all operations for student daily reports"
  ON public.student_daily_reports
  FOR ALL
  USING (true)
  WITH CHECK (true);