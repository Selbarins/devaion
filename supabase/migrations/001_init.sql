-- Devaion personal tracker
-- Single row storage for personal use (no auth)

create table if not exists public.tracker (
  id text primary key default 'personal',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- Allow full access for personal use (no RLS restrictions)
alter table public.tracker enable row level security;

create policy "personal full access"
  on public.tracker
  for all
  using (true)
  with check (true);

-- Optional: auto-update timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_tracker_updated
  before update on public.tracker
  for each row
  execute procedure public.handle_updated_at();
