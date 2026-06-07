-- Add started_at and ended_at columns to matches
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS ended_at   timestamptz;

-- RLS: organizer can update started_at / ended_at
-- (base update policy should already allow organizer to update their own matches)

-- Add delete policy for chat_messages (author can delete own messages)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='chat_messages' AND policyname='messages: author delete'
  ) THEN
    CREATE POLICY "messages: author delete" ON chat_messages
      FOR DELETE USING (author_id = auth.uid());
  END IF;
END $$;

-- Notifications table (for player_joined etc.)
CREATE TABLE IF NOT EXISTS notifications (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id  uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  kind        text NOT NULL,
  payload     jsonb NOT NULL DEFAULT '{}',
  read        boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='notifications' AND policyname='notifications: owner select'
  ) THEN
    CREATE POLICY "notifications: owner select" ON notifications
      FOR SELECT USING (profile_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='notifications' AND policyname='notifications: owner update'
  ) THEN
    CREATE POLICY "notifications: owner update" ON notifications
      FOR UPDATE USING (profile_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='notifications' AND policyname='notifications: service insert'
  ) THEN
    -- Allow any authenticated user to insert (organizer notified when someone joins)
    CREATE POLICY "notifications: service insert" ON notifications
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE ON notifications TO authenticated;
