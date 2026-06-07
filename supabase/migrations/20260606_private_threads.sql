-- Private 1-to-1 DM threads (outside of any match)
create table if not exists public.private_threads (
  id          uuid primary key default gen_random_uuid(),
  user1_id    uuid not null references public.profiles(id) on delete cascade,
  user2_id    uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint private_threads_ordered check (user1_id < user2_id),
  constraint private_threads_unique unique (user1_id, user2_id)
);

-- Private messages inside a thread
create table if not exists public.private_messages (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references public.private_threads(id) on delete cascade,
  author_id   uuid not null references public.profiles(id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 2000),
  sent_at     timestamptz not null default now()
);

-- Indexes
create index if not exists private_threads_user1 on public.private_threads(user1_id);
create index if not exists private_threads_user2 on public.private_threads(user2_id);
create index if not exists private_messages_thread on public.private_messages(thread_id, sent_at);

-- RLS
alter table public.private_threads enable row level security;
alter table public.private_messages enable row level security;

-- Thread: only the two participants can see/insert
create policy "private_threads_select" on public.private_threads
  for select using (auth.uid() = user1_id or auth.uid() = user2_id);

create policy "private_threads_insert" on public.private_threads
  for insert with check (
    (auth.uid() = user1_id or auth.uid() = user2_id)
    and user1_id < user2_id
  );

create policy "private_threads_update" on public.private_threads
  for update using (auth.uid() = user1_id or auth.uid() = user2_id);

-- Messages: only participants of the thread
create policy "private_messages_select" on public.private_messages
  for select using (
    exists (
      select 1 from public.private_threads t
      where t.id = thread_id
        and (t.user1_id = auth.uid() or t.user2_id = auth.uid())
    )
  );

create policy "private_messages_insert" on public.private_messages
  for insert with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.private_threads t
      where t.id = thread_id
        and (t.user1_id = auth.uid() or t.user2_id = auth.uid())
    )
  );

create policy "private_messages_delete" on public.private_messages
  for delete using (auth.uid() = author_id);

-- Realtime for private messages
alter table public.private_messages replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'private_messages'
  ) then
    alter publication supabase_realtime add table private_messages;
  end if;
end;
$$;

-- Grant to authenticated role
grant select, insert, update on public.private_threads to authenticated;
grant select, insert, delete on public.private_messages to authenticated;
