-- ============================================================
-- Fix notifications INSERT policy — was too permissive
-- (any authed user could insert notif for any profile_id).
-- Restrict: sender must be organizer or participant of the
-- match referenced in payload.matchId.
-- ============================================================

DROP POLICY IF EXISTS "notifications: any insert"        ON notifications;
DROP POLICY IF EXISTS "notifications: restricted insert" ON notifications;

CREATE POLICY "notifications: restricted insert" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Self-notifications always allowed
    profile_id = auth.uid()

    -- Cross-user: require sender involved in the referenced match
    OR (
      payload ? 'matchId'
      AND EXISTS (
        SELECT 1 FROM matches m
        WHERE m.id = (payload->>'matchId')::uuid
          AND (
            -- Sender is organizer
            m.organizer_id = auth.uid()
            -- Sender is a participant (pending or joined)
            OR EXISTS (
              SELECT 1 FROM match_participants mp
              WHERE mp.match_id = m.id
                AND mp.profile_id = auth.uid()
                AND mp.status IN ('pending', 'joined')
            )
          )
      )
    )
  );

NOTIFY pgrst, 'reload schema';
