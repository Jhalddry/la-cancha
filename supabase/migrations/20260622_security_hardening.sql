-- ============================================================
-- Security hardening v2 — corrected approach.
-- Apply in Supabase Dashboard → SQL Editor.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. function_search_path_mutable
--    refresh_profile_reputation + sync_badges are trigger
--    functions — SECURITY INVOKER (not DEFINER). Just pin
--    search_path. Then revoke from PUBLIC so they don't show
--    up as callable SECURITY DEFINER functions via REST.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.refresh_profile_reputation()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = '' AS $$
DECLARE
  target_id uuid;
  avg_stars  numeric;
BEGIN
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

CREATE OR REPLACE FUNCTION public.sync_badges()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = '' AS $$
DECLARE
  new_badges TEXT[] := '{}';
BEGIN
  IF COALESCE(NEW.matches_played, 0) >= 1 THEN
    new_badges := array_append(new_badges, 'Primera partida');
  END IF;
  IF COALESCE(NEW.matches_played, 0) >= 10 THEN
    new_badges := array_append(new_badges, 'Veterano');
  END IF;
  IF COALESCE(NEW.matches_played, 0) >= 50 THEN
    new_badges := array_append(new_badges, 'Veterano Elite');
  END IF;
  IF COALESCE(NEW.matches_organized, 0) >= 1 THEN
    new_badges := array_append(new_badges, 'Primer torneo');
  END IF;
  IF COALESCE(NEW.matches_organized, 0) >= 5 THEN
    new_badges := array_append(new_badges, 'Organizador');
  END IF;
  IF COALESCE(NEW.matches_organized, 0) >= 20 THEN
    new_badges := array_append(new_badges, 'Organizador Elite');
  END IF;
  IF COALESCE(NEW.attendance_pct, 0) >= 90 AND COALESCE(NEW.matches_played, 0) >= 5 THEN
    new_badges := array_append(new_badges, 'Asistente Perfecto');
  END IF;
  IF COALESCE(NEW.reputation, 0) >= 4.5 AND COALESCE(NEW.matches_played, 0) >= 10 THEN
    new_badges := array_append(new_badges, 'Estrella');
  END IF;
  NEW.badges := new_badges;
  RETURN NEW;
END;
$$;

-- Trigger functions are never called via REST — revoke from PUBLIC
-- (PUBLIC is the source; revoking from anon/authenticated alone is insufficient)
REVOKE EXECUTE ON FUNCTION public.refresh_profile_reputation() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_badges()                FROM PUBLIC;

-- ────────────────────────────────────────────────────────────
-- 2. rls_policy_always_true on notifications INSERT
-- ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "notifications: any insert"        ON public.notifications;
DROP POLICY IF EXISTS "notifications: restricted insert" ON public.notifications;

CREATE POLICY "notifications: restricted insert"
  ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (profile_id != auth.uid());

-- ────────────────────────────────────────────────────────────
-- 3. public_bucket_allows_listing
--    The linter flags ANY SELECT policy on storage.objects for
--    a public bucket, regardless of role restriction.
--    Correct fix: DROP the SELECT policies entirely.
--    Public bucket URL access goes through the CDN and does
--    NOT require a storage.objects SELECT policy.
-- ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "avatars: public read"          ON storage.objects;
DROP POLICY IF EXISTS "avatars: authenticated read"   ON storage.objects;
DROP POLICY IF EXISTS "match-photos: public read"     ON storage.objects;
DROP POLICY IF EXISTS "match-photos: authenticated read" ON storage.objects;
DROP POLICY IF EXISTS "voice_read_public"             ON storage.objects;
DROP POLICY IF EXISTS "voice_read_authenticated"      ON storage.objects;

-- ────────────────────────────────────────────────────────────
-- 4. anon/authenticated SECURITY DEFINER callable via REST
--
--    Trigger-only functions (bump_chat_thread_updated_at,
--    create_chat_thread_for_match): revoke from PUBLIC —
--    triggers fire them internally regardless of grants.
--
--    Chat RPCs (get_others_last_read_at, mark_thread_read):
--    revoke from PUBLIC, re-grant to authenticated only.
-- ────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.bump_chat_thread_updated_at()    FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_chat_thread_for_match()   FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.get_others_last_read_at(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_thread_read(text, text)        FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_others_last_read_at(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_thread_read(text, text)        TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ────────────────────────────────────────────────────────────
-- Remaining warnings after this migration:
--
--   authenticated_security_definer_function_executable for
--   get_others_last_read_at + mark_thread_read — INTENTIONAL.
--   These are called by the chat feature. Cannot remove.
--
--   auth_leaked_password_protection — dashboard only:
--   Authentication → Password → Enable leaked password protection.
-- ────────────────────────────────────────────────────────────
