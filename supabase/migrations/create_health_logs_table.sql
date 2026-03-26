-- Health Logs table for plant health tracking
-- Run this SQL in the Supabase SQL Editor.

create table health_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  inventory_id uuid references inventory(id) on delete cascade not null,
  health text not null,
  flowering text,
  notes text default '',
  image_url text,
  diagnosis jsonb,
  logged_at timestamptz default now()
);

alter table health_logs enable row level security;

create policy "Users can read own health logs" on health_logs for select using (auth.uid() = user_id);
create policy "Users can insert own health logs" on health_logs for insert with check (auth.uid() = user_id);
create policy "Users can update own health logs" on health_logs for update using (auth.uid() = user_id);
create policy "Users can delete own health logs" on health_logs for delete using (auth.uid() = user_id);
