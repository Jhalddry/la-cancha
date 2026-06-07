-- Fix ratings RLS: allow insert when match has ended_at set
-- (original policy only checked starts_at < now(), failing for early-ended matches)

DROP POLICY IF EXISTS "ratings: participant insert" ON ratings;

CREATE POLICY "ratings: participant insert"
  ON ratings FOR INSERT WITH CHECK (
    -- rater must be the authenticated user
    auth.uid() = rater_id
    -- match must be in the past OR explicitly ended
    AND exists (
      SELECT 1 FROM matches m
      WHERE m.id = match_id
        AND (m.starts_at < now() OR m.ended_at IS NOT NULL)
    )
    -- rater must have participated (as joined player or organizer)
    AND (
      exists (
        SELECT 1 FROM match_participants mp
        WHERE mp.match_id = ratings.match_id
          AND mp.profile_id = auth.uid()
          AND mp.status = 'joined'
      )
      OR exists (
        SELECT 1 FROM matches m
        WHERE m.id = ratings.match_id
          AND m.organizer_id = auth.uid()
      )
    )
  );
