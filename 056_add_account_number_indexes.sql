create index if not exists idx_users_account_number
  on public.users(account_number);

create index if not exists idx_students_account_number
  on public.students(account_number);