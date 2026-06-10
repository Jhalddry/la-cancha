-- Enable realtime for chat_reads so read receipts propagate instantly.
-- If this table is already in the publication this is a no-op.
alter publication supabase_realtime add table public.chat_reads;
