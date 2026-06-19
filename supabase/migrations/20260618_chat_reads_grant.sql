-- Grant table-level privileges on chat_reads so that:
--   • authenticated users can SELECT their own rows (unread count on cold start)
--   • authenticated users can INSERT/UPDATE their own rows (direct upsert fallback)
--   • RLS policies already restrict to own rows — these grants just lift the table-level block.

GRANT SELECT, INSERT, UPDATE ON TABLE public.chat_reads TO authenticated;
