-- Lets an ADMIN confirm a newly created doctor login immediately (no email step).
-- Run once in Supabase -> SQL Editor.
--
-- Safe by design: only admins can call it, and it only confirms accounts that were
-- created by the app as doctors (role = 'doctor' in the sign-up data).

create or replace function public.admin_confirm_doctor(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role::text = 'admin'
  ) then
    raise exception 'Only an administrator can confirm accounts';
  end if;

  update auth.users
     set email_confirmed_at = coalesce(email_confirmed_at, now())
   where id = p_user_id
     and raw_user_meta_data ->> 'role' = 'doctor';
end;
$$;

revoke all on function public.admin_confirm_doctor(uuid) from public;
grant execute on function public.admin_confirm_doctor(uuid) to authenticated;
