-- Auto-award badges on profile stats changes.
-- Fires BEFORE UPDATE on matches_played, matches_organized, attendance_pct, reputation.
-- Idempotent — safe to run multiple times.

CREATE OR REPLACE FUNCTION sync_badges()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  new_badges TEXT[] := '{}';
BEGIN
  -- Jugador milestones
  IF COALESCE(NEW.matches_played, 0) >= 1 THEN
    new_badges := array_append(new_badges, 'Primera partida');
  END IF;
  IF COALESCE(NEW.matches_played, 0) >= 10 THEN
    new_badges := array_append(new_badges, 'Veterano');
  END IF;
  IF COALESCE(NEW.matches_played, 0) >= 50 THEN
    new_badges := array_append(new_badges, 'Veterano Elite');
  END IF;

  -- Organizer milestones
  IF COALESCE(NEW.matches_organized, 0) >= 1 THEN
    new_badges := array_append(new_badges, 'Primer torneo');
  END IF;
  IF COALESCE(NEW.matches_organized, 0) >= 5 THEN
    new_badges := array_append(new_badges, 'Organizador');
  END IF;
  IF COALESCE(NEW.matches_organized, 0) >= 20 THEN
    new_badges := array_append(new_badges, 'Organizador Elite');
  END IF;

  -- Consistency badge
  IF COALESCE(NEW.attendance_pct, 0) >= 90 AND COALESCE(NEW.matches_played, 0) >= 5 THEN
    new_badges := array_append(new_badges, 'Asistente Perfecto');
  END IF;

  -- Reputation badge
  IF COALESCE(NEW.reputation, 0) >= 4.5 AND COALESCE(NEW.matches_played, 0) >= 10 THEN
    new_badges := array_append(new_badges, 'Estrella');
  END IF;

  NEW.badges := new_badges;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_badges ON public.profiles;

CREATE TRIGGER trigger_sync_badges
BEFORE UPDATE OF matches_played, matches_organized, attendance_pct, reputation
ON public.profiles
FOR EACH ROW EXECUTE FUNCTION sync_badges();
