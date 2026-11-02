-- Switch from single 'personal' row to per-user rows
alter table public.tracker
  add column if not exists user_id text;

-- Make user_id the unique key (one row per user)
create unique index if not exists tracker_user_id_idx on public.tracker (user_id);

-- Optional: clean old personal row if you want
-- delete from public.tracker where id = 'personal';
