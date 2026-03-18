create table if not exists public.pathway_student_juz_tests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  level_number integer not null check (level_number > 0),
  juz_number integer not null check (juz_number between 1 and 30),
  status text not null check (status in ('pass', 'fail')),
  halaqah text,
  tested_by_name text,
  notes text,
  tested_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(student_id, level_number, juz_number)
);

create index if not exists idx_pathway_student_juz_tests_student
  on public.pathway_student_juz_tests(student_id);

create index if not exists idx_pathway_student_juz_tests_student_level
  on public.pathway_student_juz_tests(student_id, level_number);

create index if not exists idx_pathway_student_juz_tests_halaqah
  on public.pathway_student_juz_tests(halaqah);

alter table public.pathway_student_juz_tests enable row level security;

comment on table public.pathway_student_juz_tests is 'Pathway juz test results are managed through server-side admin APIs using the service role.';