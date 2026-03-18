alter table public.pathway_student_juz_tests
  add column if not exists level_number integer;

update public.pathway_student_juz_tests
set level_number = coalesce(level_number, last_level_number, 1)
where level_number is null;

alter table public.pathway_student_juz_tests
  alter column level_number set not null;

alter table public.pathway_student_juz_tests
  drop constraint if exists pathway_student_juz_tests_level_number_check;

alter table public.pathway_student_juz_tests
  add constraint pathway_student_juz_tests_level_number_check
  check (level_number > 0);

do $$
declare
  unique_constraint_name text;
begin
  select constraint_name
  into unique_constraint_name
  from information_schema.table_constraints
  where table_schema = 'public'
    and table_name = 'pathway_student_juz_tests'
    and constraint_type = 'UNIQUE'
    and constraint_name <> 'pathway_student_juz_tests_student_level_juz_key'
  order by case when constraint_name = 'pathway_student_juz_tests_student_id_juz_number_key' then 0 else 1 end
  limit 1;

  if unique_constraint_name is not null then
    execute format(
      'alter table public.pathway_student_juz_tests drop constraint if exists %I',
      unique_constraint_name
    );
  end if;
end $$;

alter table public.pathway_student_juz_tests
  add constraint pathway_student_juz_tests_student_level_juz_key
  unique (student_id, level_number, juz_number);

create index if not exists idx_pathway_student_juz_tests_student_level
  on public.pathway_student_juz_tests(student_id, level_number);

alter table public.pathway_student_juz_tests
  drop column if exists last_level_number;