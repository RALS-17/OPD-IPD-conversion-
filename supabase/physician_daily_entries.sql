-- Daily OPD entries per physician (run once in Supabase → SQL Editor)

create table if not exists public.physician_daily_entries (
  id            uuid primary key default gen_random_uuid(),
  physician_name text not null,
  entry_date     date not null,
  total_opd      integer not null default 0 check (total_opd     >= 0),
  private_hmo    integer not null default 0 check (private_hmo   >= 0),
  private_cash   integer not null default 0 check (private_cash  >= 0),
  walkin_hmo     integer not null default 0 check (walkin_hmo    >= 0),
  walkin_cash    integer not null default 0 check (walkin_cash   >= 0),
  updated_at     timestamptz not null default now(),
  -- one record per doctor per day: saving the same day again replaces it
  constraint physician_daily_entries_unique unique (physician_name, entry_date),
  -- Total OPD must equal the four-way split
  constraint physician_daily_entries_sum_check
    check (total_opd = private_hmo + private_cash + walkin_hmo + walkin_cash)
);

create index if not exists physician_daily_entries_date_idx
  on public.physician_daily_entries (entry_date);

alter table public.physician_daily_entries enable row level security;

-- Everyone signed in can read (doctors are limited to their own rows in the app)
drop policy if exists "daily_entries_read" on public.physician_daily_entries;
create policy "daily_entries_read"
  on public.physician_daily_entries for select
  to authenticated
  using (true);

-- Only admin can add / change / delete (roles_security.sql refines these rules)
drop policy if exists "daily_entries_write" on public.physician_daily_entries;
create policy "daily_entries_write"
  on public.physician_daily_entries for all
  to authenticated
  using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.role = 'admin')
  );

-- Live refresh on other devices (ignore the error if it is already added)
alter publication supabase_realtime add table public.physician_daily_entries;
