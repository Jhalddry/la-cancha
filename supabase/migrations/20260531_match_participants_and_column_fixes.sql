-- ============================================================
-- 1. Rename location columns to match API expectations
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'location_lat'
  ) THEN
    ALTER TABLE matches RENAME COLUMN location_lat TO lat;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'location_lng'
  ) THEN
    ALTER TABLE matches RENAME COLUMN location_lng TO lng;
  END IF;
END $$;

-- ============================================================
-- 2. Create match_participants table (replaces match_players)
-- ============================================================

CREATE TABLE IF NOT EXISTS match_participants (
  match_id             uuid        NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  profile_id           uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status               text        NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'joined', 'left', 'rejected')),
  payment_method       text,
  checked_requirements text[]      NOT NULL DEFAULT '{}',
  joined_at            timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (match_id, profile_id)
);

CREATE INDEX IF NOT EXISTS match_participants_profile_id_idx ON match_participants(profile_id);
CREATE INDEX IF NOT EXISTS match_participants_status_idx     ON match_participants(status);

ALTER TABLE match_participants ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. RLS policies for match_participants
-- ============================================================

DO $$
BEGIN
  -- Authenticated users can read participants (needed to display joined players)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'match_participants' AND policyname = 'participants: authenticated read'
  ) THEN
    CREATE POLICY "participants: authenticated read" ON match_participants
      FOR SELECT TO authenticated USING (true);
  END IF;

  -- Players can insert their own join request
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'match_participants' AND policyname = 'participants: own insert'
  ) THEN
    CREATE POLICY "participants: own insert" ON match_participants
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = profile_id);
  END IF;

  -- Players can delete (leave) their own row
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'match_participants' AND policyname = 'participants: own delete'
  ) THEN
    CREATE POLICY "participants: own delete" ON match_participants
      FOR DELETE TO authenticated USING (auth.uid() = profile_id);
  END IF;

  -- Organizer can update status (approve / reject)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'match_participants' AND policyname = 'participants: organizer update'
  ) THEN
    CREATE POLICY "participants: organizer update" ON match_participants
      FOR UPDATE TO authenticated USING (
        EXISTS (
          SELECT 1 FROM matches m
          WHERE m.id = match_id AND m.organizer_id = auth.uid()
        )
      );
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON match_participants TO authenticated;
