alter table public.student_daily_reports enable row level security;

drop policy if exists "Enable all operations for student daily reports" on public.student_daily_reports;

comment on table public.student_daily_reports is 'Student daily reports are managed through server-side APIs after application-level authorization checks.';