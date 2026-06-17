-- Fix RLS: allow authenticated users to read others' chat_reads (for ✓✓ receipt display).
-- Split the previous FOR ALL policy into per-operation policies.
DROP POLICY IF EXISTS "Users manage own reads" ON chat_reads;

DO $$ BEGIN
  CREATE POLICY "chat_reads: own write"
    ON chat_reads FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "chat_reads: read all"
    ON chat_reads FOR SELECT
    USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RPC: mark thread read using server NOW() to avoid client/server clock skew.
CREATE OR REPLACE FUNCTION mark_thread_read(p_thread_type TEXT, p_thread_id TEXT)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO chat_reads (thread_type, thread_id, user_id, last_read_at)
  VALUES (p_thread_type, p_thread_id, auth.uid(), now())
  ON CONFLICT (thread_type, thread_id, user_id)
  DO UPDATE SET last_read_at = now();
$$;
