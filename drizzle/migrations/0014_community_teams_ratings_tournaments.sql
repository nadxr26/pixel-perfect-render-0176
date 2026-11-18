
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sport text NOT NULL,
  city text NOT NULL DEFAULT 'Jaipur',
  captain_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teams_name_len CHECK (char_length(name) BETWEEN 2 AND 60)
);
CREATE UNIQUE INDEX teams_name_sport_uq ON public.teams (lower(name), sport);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users view teams" ON public.teams FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Captains create teams" ON public.teams FOR INSERT TO authenticated WITH CHECK (captain_id = auth.uid());
CREATE POLICY "Captains update teams" ON public.teams FOR UPDATE TO authenticated USING (captain_id = auth.uid()) WITH CHECK (captain_id = auth.uid());
CREATE POLICY "Captains delete teams" ON public.teams FOR DELETE TO authenticated USING (captain_id = auth.uid());

CREATE TABLE public.team_members (
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);
CREATE INDEX team_members_user_idx ON public.team_members(user_id);
GRANT SELECT ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users view team members" ON public.team_members FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.team_captain_join() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN INSERT INTO public.team_members(team_id,user_id) VALUES (NEW.id,NEW.captain_id) ON CONFLICT DO NOTHING; RETURN NEW; END $$;
CREATE TRIGGER teams_captain_join AFTER INSERT ON public.teams FOR EACH ROW EXECUTE FUNCTION public.team_captain_join();

CREATE OR REPLACE FUNCTION public.join_team(_t uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please log in'; END IF;
  IF NOT EXISTS (SELECT 1 FROM teams WHERE id=_t) THEN RAISE EXCEPTION 'Team not found'; END IF;
  IF (SELECT count(*) FROM team_members WHERE team_id=_t) >= 25 THEN RAISE EXCEPTION 'Team is full'; END IF;
  INSERT INTO team_members(team_id,user_id) VALUES (_t,auth.uid()) ON CONFLICT DO NOTHING;
END $$;
CREATE OR REPLACE FUNCTION public.leave_team(_t uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM teams WHERE id=_t AND captain_id=auth.uid()) THEN RAISE EXCEPTION 'Captain cannot leave; delete the team instead'; END IF;
  DELETE FROM team_members WHERE team_id=_t AND user_id=auth.uid();
END $$;
CREATE OR REPLACE FUNCTION public.list_teams() RETURNS TABLE(id uuid, name text, sport text, city text, captain_id uuid, captain_name text, member_count bigint, is_member boolean, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT t.id,t.name,t.sport,t.city,t.captain_id,p.name,
    (SELECT count(*) FROM team_members m WHERE m.team_id=t.id),
    EXISTS(SELECT 1 FROM team_members m WHERE m.team_id=t.id AND m.user_id=auth.uid()),
    t.created_at
  FROM teams t JOIN profiles p ON p.id=t.captain_id
  WHERE auth.uid() IS NOT NULL ORDER BY t.created_at DESC
$$;
CREATE OR REPLACE FUNCTION public.team_roster(_t uuid) RETURNS TABLE(user_id uuid, name text, photo text, skill_level text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT p.id,p.name,p.photo,p.skill_level FROM team_members m JOIN profiles p ON p.id=m.user_id
  WHERE m.team_id=_t AND auth.uid() IS NOT NULL ORDER BY m.joined_at
$$;

CREATE TABLE public.player_ratings (
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  rater_id uuid NOT NULL DEFAULT auth.uid(),
  rated_id uuid NOT NULL,
  skill smallint NOT NULL CHECK (skill BETWEEN 1 AND 5),
  sportsmanship smallint NOT NULL CHECK (sportsmanship BETWEEN 1 AND 5),
  punctuality smallint NOT NULL CHECK (punctuality BETWEEN 1 AND 5),
  mvp boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (match_id, rater_id, rated_id),
  CHECK (rater_id <> rated_id)
);
CREATE UNIQUE INDEX player_ratings_one_mvp ON public.player_ratings(match_id, rater_id) WHERE mvp;
CREATE INDEX player_ratings_rated_idx ON public.player_ratings(rated_id);
GRANT SELECT ON public.player_ratings TO authenticated;
GRANT ALL ON public.player_ratings TO service_role;
ALTER TABLE public.player_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Raters view own ratings" ON public.player_ratings FOR SELECT TO authenticated USING (rater_id = auth.uid());

CREATE OR REPLACE FUNCTION public.rate_player(_m uuid, _u uuid, _skill int, _sport int, _punct int, _mvp boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d date;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please log in'; END IF;
  IF _u = auth.uid() THEN RAISE EXCEPTION 'You cannot rate yourself'; END IF;
  SELECT match_date INTO d FROM matches WHERE id=_m;
  IF d IS NULL THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF d > (now() AT TIME ZONE 'Asia/Kolkata')::date THEN RAISE EXCEPTION 'You can rate players after the match'; END IF;
  IF NOT EXISTS (SELECT 1 FROM match_participants WHERE match_id=_m AND user_id=auth.uid()) OR
     NOT EXISTS (SELECT 1 FROM match_participants WHERE match_id=_m AND user_id=_u) THEN
     RAISE EXCEPTION 'Only players of this match can rate each other'; END IF;
  IF _mvp THEN UPDATE player_ratings SET mvp=false WHERE match_id=_m AND rater_id=auth.uid() AND rated_id<>_u; END IF;
  INSERT INTO player_ratings(match_id,rater_id,rated_id,skill,sportsmanship,punctuality,mvp)
  VALUES (_m,auth.uid(),_u,_skill,_sport,_punct,coalesce(_mvp,false))
  ON CONFLICT (match_id,rater_id,rated_id) DO UPDATE SET skill=EXCLUDED.skill,sportsmanship=EXCLUDED.sportsmanship,punctuality=EXCLUDED.punctuality,mvp=EXCLUDED.mvp;
END $$;

CREATE OR REPLACE FUNCTION public.get_player_stats(_u uuid) RETURNS TABLE(matches_played bigint, ratings_count bigint, avg_skill numeric, avg_sportsmanship numeric, avg_punctuality numeric, mvp_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT
    (SELECT count(*) FROM match_participants mp JOIN matches m ON m.id=mp.match_id WHERE mp.user_id=_u AND m.status<>'cancelled' AND m.match_date <= (now() AT TIME ZONE 'Asia/Kolkata')::date),
    count(r.*), round(avg(r.skill),1), round(avg(r.sportsmanship),1), round(avg(r.punctuality),1), count(*) FILTER (WHERE r.mvp)
  FROM player_ratings r WHERE r.rated_id=_u AND auth.uid() IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION public.my_match_history() RETURNS TABLE(match_id uuid, title text, sport text, ground_id text, match_date date, start_hour int, is_host boolean, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT m.id,m.title,m.sport,m.ground_id,m.match_date,m.start_hour,m.host_id=auth.uid(),m.status
  FROM matches m JOIN match_participants mp ON mp.match_id=m.id AND mp.user_id=auth.uid()
  WHERE m.match_date <= (now() AT TIME ZONE 'Asia/Kolkata')::date ORDER BY m.match_date DESC LIMIT 50
$$;

CREATE OR REPLACE FUNCTION public.rateable_players(_m uuid) RETURNS TABLE(user_id uuid, name text, photo text, my_skill smallint, my_sportsmanship smallint, my_punctuality smallint, my_mvp boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT p.id,p.name,p.photo,r.skill,r.sportsmanship,r.punctuality,r.mvp
  FROM match_participants mp JOIN profiles p ON p.id=mp.user_id
  LEFT JOIN player_ratings r ON r.match_id=_m AND r.rater_id=auth.uid() AND r.rated_id=p.id
  WHERE mp.match_id=_m AND mp.user_id<>auth.uid()
    AND EXISTS (SELECT 1 FROM match_participants me WHERE me.match_id=_m AND me.user_id=auth.uid())
$$;

CREATE TABLE public.tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 80),
  sport text NOT NULL,
  format text NOT NULL DEFAULT 'league' CHECK (format IN ('league','knockout')),
  ground_id text REFERENCES public.venues(id),
  start_date date NOT NULL,
  entry_fee integer NOT NULL DEFAULT 0 CHECK (entry_fee >= 0),
  prize text NOT NULL DEFAULT '',
  max_teams integer NOT NULL DEFAULT 8 CHECK (max_teams BETWEEN 2 AND 32),
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'registration' CHECK (status IN ('registration','ongoing','completed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.tournaments TO authenticated;
GRANT ALL ON public.tournaments TO service_role;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users view tournaments" ON public.tournaments FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Organizers create tournaments" ON public.tournaments FOR INSERT TO authenticated WITH CHECK (organizer_id = auth.uid());
CREATE POLICY "Organizers update tournaments" ON public.tournaments FOR UPDATE TO authenticated USING (organizer_id = auth.uid()) WITH CHECK (organizer_id = auth.uid());

CREATE TABLE public.tournament_teams (
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  registered_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tournament_id, team_id)
);
GRANT SELECT ON public.tournament_teams TO authenticated;
GRANT ALL ON public.tournament_teams TO service_role;
ALTER TABLE public.tournament_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users view registrations" ON public.tournament_teams FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE TABLE public.tournament_fixtures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round integer NOT NULL,
  team_a uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  team_b uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  score_a integer, score_b integer,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tournament_fixtures_t_idx ON public.tournament_fixtures(tournament_id);
GRANT SELECT ON public.tournament_fixtures TO authenticated;
GRANT ALL ON public.tournament_fixtures TO service_role;
ALTER TABLE public.tournament_fixtures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users view fixtures" ON public.tournament_fixtures FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.register_team(_t uuid, _team uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE tr tournaments;
BEGIN
  SELECT * INTO tr FROM tournaments WHERE id=_t FOR UPDATE;
  IF tr.id IS NULL THEN RAISE EXCEPTION 'Tournament not found'; END IF;
  IF tr.status<>'registration' THEN RAISE EXCEPTION 'Registration is closed'; END IF;
  IF NOT EXISTS (SELECT 1 FROM teams WHERE id=_team AND captain_id=auth.uid()) THEN RAISE EXCEPTION 'Only the team captain can register'; END IF;
  IF NOT EXISTS (SELECT 1 FROM teams WHERE id=_team AND sport=tr.sport) THEN RAISE EXCEPTION 'Team sport does not match'; END IF;
  IF (SELECT count(*) FROM tournament_teams WHERE tournament_id=_t) >= tr.max_teams THEN RAISE EXCEPTION 'Tournament is full'; END IF;
  INSERT INTO tournament_teams(tournament_id,team_id) VALUES (_t,_team) ON CONFLICT DO NOTHING;
END $$;
CREATE OR REPLACE FUNCTION public.withdraw_team(_t uuid, _team uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tournaments WHERE id=_t AND status='registration') THEN RAISE EXCEPTION 'Registration is closed'; END IF;
  IF NOT EXISTS (SELECT 1 FROM teams WHERE id=_team AND captain_id=auth.uid()) THEN RAISE EXCEPTION 'Only the team captain can withdraw'; END IF;
  DELETE FROM tournament_teams WHERE tournament_id=_t AND team_id=_team;
END $$;
CREATE OR REPLACE FUNCTION public.start_tournament(_t uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE ids uuid[]; n int; i int; j int; fmt text;
BEGIN
  SELECT format INTO fmt FROM tournaments WHERE id=_t AND organizer_id=auth.uid() AND status='registration';
  IF fmt IS NULL THEN RAISE EXCEPTION 'Only the organizer can start this tournament'; END IF;
  SELECT array_agg(team_id ORDER BY random()) INTO ids FROM tournament_teams WHERE tournament_id=_t;
  n := coalesce(array_length(ids,1),0);
  IF n < 2 THEN RAISE EXCEPTION 'Need at least 2 teams'; END IF;
  IF fmt='league' THEN
    FOR i IN 1..n-1 LOOP FOR j IN i+1..n LOOP
      INSERT INTO tournament_fixtures(tournament_id,round,team_a,team_b) VALUES (_t,1,ids[i],ids[j]);
    END LOOP; END LOOP;
  ELSE
    i := 1;
    WHILE i < n LOOP INSERT INTO tournament_fixtures(tournament_id,round,team_a,team_b) VALUES (_t,1,ids[i],ids[i+1]); i := i+2; END LOOP;
  END IF;
  UPDATE tournaments SET status='ongoing' WHERE id=_t;
END $$;
CREATE OR REPLACE FUNCTION public.set_fixture_result(_f uuid, _a int, _b int) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE fx tournament_fixtures; fmt text; r int; winners uuid[]; open_left int; k int;
BEGIN
  SELECT * INTO fx FROM tournament_fixtures WHERE id=_f;
  SELECT format INTO fmt FROM tournaments WHERE id=fx.tournament_id AND organizer_id=auth.uid() AND status='ongoing';
  IF fmt IS NULL THEN RAISE EXCEPTION 'Only the organizer can enter results'; END IF;
  IF _a < 0 OR _b < 0 THEN RAISE EXCEPTION 'Invalid score'; END IF;
  IF fmt='knockout' AND _a=_b THEN RAISE EXCEPTION 'Knockout matches need a winner'; END IF;
  UPDATE tournament_fixtures SET score_a=_a, score_b=_b, status='completed' WHERE id=_f;
  r := fx.round;
  SELECT count(*) INTO open_left FROM tournament_fixtures WHERE tournament_id=fx.tournament_id AND round=r AND status<>'completed';
  IF open_left > 0 THEN RETURN; END IF;
  IF fmt='league' THEN UPDATE tournaments SET status='completed' WHERE id=fx.tournament_id; RETURN; END IF;
  SELECT array_agg(CASE WHEN score_a>score_b THEN team_a ELSE team_b END ORDER BY created_at) INTO winners
    FROM tournament_fixtures WHERE tournament_id=fx.tournament_id AND round=r;
  IF array_length(winners,1) = 1 THEN UPDATE tournaments SET status='completed' WHERE id=fx.tournament_id; RETURN; END IF;
  k := 1;
  WHILE k < array_length(winners,1) LOOP
    INSERT INTO tournament_fixtures(tournament_id,round,team_a,team_b) VALUES (fx.tournament_id,r+1,winners[k],winners[k+1]); k := k+2;
  END LOOP;
  IF array_length(winners,1) % 2 = 1 THEN
    -- odd winner gets a bye into next round as a pre-completed fixture against itself is avoided; pair with the last winner again later
    NULL;
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_fixtures;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_teams;
