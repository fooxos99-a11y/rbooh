create extension if not exists pgcrypto;

create table if not exists public.student_issue_actions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade,
  student_account_number text,
  circle_name text,
  issue_date date not null,
  action_type text not null check (action_type in ('warning', 'alert')),
  action_source text not null default 'manual' check (action_source in ('manual', 'automatic')),
  issue_summary text,
  issue_reasons jsonb not null default '[]'::jsonb,
  message text not null,
  sent_by_account_number text,
  sent_by_role text,
  sent_at timestamp with time zone not null default timezone('utc'::text, now()),
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint student_issue_actions_reasons_is_array check (jsonb_typeof(issue_reasons) = 'array')
);

create index if not exists idx_student_issue_actions_student_sent_at
  on public.student_issue_actions(student_id, sent_at desc);

create index if not exists idx_student_issue_actions_issue_date
  on public.student_issue_actions(issue_date desc);

create index if not exists idx_student_issue_actions_type
  on public.student_issue_actions(action_type, sent_at desc);

alter table public.student_issue_actions enable row level security;

drop policy if exists "Enable all operations for student issue actions" on public.student_issue_actions;

create policy "Enable all operations for student issue actions"
  on public.student_issue_actions
  for all
  using (true)
  with check (true);