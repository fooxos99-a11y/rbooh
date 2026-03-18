create extension if not exists pgcrypto;

create table if not exists public.finance_invoices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  vendor text,
  invoice_number text,
  amount numeric(12, 2) not null default 0 check (amount >= 0),
  issue_date date not null,
  due_date date not null,
  status text not null default 'unpaid' check (status in ('paid', 'unpaid', 'overdue')),
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

create table if not exists public.finance_expenses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  beneficiary text,
  payment_method text,
  amount numeric(12, 2) not null default 0 check (amount >= 0),
  expense_date date not null,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

create table if not exists public.finance_incomes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source text,
  amount numeric(12, 2) not null default 0 check (amount >= 0),
  income_date date not null,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

create table if not exists public.finance_trips (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  trip_date date not null,
  costs jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint finance_trips_costs_is_array check (jsonb_typeof(costs) = 'array')
);

create index if not exists idx_finance_invoices_created_at
  on public.finance_invoices(created_at desc);

create index if not exists idx_finance_invoices_issue_date
  on public.finance_invoices(issue_date desc);

create index if not exists idx_finance_expenses_created_at
  on public.finance_expenses(created_at desc);

create index if not exists idx_finance_expenses_expense_date
  on public.finance_expenses(expense_date desc);

create index if not exists idx_finance_incomes_created_at
  on public.finance_incomes(created_at desc);

create index if not exists idx_finance_incomes_income_date
  on public.finance_incomes(income_date desc);

create index if not exists idx_finance_trips_created_at
  on public.finance_trips(created_at desc);

create index if not exists idx_finance_trips_trip_date
  on public.finance_trips(trip_date desc);

alter table public.finance_invoices enable row level security;
alter table public.finance_expenses enable row level security;
alter table public.finance_incomes enable row level security;
alter table public.finance_trips enable row level security;

drop policy if exists "Enable all operations for finance invoices" on public.finance_invoices;
drop policy if exists "Enable all operations for finance expenses" on public.finance_expenses;
drop policy if exists "Enable all operations for finance incomes" on public.finance_incomes;
drop policy if exists "Enable all operations for finance trips" on public.finance_trips;

create policy "Enable all operations for finance invoices"
  on public.finance_invoices
  for all
  using (true)
  with check (true);

create policy "Enable all operations for finance expenses"
  on public.finance_expenses
  for all
  using (true)
  with check (true);

create policy "Enable all operations for finance incomes"
  on public.finance_incomes
  for all
  using (true)
  with check (true);

create policy "Enable all operations for finance trips"
  on public.finance_trips
  for all
  using (true)
  with check (true);