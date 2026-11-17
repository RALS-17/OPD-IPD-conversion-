-- Role rules enforced by the database (run once in Supabase -> SQL Editor)
--
--   admin  : everything
--   staff  : (admitting) read all, ADD + EDIT admissions, no delete
--   doctor : read ONLY their own patients, no add / edit / delete
--
-- NOTE: this replaces ALL existing policies on public.admissions and
-- public.physician_daily_entries with the rules below.

-- Helper functions (security definer so policies don't depend on profiles/physicians RLS)
create or replace function public.app_role()
returns text language sql stable security definer set search_path = public as $$
  select role::text from public.profiles where id = auth.uid()
$$;

create or replace function public.app_physician_name()
returns text language sql stable security definer set search_path = public as $$
  select ph.name from public.profiles p
  join public.physicians ph on ph.id = p.physician_id
  where p.id = auth.uid()
$$;

revoke all on function public.app_role() from public;
revoke all on function public.app_physician_name() from public;
grant execute on function public.app_role() to authenticated;
grant execute on function public.app_physician_name() to authenticated;

-- ===== admissions =====
do $$
declare r record;
begin
  for r in select policyname from pg_policies
           where schemaname = 'public' and tablename = 'admissions' loop
    execute format('drop policy %I on public.admissions', r.policyname);
  end loop;
end $$;

alter table public.admissions enable row level security;

create policy admissions_select on public.admissions for select to authenticated
  using (
    public.app_role() in ('admin', 'staff')
    or (
      public.app_role() = 'doctor'
      and coalesce(btrim(public.app_physician_name()), '') <> ''
      and btrim(opd_attending_physician) = btrim(public.app_physician_name())
    )
  );

create policy admissions_insert on public.admissions for insert to authenticated
  with check (public.app_role() in ('admin', 'staff'));

create policy admissions_update on public.admissions for update to authenticated
  using (public.app_role() in ('admin', 'staff'))
  with check (public.app_role() in ('admin', 'staff'));

create policy admissions_delete on public.admissions for delete to authenticated
  using (public.app_role() = 'admin');

-- ===== physician_daily_entries =====
do $$
declare r record;
begin
  for r in select policyname from pg_policies
           where schemaname = 'public' and tablename = 'physician_daily_entries' loop
    execute format('drop policy %I on public.physician_daily_entries', r.policyname);
  end loop;
end $$;

alter table public.physician_daily_entries enable row level security;

create policy daily_entries_select on public.physician_daily_entries for select to authenticated
  using (
    public.app_role() in ('admin', 'staff')
    or (
      public.app_role() = 'doctor'
      and coalesce(btrim(public.app_physician_name()), '') <> ''
      and btrim(physician_name) = btrim(public.app_physician_name())
    )
  );

create policy daily_entries_write on public.physician_daily_entries for all to authenticated
  using (public.app_role() = 'admin')
  with check (public.app_role() = 'admin');
