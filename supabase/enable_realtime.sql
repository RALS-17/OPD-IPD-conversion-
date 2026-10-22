-- Enable Realtime for live dashboard (run once in SQL Editor)
-- Dashboard → Database → Publications, or:

alter publication supabase_realtime add table public.admissions;
alter publication supabase_realtime add table public.physicians;

-- Ignore errors if already added.
