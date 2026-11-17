-- =====================================================================
-- Row Level Security for OPD → IPD Monitor
-- Run in Supabase → SQL Editor.  READ THE NOTES AT THE BOTTOM FIRST.
--
-- Rules enforced in the DATABASE (not just in the UI):
--   admin  : everything
--   staff  : read all admissions; add + edit admissions; NO delete; read all entries
--   doctor : read ONLY own admissions (opd_attending_physician = their linked physician)
--            and own daily entries; no writes
--   unknown role / no profile → treated like doctor with no physician → sees nothing
-- =====================================================================

-- ---------- 1. helper functions (SECURITY DEFINER so policies never recurse) ----------
create or replace function public.app_role()
returns text
language sql stable security definer
set search_path = public
as $$
  select coalesce((select role::text from public.profiles where id = auth.uid()), 'doctor');
$$;

create or replace function public.app_physician_name()
returns text
language sql stable security definer
set search_path = public
as $$
  select ph.name
  from public.profiles p
  join public.physicians ph on ph.id = p.physician_id
  where p.id = auth.uid();
$$;

grant execute on function public.app_role() to authenticated;
grant execute on function public.app_physician_name() to authenticated;

-- ---------- 2. remove ALL existing policies on these tables ----------
-- (Policies are OR-ed together: one old "allow all" policy would silently defeat the new ones.)
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('admissions','physicians','profiles','physician_daily_entries','audit_logs')
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

alter table public.admissions               enable row level security;
alter table public.physicians               enable row level security;
alter table public.profiles                 enable row level security;
alter table public.physician_daily_entries  enable row level security;
alter table public.audit_logs               enable row level security;

-- ---------- 3. admissions ----------
create policy admissions_select on public.admissions
  for select to authenticated
  using (
    public.app_role() in ('admin','staff')
    or opd_attending_physician = public.app_physician_name()
  );

create policy admissions_insert on public.admissions
  for insert to authenticated
  with check (public.app_role() in ('admin','staff'));

create policy admissions_update on public.admissions
  for update to authenticated
  using (public.app_role() in ('admin','staff'))
  with check (public.app_role() in ('admin','staff'));

create policy admissions_delete on public.admissions
  for delete to authenticated
  using (public.app_role() = 'admin');

-- ---------- 4. physicians (roster) ----------
-- Everyone signed in can read the roster (names/departments are needed for filters & lookups).
create policy physicians_select on public.physicians
  for select to authenticated using (true);

create policy physicians_write on public.physicians
  for all to authenticated
  using (public.app_role() = 'admin')
  with check (public.app_role() = 'admin');

-- ---------- 5. profiles ----------
-- Read your own profile; admins read all. Only admins can write (nobody can promote themselves).
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.app_role() = 'admin');

create policy profiles_write on public.profiles
  for all to authenticated
  using (public.app_role() = 'admin')
  with check (public.app_role() = 'admin');

-- ---------- 6. physician_daily_entries ----------
create policy entries_select on public.physician_daily_entries
  for select to authenticated
  using (
    public.app_role() in ('admin','staff')
    or physician_name = public.app_physician_name()
  );

create policy entries_write on public.physician_daily_entries
  for all to authenticated
  using (public.app_role() = 'admin')
  with check (public.app_role() = 'admin');

-- ---------- 7. audit_logs ----------
-- Every signed-in user's actions are logged (insert); only admins can read the log.
create policy audit_insert on public.audit_logs
  for insert to authenticated with check (true);

create policy audit_select on public.audit_logs
  for select to authenticated
  using (public.app_role() = 'admin');

-- =====================================================================
-- NOTES
-- 1. Test on a COPY / staging project first. Then log in as admin, staff and doctor and check:
--      staff : can add/edit an admission, delete button fails, sees all admissions
--      doctor: sees only own admissions + own entries, cannot write
--      admin : everything, incl. Physicians page, daily entries, Settings audit log
-- 2. Emergency undo for one table:   alter table public.<table> disable row level security;
-- 3. Existing SECURITY DEFINER functions admin_confirm_doctor() and link_doctor_by_email()
--    (from doctor_auto_confirm.sql / doctor_accounts.sql) bypass RLS. Make sure each one checks
--    inside the function that the caller is an admin:
--        if public.app_role() <> 'admin' then raise exception 'not allowed'; end if;
-- 4. If your "new user" trigger copies role from signUp metadata (raw_user_meta_data->>'role'),
--    anyone could sign up as 'admin' from the browser. Make the trigger always create role='doctor'
--    (or disable public sign-ups in Authentication → Providers → Email).
-- 5. physician_opd_totals is no longer used by the app (opdConsultOverrides.ts was removed).
--    You may keep or drop that table; it is not touched here.
-- =====================================================================
