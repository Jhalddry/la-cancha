CREATE TABLE IF NOT EXISTS chat_reads (
  thread_type TEXT NOT NULL CHECK (thread_type IN ('match', 'private')),
  thread_id   TEXT NOT NULL,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (thread_type, thread_id, user_id)
);

ALTER TABLE chat_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reads"
  ON chat_reads FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
