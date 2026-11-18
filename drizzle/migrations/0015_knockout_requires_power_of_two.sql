CREATE OR REPLACE FUNCTION public.knockout_size_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n int;
BEGIN
  IF NEW.status='ongoing' AND OLD.status='registration' AND NEW.format='knockout' THEN
    SELECT count(*) INTO n FROM tournament_teams WHERE tournament_id=NEW.id;
    IF n NOT IN (2,4,8,16,32) THEN RAISE EXCEPTION 'Knockout needs 2, 4, 8, 16 or 32 teams'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tournaments_knockout_size BEFORE UPDATE ON public.tournaments FOR EACH ROW EXECUTE FUNCTION public.knockout_size_guard();