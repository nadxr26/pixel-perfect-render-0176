CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  photo text,
  city text,
  sports text[] NOT NULL DEFAULT '{}',
  skill_level text NOT NULL DEFAULT 'Intermediate',
  location_sharing boolean NOT NULL DEFAULT true,
  last_seen timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Private coordinates: only the owner can see their own row
CREATE TABLE public.user_locations (
  user_id uuid PRIMARY KEY,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_locations TO authenticated;
GRANT ALL ON public.user_locations TO service_role;
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own location only" ON public.user_locations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.conversation_members (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  PRIMARY KEY (conversation_id, user_id)
);
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
CREATE INDEX ON public.messages (conversation_id, created_at);
GRANT SELECT ON public.conversations TO authenticated;
GRANT SELECT ON public.conversation_members TO authenticated;
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.conversations, public.conversation_members, public.messages TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_member(_conv uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = _conv AND user_id = _user)
$$;

CREATE POLICY "Members view conversations" ON public.conversations FOR SELECT TO authenticated USING (public.is_member(id, auth.uid()));
CREATE POLICY "Members view membership" ON public.conversation_members FOR SELECT TO authenticated USING (public.is_member(conversation_id, auth.uid()));
CREATE POLICY "Members read messages" ON public.messages FOR SELECT TO authenticated USING (public.is_member(conversation_id, auth.uid()));
CREATE POLICY "Members send as themselves" ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND public.is_member(conversation_id, auth.uid()));

-- Create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, city, sports, skill_level)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'city',
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'sports')), '{}'),
    COALESCE(NEW.raw_user_meta_data->>'skill_level', 'Intermediate')
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Open (or create) a 1-to-1 conversation with another user
CREATE OR REPLACE FUNCTION public.get_or_create_dm(_other uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _me uuid := auth.uid(); _c uuid;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF _other = _me OR NOT EXISTS (SELECT 1 FROM profiles WHERE id = _other) THEN RAISE EXCEPTION 'Invalid user'; END IF;
  SELECT a.conversation_id INTO _c FROM conversation_members a
    JOIN conversation_members b ON b.conversation_id = a.conversation_id AND b.user_id = _other
    WHERE a.user_id = _me LIMIT 1;
  IF _c IS NULL THEN
    INSERT INTO conversations DEFAULT VALUES RETURNING id INTO _c;
    INSERT INTO conversation_members VALUES (_c, _me), (_c, _other);
  END IF;
  RETURN _c;
END $$;

-- Mark incoming messages as read
CREATE OR REPLACE FUNCTION public.mark_read(_conv uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE messages SET read_at = now()
  WHERE conversation_id = _conv AND sender_id <> auth.uid() AND read_at IS NULL
    AND public.is_member(_conv, auth.uid());
$$;

-- List players with approximate distance only (never coordinates)
CREATE OR REPLACE FUNCTION public.list_players()
RETURNS TABLE (id uuid, name text, photo text, city text, sports text[], skill_level text, last_seen timestamptz, distance_km numeric, distance_hidden boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (
    SELECT p.location_sharing AS share, l.lat, l.lng FROM profiles p LEFT JOIN user_locations l ON l.user_id = p.id WHERE p.id = auth.uid()
  )
  SELECT p.id, p.name, p.photo, p.city, p.sports, p.skill_level, p.last_seen,
    CASE WHEN p.location_sharing AND me.share AND l.lat IS NOT NULL AND me.lat IS NOT NULL THEN
      round((2 * 6371 * asin(sqrt(
        power(sin(radians(l.lat - me.lat) / 2), 2) +
        cos(radians(me.lat)) * cos(radians(l.lat)) * power(sin(radians(l.lng - me.lng) / 2), 2)
      )))::numeric, 1)
    END,
    NOT (p.location_sharing AND COALESCE(me.share, false))
  FROM profiles p LEFT JOIN user_locations l ON l.user_id = p.id LEFT JOIN me ON true
  WHERE auth.uid() IS NOT NULL AND p.id <> auth.uid()
  ORDER BY p.created_at DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.get_or_create_dm(uuid), public.mark_read(uuid), public.list_players(), public.is_member(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_or_create_dm(uuid), public.mark_read(uuid), public.list_players(), public.is_member(uuid, uuid) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;