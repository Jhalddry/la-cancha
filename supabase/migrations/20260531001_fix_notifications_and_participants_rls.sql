-- ============================================================
-- 1. Add missing columns to notifications table
-- ============================================================

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS read        boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at  timestamptz NOT NULL DEFAULT now();

-- ============================================================
-- 2. Ensure match_participants RLS policies are correct
--    (drop all + recreate cleanly to avoid leftover conflicts)
-- ============================================================

-- Drop any existing policies
DROP POLICY IF EXISTS "participants: authenticated read"    ON match_participants;
DROP POLICY IF EXISTS "participants: own insert"            ON match_participants;
DROP POLICY IF EXISTS "participants: own delete"            ON match_participants;
DROP POLICY IF EXISTS "participants: organizer update"      ON match_participants;
DROP POLICY IF EXISTS "participants: organizer select pending" ON match_participants;

-- Recreate
CREATE POLICY "participants: authenticated read" ON match_participants
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "participants: own insert" ON match_participants
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "participants: own delete" ON match_participants
  FOR DELETE TO authenticated USING (auth.uid() = profile_id);

CREATE POLICY "participants: organizer update" ON match_participants
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_id AND m.organizer_id = auth.uid()
    )
  );

-- ============================================================
-- 3. Ensure notifications RLS policies are correct
-- ============================================================

DROP POLICY IF EXISTS "notifications: owner select"  ON notifications;
DROP POLICY IF EXISTS "notifications: owner update"  ON notifications;
DROP POLICY IF EXISTS "notifications: service insert" ON notifications;

CREATE POLICY "notifications: owner select" ON notifications
  FOR SELECT TO authenticated USING (profile_id = auth.uid());

CREATE POLICY "notifications: owner update" ON notifications
  FOR UPDATE TO authenticated USING (profile_id = auth.uid());

-- Any authenticated user can insert a notification (needed for cross-user notifs)
CREATE POLICY "notifications: any insert" ON notifications
  FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- 4. Grants
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON match_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE         ON notifications      TO authenticated;
