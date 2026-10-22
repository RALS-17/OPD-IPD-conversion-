create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  entity text not null default 'admission',
  entity_id text not null default '',
  summary text not null default '',
  actor_name text not null default '',
  actor_email text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;

drop policy if exists "audit_select_auth" on public.audit_logs;
drop policy if exists "audit_insert_auth" on public.audit_logs;

create policy "audit_select_auth" on public.audit_logs for select to authenticated using (true);
create policy "audit_insert_auth" on public.audit_logs for insert to authenticated with check (true);
