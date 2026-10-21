-- Global Care OPD → IPD Monitor
-- Run this in Supabase SQL Editor (Dashboard → SQL → New query)

create extension if not exists "pgcrypto";

create table if not exists public.admissions (
  id uuid primary key default gen_random_uuid(),
  patient_name text not null default '',
  address text not null default '',
  old_new text not null default 'New',
  hho_cash text not null default 'HHO',
  source text not null default 'OPD',
  patient_type text not null default 'Private',
  chief_complaint text not null default '',
  diagnosis text not null default '',
  advised_for_admission text not null default 'No',
  opd_attending_physician text not null default '',
  actually_admitted text not null default 'No',
  date_of_admission date,
  time_of_admission time,
  admitting_physician text not null default '',
  remarks text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists admissions_created_at_idx on public.admissions (created_at desc);
create index if not exists admissions_date_idx on public.admissions (date_of_admission desc);

-- Phase 1 (demo): allow public read/write with anon key.
-- Tighten these policies when you enable Auth.
alter table public.admissions enable row level security;

drop policy if exists "admissions_select_all" on public.admissions;
drop policy if exists "admissions_insert_all" on public.admissions;
drop policy if exists "admissions_update_all" on public.admissions;
drop policy if exists "admissions_delete_all" on public.admissions;

create policy "admissions_select_all" on public.admissions for select using (true);
create policy "admissions_insert_all" on public.admissions for insert with check (true);
create policy "admissions_update_all" on public.admissions for update using (true);
create policy "admissions_delete_all" on public.admissions for delete using (true);
