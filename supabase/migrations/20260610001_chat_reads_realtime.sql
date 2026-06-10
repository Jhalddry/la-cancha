-- Enable realtime for chat_reads so read receipts propagate instantly.
do $$ begin
  alter publication supabase_realtime add table public.chat_reads;
exception when others then null;
end $$;
