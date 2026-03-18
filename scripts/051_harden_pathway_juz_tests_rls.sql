alter table public.pathway_student_juz_tests enable row level security;

drop policy if exists "Authenticated users can read pathway juz tests" on public.pathway_student_juz_tests;
drop policy if exists "Authenticated users can manage pathway juz tests" on public.pathway_student_juz_tests;

comment on table public.pathway_student_juz_tests is 'Pathway juz test results are managed through server-side admin APIs using the service role.';