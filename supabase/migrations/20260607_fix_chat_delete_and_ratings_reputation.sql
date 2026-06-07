-- ============================================================
-- 1. Re-apply chat_threads delete policy (idempotent)
-- ============================================================

DROP POLICY IF EXISTS "chat_threads: participant delete" ON public.chat_threads;
CREATE POLICY "chat_threads: participant delete" ON public.chat_threads
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND (
        m.organizer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.match_participants mp
          WHERE mp.match_id = m.id
            AND mp.profile_id = auth.uid()
            AND mp.status = 'joined'
        )
      )
    )
  );

-- chat_messages cascade is already set (ON DELETE CASCADE on thread_id).
-- Explicit delete policy kept for author self-delete only.
DROP POLICY IF EXISTS "chat_messages: thread participant delete" ON public.chat_messages;
CREATE POLICY "chat_messages: thread participant delete" ON public.chat_messages
  FOR DELETE TO authenticated
  USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.chat_threads ct
      JOIN public.matches m ON m.id = ct.match_id
      WHERE ct.id = thread_id AND (
        m.organizer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.match_participants mp
          WHERE mp.match_id = m.id
            AND mp.profile_id = auth.uid()
            AND mp.status = 'joined'
        )
      )
    )
  );

-- ============================================================
-- 2. Trigger: update profiles.reputation after rating insert/update/delete
-- ============================================================

CREATE OR REPLACE FUNCTION public.refresh_profile_reputation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  target_id uuid;
  avg_stars  numeric;
BEGIN
  -- Determine the profile to update
  IF TG_OP = 'DELETE' THEN
    target_id := OLD.ratee_id;
  ELSE
    target_id := NEW.ratee_id;
  END IF;

  SELECT AVG(stars)
  INTO avg_stars
  FROM public.ratings
  WHERE ratee_id = target_id;

  UPDATE public.profiles
  SET reputation = ROUND(COALESCE(avg_stars, 0)::numeric, 2)
  WHERE id = target_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_reputation ON public.ratings;
CREATE TRIGGER trg_refresh_reputation
  AFTER INSERT OR UPDATE OR DELETE ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION public.refresh_profile_reputation();

-- Backfill existing reputations
UPDATE public.profiles p
SET reputation = (
  SELECT ROUND(AVG(r.stars)::numeric, 2)
  FROM public.ratings r
  WHERE r.ratee_id = p.id
)
WHERE EXISTS (SELECT 1 FROM public.ratings WHERE ratee_id = p.id);

NOTIFY pgrst, 'reload schema';
