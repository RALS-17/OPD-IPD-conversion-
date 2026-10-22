-- Doctor accounts: physician_id + admin profile policies
-- Run in Supabase SQL Editor

alter table public.profiles
  add column if not exists physician_id uuid references public.physicians(id) on delete set null;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'staff', 'doctor'));

-- Avoid RLS recursion when checking admin
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_select_admin_or_own" on public.profiles;
drop policy if exists "profiles_update_admin_or_own" on public.profiles;
drop policy if exists "profiles_insert_own_or_admin" on public.profiles;

create policy "profiles_select_admin_or_own" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

create policy "profiles_update_admin_or_own" on public.profiles
  for update using (auth.uid() = id or public.is_admin());

create policy "profiles_insert_own_or_admin" on public.profiles
  for insert with check (auth.uid() = id or public.is_admin());

-- Link existing auth user (by email) to a physician — admin only
create or replace function public.link_doctor_by_email(
  p_email text,
  p_physician_id uuid,
  p_full_name text default ''
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
begin
  if not public.is_admin() then
    raise exception 'Only admins can link doctor accounts';
  end if;

  select id into v_uid
  from auth.users
  where lower(email) = lower(trim(p_email))
  limit 1;

  if v_uid is null then
    return false;
  end if;

  insert into public.profiles (id, full_name, role, physician_id)
  values (
    v_uid,
    coalesce(nullif(trim(p_full_name), ''), split_part(p_email, '@', 1)),
    'doctor',
    p_physician_id
  )
  on conflict (id) do update
    set role = 'doctor',
        physician_id = excluded.physician_id,
        full_name = coalesce(nullif(trim(p_full_name), ''), public.profiles.full_name);

  return true;
end;
$$;

grant execute on function public.link_doctor_by_email(text, uuid, text) to authenticated;
