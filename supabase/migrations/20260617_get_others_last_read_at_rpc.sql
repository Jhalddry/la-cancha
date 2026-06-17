-- SECURITY DEFINER RPC that returns MAX(last_read_at) for all OTHER users in a thread.
-- Bypasses RLS entirely — no need for a "read all" SELECT policy on chat_reads.
CREATE OR REPLACE FUNCTION get_others_last_read_at(p_thread_type TEXT, p_thread_id TEXT)
RETURNS TIMESTAMPTZ LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT MAX(last_read_at)
  FROM public.chat_reads
  WHERE thread_type = p_thread_type
    AND thread_id   = p_thread_id
    AND user_id    != auth.uid();
$$;
