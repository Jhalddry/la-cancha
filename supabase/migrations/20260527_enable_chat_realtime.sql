-- Enable full replica identity so Realtime payloads include complete row data
alter table chat_messages replica identity full;

-- Add chat_messages to the Supabase Realtime publication (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table chat_messages;
  end if;
end;
$$;
