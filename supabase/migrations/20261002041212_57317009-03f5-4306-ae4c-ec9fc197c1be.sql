CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 80),
  sport text NOT NULL,
  ground_id text NOT NULL,
  match_date date NOT NULL,
  start_hour int NOT NULL CHECK (start_hour BETWEEN 0 AND 23),
  end_hour int NOT NULL CHECK (end_hour BETWEEN 1 AND 24),
  max_players int NOT NULL CHECK (max_players BETWEEN 2 AND 30),
  fee int NOT NULL DEFAULT 0 CHECK (fee >= 0),
  skill text NOT NULL DEFAULT 'Intermediate',
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 1000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_hour > start_hour)
);
GRANT SELECT, INSERT, UPDATE ON public.matches TO authenticated;
GRANT ALL ON public.matches TO service_role;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users view matches" ON public.matches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create own matches" ON public.matches FOR INSERT TO authenticated WITH CHECK (host_id = auth.uid());
CREATE POLICY "Hosts update own matches" ON public.matches FOR UPDATE TO authenticated USING (host_id = auth.uid()) WITH CHECK (host_id = auth.uid());

CREATE TABLE public.match_participants (
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  spots int NOT NULL DEFAULT 1 CHECK (spots BETWEEN 1 AND 30),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (match_id, user_id)
);
GRANT SELECT ON public.match_participants TO authenticated;
GRANT ALL ON public.match_participants TO service_role;
ALTER TABLE public.match_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users view participants" ON public.match_participants FOR SELECT TO authenticated USING (true);

CREATE TABLE public.match_waitlist (
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (match_id, user_id)
);
GRANT SELECT ON public.match_waitlist TO authenticated;
GRANT ALL ON public.match_waitlist TO service_role;
ALTER TABLE public.match_waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users view waitlist" ON public.match_waitlist FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER matches_updated_at BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- host automatically joins their own match
CREATE OR REPLACE FUNCTION public.match_host_join() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN INSERT INTO match_participants(match_id, user_id, spots) VALUES (NEW.id, NEW.host_id, 1) ON CONFLICT DO NOTHING; RETURN NEW; END $$;
CREATE TRIGGER matches_host_join AFTER INSERT ON public.matches FOR EACH ROW EXECUTE FUNCTION public.match_host_join();
REVOKE EXECUTE ON FUNCTION public.match_host_join() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.join_match(_m uuid, _spots int DEFAULT 1) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _me uuid := auth.uid(); _max int; _st text; _taken int;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF _spots < 1 THEN RAISE EXCEPTION 'Invalid spots'; END IF;
  SELECT max_players, status INTO _max, _st FROM matches WHERE id = _m FOR UPDATE;
  IF _max IS NULL OR _st <> 'open' THEN RAISE EXCEPTION 'Match not available'; END IF;
  IF EXISTS (SELECT 1 FROM match_participants WHERE match_id = _m AND user_id = _me) THEN RAISE EXCEPTION 'Already joined'; END IF;
  SELECT COALESCE(sum(spots),0) INTO _taken FROM match_participants WHERE match_id = _m;
  IF _taken + _spots > _max THEN RAISE EXCEPTION 'Not enough spots left'; END IF;
  INSERT INTO match_participants(match_id, user_id, spots) VALUES (_m, _me, _spots);
  DELETE FROM match_waitlist WHERE match_id = _m AND user_id = _me;
END $$;

CREATE OR REPLACE FUNCTION public.leave_match(_m uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _me uuid := auth.uid(); _max int; _taken int; _w record;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT max_players INTO _max FROM matches WHERE id = _m FOR UPDATE;
  IF _max IS NULL THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF EXISTS (SELECT 1 FROM matches WHERE id = _m AND host_id = _me) THEN RAISE EXCEPTION 'Hosts cancel the match instead of leaving'; END IF;
  DELETE FROM match_participants WHERE match_id = _m AND user_id = _me;
  FOR _w IN SELECT user_id FROM match_waitlist WHERE match_id = _m ORDER BY created_at LOOP
    SELECT COALESCE(sum(spots),0) INTO _taken FROM match_participants WHERE match_id = _m;
    EXIT WHEN _taken >= _max;
    INSERT INTO match_participants(match_id, user_id, spots) VALUES (_m, _w.user_id, 1) ON CONFLICT DO NOTHING;
    DELETE FROM match_waitlist WHERE match_id = _m AND user_id = _w.user_id;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.join_waitlist(_m uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _me uuid := auth.uid();
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF NOT EXISTS (SELECT 1 FROM matches WHERE id = _m AND status = 'open') THEN RAISE EXCEPTION 'Match not available'; END IF;
  IF EXISTS (SELECT 1 FROM match_participants WHERE match_id = _m AND user_id = _me) THEN RAISE EXCEPTION 'Already joined'; END IF;
  INSERT INTO match_waitlist(match_id, user_id) VALUES (_m, _me) ON CONFLICT DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.leave_waitlist(_m uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM match_waitlist WHERE match_id = _m AND user_id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.join_match(uuid,int), public.leave_match(uuid), public.join_waitlist(uuid), public.leave_waitlist(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_match(uuid,int), public.leave_match(uuid), public.join_waitlist(uuid), public.leave_waitlist(uuid) TO authenticated;

ALTER TABLE public.matches REPLICA IDENTITY FULL;
ALTER TABLE public.match_participants REPLICA IDENTITY FULL;
ALTER TABLE public.match_waitlist REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches, public.match_participants, public.match_waitlist;