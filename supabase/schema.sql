-- Cloky: Supabase schema for multi-user pay calculator
-- Run this in Supabase Dashboard → SQL Editor (or via Supabase CLI)

-- Shifts: one row per shift, scoped by user
create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  clock_in text not null,
  clock_out text not null,
  break_min integer not null default 0,
  total_hours numeric not null,
  created_at timestamptz not null default now()
);

-- Index for fast per-user queries and real-time filter
create index if not exists shifts_user_id_idx on public.shifts (user_id);
create index if not exists shifts_user_date_idx on public.shifts (user_id, date desc);

-- User settings: hourly rate (and future prefs) per user
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  hourly_rate numeric not null default 0,
  updated_at timestamptz not null default now()
);

-- RLS: enable row level security
alter table public.shifts enable row level security;
alter table public.user_settings enable row level security;

-- Shifts: user can only see/insert/update/delete their own rows
create policy "Users can manage own shifts"
  on public.shifts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- User settings: user can only see/insert/update their own row
create policy "Users can manage own settings"
  on public.user_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Real-time: allow users to subscribe to their own shifts (for multi-device sync)
alter publication supabase_realtime add table public.shifts;
-- Required so delete events are broadcast with row data
alter table public.shifts replica identity full;

-- Optional: trigger to keep updated_at on user_settings
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger user_settings_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();
