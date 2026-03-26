-- Seasonal Care Reminders table
-- Run this SQL in the Supabase SQL Editor before deploying the frontend.

create table reminders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  month_key text not null,
  icon text default '',
  title text not null,
  detail text default '',
  plant text default '',
  source text default 'ai',
  done boolean default false,
  plant_hash text default '',
  created_at timestamptz default now()
);

-- RLS: users can only access their own reminders
alter table reminders enable row level security;

create policy "Users can read own reminders" on reminders for select using (auth.uid() = user_id);
create policy "Users can insert own reminders" on reminders for insert with check (auth.uid() = user_id);
create policy "Users can update own reminders" on reminders for update using (auth.uid() = user_id);
create policy "Users can delete own reminders" on reminders for delete using (auth.uid() = user_id);
