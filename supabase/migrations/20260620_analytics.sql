-- Internal analytics: custom events table
create table if not exists custom_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  event text not null,
  properties jsonb,
  created_at timestamptz default now()
);

alter table custom_events enable row level security;

create policy "Users can insert their own events"
  on custom_events for insert to authenticated
  with check (user_id = auth.uid() or user_id is null);
