-- Match integrity hardening. Additive only: no tables, columns or data are removed or changed.

-- 1) Hosts may edit/cancel their own match, but cannot reopen a cancelled one
--    or shrink capacity below the spots already taken.
CREATE OR REPLACE FUNCTION public.matches_guard_update() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _taken int;
BEGIN
  IF OLD.status = 'cancelled' AND NEW.status <> 'cancelled' THEN
    RAISE EXCEPTION 'A cancelled match cannot be reopened';
  END IF;
  IF NEW.max_players < OLD.max_players THEN
    SELECT COALESCE(sum(spots), 0) INTO _taken FROM match_participants WHERE match_id = NEW.id;
    IF NEW.max_players < _taken THEN
      RAISE EXCEPTION 'Max players cannot be lower than the % spots already taken', _taken;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS matches_guard_update ON public.matches;
CREATE TRIGGER matches_guard_update BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.matches_guard_update();

-- 2) Joining is only possible for matches that have not already passed (Jaipur / IST date).
CREATE OR REPLACE FUNCTION public.join_match(_m uuid, _spots int DEFAULT 1) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _me uuid := auth.uid(); _max int; _st text; _date date; _taken int;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF _spots < 1 THEN RAISE EXCEPTION 'Invalid spots'; END IF;
  SELECT max_players, status, match_date INTO _max, _st, _date FROM matches WHERE id = _m FOR UPDATE;
  IF _max IS NULL OR _st <> 'open' THEN RAISE EXCEPTION 'Match not available'; END IF;
  IF _date < (now() AT TIME ZONE 'Asia/Kolkata')::date THEN RAISE EXCEPTION 'This match has already passed'; END IF;
  IF EXISTS (SELECT 1 FROM match_participants WHERE match_id = _m AND user_id = _me) THEN RAISE EXCEPTION 'Already joined'; END IF;
  SELECT COALESCE(sum(spots),0) INTO _taken FROM match_participants WHERE match_id = _m;
  IF _taken + _spots > _max THEN RAISE EXCEPTION 'Not enough spots left'; END IF;
  INSERT INTO match_participants(match_id, user_id, spots) VALUES (_m, _me, _spots);
  DELETE FROM match_waitlist WHERE match_id = _m AND user_id = _me;
END $$;
