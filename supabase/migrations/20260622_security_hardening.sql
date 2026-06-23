-- ============================================================
-- Security hardening — fixes Supabase linter warnings.
-- Safe to apply: no app behavior changes.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Fix function_search_path_mutable
--    Both functions already use fully-qualified schema refs
--    (public.ratings, public.profiles) so SET search_path = ''
--    is safe.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.refresh_profile_reputation()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = '' AS $$
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
SECURITY DEFINER SET search_path = '' AS $$
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

-- ────────────────────────────────────────────────────────────
-- 2. Fix rls_policy_always_true on notifications INSERT
--    Restrict: you can only create a notification for someone
--    else (not yourself). All legitimate app inserts satisfy
--    this — notifications are always sent to other users.
-- ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "notifications: any insert"        ON public.notifications;
DROP POLICY IF EXISTS "notifications: restricted insert" ON public.notifications;

CREATE POLICY "notifications: restricted insert"
  ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (profile_id != auth.uid());

-- ────────────────────────────────────────────────────────────
-- 3. Fix public_bucket_allows_listing
--    Public bucket URL access bypasses storage.objects RLS.
--    The SELECT policy only controls API listing. Restrict
--    listing to authenticated users only (was: everyone).
-- ────────────────────────────────────────────────────────────

-- avatars
DROP POLICY IF EXISTS "avatars: public read" ON storage.objects;
CREATE POLICY "avatars: authenticated read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars');

-- match-photos
DROP POLICY IF EXISTS "match-photos: public read" ON storage.objects;
CREATE POLICY "match-photos: authenticated read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'match-photos');

-- voice-messages
DROP POLICY IF EXISTS "voice_read_public" ON storage.objects;
CREATE POLICY "voice_read_authenticated"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'voice-messages');

-- ────────────────────────────────────────────────────────────
-- 4. Fix anon_security_definer_function_executable
--
--    bump_chat_thread_updated_at + create_chat_thread_for_match
--    are trigger functions — only fired internally by triggers,
--    never called via REST. Revoke EXECUTE from everyone.
--
--    get_others_last_read_at + mark_thread_read are intentionally
--    called by authenticated users (chat read receipts). Revoke
--    only from anon.
-- ────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.bump_chat_thread_updated_at()
  FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.create_chat_thread_for_match()
  FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.get_others_last_read_at(text, text)
  FROM anon;

REVOKE EXECUTE ON FUNCTION public.mark_thread_read(text, text)
  FROM anon;

-- Ensure authenticated still has execute on the chat RPCs
GRANT EXECUTE ON FUNCTION public.get_others_last_read_at(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_thread_read(text, text)        TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ────────────────────────────────────────────────────────────
-- NOT fixed here (requires dashboard action):
--   auth_leaked_password_protection — toggle in Supabase
--   Dashboard → Authentication → Password → Enable leaked
--   password protection.
--
-- Intentionally remaining:
--   authenticated_security_definer_function_executable for
--   get_others_last_read_at and mark_thread_read — these ARE
--   meant to be called by authenticated users (chat receipts).
-- ────────────────────────────────────────────────────────────
