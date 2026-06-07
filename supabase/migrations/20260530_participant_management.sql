-- ── Participant management: pending/approved/rejected flow ───────────────────

-- 1. Extend status enum
ALTER TABLE match_participants
  DROP CONSTRAINT IF EXISTS match_participants_status_check;
ALTER TABLE match_participants
  ADD CONSTRAINT match_participants_status_check
  CHECK (status IN ('pending', 'joined', 'left', 'rejected'));

-- 2. Track which requirements the joining player confirmed
ALTER TABLE match_participants
  ADD COLUMN IF NOT EXISTS checked_requirements text[] NOT NULL DEFAULT '{}';

-- 3. Organizer can update status (approve / reject) for their own matches
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='match_participants'
      AND policyname='participants: organizer update'
  ) THEN
    CREATE POLICY "participants: organizer update" ON match_participants
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM matches m
          WHERE m.id = match_id AND m.organizer_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 4. Organizer can also select pending participants for their matches
--    (base select policy may already cover this; adding explicit one to be safe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='match_participants'
      AND policyname='participants: organizer select pending'
  ) THEN
    CREATE POLICY "participants: organizer select pending" ON match_participants
      FOR SELECT USING (
        profile_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM matches m
          WHERE m.id = match_id AND m.organizer_id = auth.uid()
        )
      );
  END IF;
END $$;
