-- Idempotent fix: ensure chat_reads realtime, RLS, and RPC are all in place.
-- Safe to run multiple times. Apply via Supabase Dashboard → SQL Editor.

-- 1. Enable realtime for chat_reads (needed for live ✓✓ receipts)
do $$ begin
  alter publication supabase_realtime add table public.chat_reads;
exception when others then null;
end $$;

-- 2. Fix RLS: drop old single policy, add split write + read-all policies
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

-- 3. Upsert RPC for server-side timestamp (avoids client clock skew)
CREATE OR REPLACE FUNCTION mark_thread_read(p_thread_type TEXT, p_thread_id TEXT)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO chat_reads (thread_type, thread_id, user_id, last_read_at)
  VALUES (p_thread_type, p_thread_id, auth.uid(), now())
  ON CONFLICT (thread_type, thread_id, user_id)
  DO UPDATE SET last_read_at = now();
$$;

-- 4. Trigger: bump chat_threads.updated_at on new message (keeps list ordered)
create or replace function public.bump_chat_thread_updated_at()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.chat_threads set updated_at = now() where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists trg_bump_chat_thread_updated_at on public.chat_messages;
create trigger trg_bump_chat_thread_updated_at
  after insert on public.chat_messages
  for each row execute function public.bump_chat_thread_updated_at();
