-- Ground bookings + cost splitting + demo payments. Reuses the existing (empty) ground_bookings table.
ALTER TABLE public.ground_bookings ALTER COLUMN host_id SET DEFAULT auth.uid(),
  ALTER COLUMN status SET DEFAULT 'confirmed',
  ADD COLUMN amount_per_player int NOT NULL DEFAULT 0;
GRANT SELECT, INSERT ON public.ground_bookings TO authenticated;
GRANT ALL ON public.ground_bookings TO service_role;
ALTER TABLE public.ground_bookings ENABLE ROW LEVEL SECURITY;
-- Price/players must never be edited after booking; nobody updates bookings directly.
DROP POLICY IF EXISTS "Hosts update own bookings" ON public.ground_bookings;

-- Price per player is always computed by the database: ceil(total / players) + platform fee
CREATE OR REPLACE FUNCTION public.booking_compute() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.booking_date < (now() AT TIME ZONE 'Asia/Kolkata')::date THEN RAISE EXCEPTION 'Date cannot be in the past'; END IF;
  NEW.platform_fee_per_player := 10; NEW.status := 'confirmed'; NEW.host_id := auth.uid();
  NEW.amount_per_player := ceil(NEW.total_price / NEW.required_players)::int + 10;
  RETURN NEW;
END $$;
CREATE TRIGGER booking_compute BEFORE INSERT ON public.ground_bookings FOR EACH ROW EXECUTE FUNCTION public.booking_compute();

ALTER TABLE public.matches ADD COLUMN booking_id uuid REFERENCES public.ground_bookings(id),
  ADD COLUMN ground_price int, ADD COLUMN amount_per_player int;
CREATE UNIQUE INDEX matches_booking_once ON public.matches (booking_id) WHERE booking_id IS NOT NULL AND status = 'open';

ALTER TABLE public.match_participants ADD COLUMN amount int,
  ADD COLUMN payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','payment_required','paid')),
  ADD COLUMN paid_at timestamptz;

-- A match created from a booking copies ground, price and player count from that booking (host must own it).
CREATE OR REPLACE FUNCTION public.matches_from_booking() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b ground_bookings;
BEGIN
  IF NEW.booking_id IS NULL THEN NEW.ground_price := NULL; NEW.amount_per_player := NULL; RETURN NEW; END IF;
  SELECT * INTO b FROM ground_bookings WHERE id = NEW.booking_id;
  IF b.id IS NULL OR b.host_id <> NEW.host_id OR b.status <> 'confirmed' THEN RAISE EXCEPTION 'Invalid booking'; END IF;
  NEW.ground_id := b.ground_id; NEW.max_players := b.required_players;
  NEW.ground_price := b.total_price::int; NEW.amount_per_player := b.amount_per_player; NEW.fee := b.amount_per_player - 10;
  RETURN NEW;
END $$;
CREATE TRIGGER matches_from_booking BEFORE INSERT ON public.matches FOR EACH ROW EXECUTE FUNCTION public.matches_from_booking();

-- Hosts cannot change host, booking, price or player count of a booked match.
CREATE OR REPLACE FUNCTION public.matches_guard_update() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _taken int;
BEGIN
  IF OLD.status = 'cancelled' AND NEW.status <> 'cancelled' THEN RAISE EXCEPTION 'A cancelled match cannot be reopened'; END IF;
  IF NEW.host_id <> OLD.host_id THEN RAISE EXCEPTION 'Host cannot be changed'; END IF;
  IF NEW.booking_id IS DISTINCT FROM OLD.booking_id OR NEW.ground_price IS DISTINCT FROM OLD.ground_price
     OR NEW.amount_per_player IS DISTINCT FROM OLD.amount_per_player
     OR (OLD.booking_id IS NOT NULL AND (NEW.max_players <> OLD.max_players OR NEW.ground_id <> OLD.ground_id OR NEW.fee <> OLD.fee)) THEN
    RAISE EXCEPTION 'Booking details cannot be changed';
  END IF;
  IF NEW.max_players < OLD.max_players THEN
    SELECT COALESCE(sum(spots), 0) INTO _taken FROM match_participants WHERE match_id = NEW.id;
    IF NEW.max_players < _taken THEN RAISE EXCEPTION 'Max players cannot be lower than the % spots already taken', _taken; END IF;
  END IF;
  RETURN NEW;
END $$;

-- Booked matches start at 0 players: the host organises, others join.
CREATE OR REPLACE FUNCTION public.match_host_join() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.booking_id IS NULL THEN
    INSERT INTO match_participants(match_id, user_id, spots) VALUES (NEW.id, NEW.host_id, 1) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

-- Keeps payment states in sync: pending while filling, payment_required once full. Paid stays paid.
CREATE OR REPLACE FUNCTION public.sync_payments(_m uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _max int; _bk uuid; _taken int;
BEGIN
  SELECT max_players, booking_id INTO _max, _bk FROM matches WHERE id = _m;
  IF _bk IS NULL THEN RETURN; END IF;
  SELECT COALESCE(sum(spots),0) INTO _taken FROM match_participants WHERE match_id = _m;
  UPDATE match_participants SET payment_status = CASE WHEN _taken >= _max THEN 'payment_required' ELSE 'pending' END
   WHERE match_id = _m AND payment_status <> 'paid'
     AND payment_status <> CASE WHEN _taken >= _max THEN 'payment_required' ELSE 'pending' END;
END $$;
CREATE OR REPLACE FUNCTION public.participants_sync() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM sync_payments(COALESCE(NEW.match_id, OLD.match_id)); RETURN NULL; END $$;
CREATE TRIGGER participants_sync AFTER INSERT OR DELETE ON public.match_participants FOR EACH ROW EXECUTE FUNCTION public.participants_sync();

CREATE OR REPLACE FUNCTION public.join_match(_m uuid, _spots int DEFAULT 1) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _me uuid := auth.uid(); mt matches; _taken int;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF _spots < 1 THEN RAISE EXCEPTION 'Invalid spots'; END IF;
  SELECT * INTO mt FROM matches WHERE id = _m FOR UPDATE;
  IF mt.id IS NULL OR mt.status <> 'open' THEN RAISE EXCEPTION 'Match not available'; END IF;
  IF mt.match_date < (now() AT TIME ZONE 'Asia/Kolkata')::date THEN RAISE EXCEPTION 'This match has already passed'; END IF;
  IF mt.booking_id IS NOT NULL AND mt.host_id = _me THEN RAISE EXCEPTION 'Hosts cannot join their own match'; END IF;
  IF mt.booking_id IS NOT NULL AND _spots <> 1 THEN RAISE EXCEPTION 'Each player joins with their own account'; END IF;
  IF EXISTS (SELECT 1 FROM match_participants WHERE match_id = _m AND user_id = _me) THEN RAISE EXCEPTION 'Already joined'; END IF;
  SELECT COALESCE(sum(spots),0) INTO _taken FROM match_participants WHERE match_id = _m;
  IF _taken + _spots > mt.max_players THEN RAISE EXCEPTION 'Match is full'; END IF;
  INSERT INTO match_participants(match_id, user_id, spots, amount) VALUES (_m, _me, _spots, mt.amount_per_player);
  DELETE FROM match_waitlist WHERE match_id = _m AND user_id = _me;
END $$;

-- Demo payment: only your own row, only once the match is full. No real money.
CREATE OR REPLACE FUNCTION public.pay_demo(_m uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF NOT EXISTS (SELECT 1 FROM matches WHERE id = _m AND status = 'open') THEN RAISE EXCEPTION 'Match not available'; END IF;
  UPDATE match_participants SET payment_status = 'paid', paid_at = now()
   WHERE match_id = _m AND user_id = auth.uid() AND payment_status = 'payment_required';
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment is not available yet'; END IF;
END $$;

-- Host removes a player from their own match.
CREATE OR REPLACE FUNCTION public.remove_player(_m uuid, _u uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM matches WHERE id = _m AND host_id = auth.uid()) THEN RAISE EXCEPTION 'Only the host can remove players'; END IF;
  IF _u = auth.uid() THEN RAISE EXCEPTION 'Hosts cancel the match instead'; END IF;
  DELETE FROM match_participants WHERE match_id = _m AND user_id = _u;
  IF NOT FOUND THEN RAISE EXCEPTION 'Player not in this match'; END IF;
END $$;

REVOKE EXECUTE ON FUNCTION public.pay_demo(uuid), public.remove_player(uuid, uuid), public.sync_payments(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pay_demo(uuid), public.remove_player(uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_payments(uuid) FROM authenticated;

ALTER TABLE public.ground_bookings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ground_bookings;