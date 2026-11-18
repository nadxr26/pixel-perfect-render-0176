CREATE OR REPLACE FUNCTION public.can_view_profile(_profile_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    _profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.follows f
      WHERE (f.follower_id = auth.uid() AND f.following_id = _profile_id)
         OR (f.following_id = auth.uid() AND f.follower_id = _profile_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.user_id = _profile_id
        AND EXISTS (
          SELECT 1 FROM public.conversation_members mine
          WHERE mine.conversation_id = cm.conversation_id AND mine.user_id = auth.uid()
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.status = 'open'
        AND m.match_date >= (now() AT TIME ZONE 'Asia/Kolkata')::date
        AND (
          m.host_id = _profile_id
          OR EXISTS (
            SELECT 1 FROM public.match_participants mp
            WHERE mp.match_id = m.id AND mp.user_id = _profile_id
          )
        )
    )
  );
$$;
REVOKE ALL ON FUNCTION public.can_view_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_profile(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_view_match(_match_id uuid, _viewer_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT _viewer_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = _match_id
      AND (
        (m.status = 'open' AND m.match_date >= (now() AT TIME ZONE 'Asia/Kolkata')::date)
        OR m.host_id = _viewer_id
        OR EXISTS (
          SELECT 1 FROM public.match_participants mp
          WHERE mp.match_id = m.id AND mp.user_id = _viewer_id
        )
      )
  );
$$;
REVOKE ALL ON FUNCTION public.can_view_match(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_match(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Users view connected profiles" ON public.profiles;
CREATE POLICY "Users view connected profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.can_view_profile(id));

DROP POLICY IF EXISTS "Signed-in users view matches" ON public.matches;
CREATE POLICY "Users view available or joined matches" ON public.matches
  FOR SELECT TO authenticated
  USING (
    (status = 'open' AND match_date >= (now() AT TIME ZONE 'Asia/Kolkata')::date)
    OR host_id = auth.uid()
    OR public.can_view_match(id, auth.uid())
  );