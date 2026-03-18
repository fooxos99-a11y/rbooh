alter table public.pathway_levels
  add column if not exists student_id uuid references public.students(id) on delete cascade;

create index if not exists idx_pathway_levels_student_id
  on public.pathway_levels(student_id);

alter table public.pathway_levels
  drop constraint if exists pathway_levels_level_number_halaqah_key;

alter table public.pathway_levels
  drop constraint if exists pathway_levels_level_number_key;

create unique index if not exists idx_pathway_levels_student_level_unique
  on public.pathway_levels(student_id, level_number)
  where student_id is not null;
