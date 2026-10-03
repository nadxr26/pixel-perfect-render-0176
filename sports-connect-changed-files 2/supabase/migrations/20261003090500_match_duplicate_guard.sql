-- Stops duplicate match records (e.g. a double-clicked "Create Match"): a host cannot have two open
-- matches at the same ground, date and start hour. Checked on new rows only, so existing data is untouched.
CREATE OR REPLACE FUNCTION public.matches_guard_insert() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'open' AND EXISTS (
    SELECT 1 FROM matches WHERE host_id = NEW.host_id AND ground_id = NEW.ground_id
      AND match_date = NEW.match_date AND start_hour = NEW.start_hour AND status = 'open'
  ) THEN
    RAISE EXCEPTION 'You already host a match at this ground and time';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS matches_guard_insert ON public.matches;
CREATE TRIGGER matches_guard_insert BEFORE INSERT ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.matches_guard_insert();
