CREATE OR REPLACE FUNCTION public.can_view_match_participant_list(_match_id uuid, _viewer_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT _viewer_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = _match_id
      AND (
        m.host_id = _viewer_id
        OR (m.status = 'open' AND m.match_date >= (now() AT TIME ZONE 'Asia/Kolkata')::date)
        OR EXISTS (
          SELECT 1 FROM public.match_participants mp
          WHERE mp.match_id = m.id AND mp.user_id = _viewer_id
        )
      )
  );
$$;
REVOKE ALL ON FUNCTION public.can_view_match_participant_list(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_match_participant_list(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Users view relevant match participants" ON public.match_participants;
CREATE POLICY "Users view relevant match participants" ON public.match_participants
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.can_view_match_participant_list(match_id, auth.uid())
  );

DROP POLICY IF EXISTS "Users view connected profiles" ON public.profiles;
CREATE POLICY "Users view connected profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.follows f
      WHERE (f.follower_id = auth.uid() AND f.following_id = profiles.id)
         OR (f.following_id = auth.uid() AND f.follower_id = profiles.id)
    )
    OR EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.user_id = profiles.id
        AND public.is_member(cm.conversation_id, auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.status = 'open'
        AND m.match_date >= (now() AT TIME ZONE 'Asia/Kolkata')::date
        AND (
          m.host_id = profiles.id
          OR EXISTS (
            SELECT 1 FROM public.match_participants mp
            WHERE mp.match_id = m.id AND mp.user_id = profiles.id
          )
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.host_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.match_participants mp
          WHERE mp.match_id = m.id AND mp.user_id = profiles.id
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.match_participants mp
      WHERE mp.user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.match_participants other_mp
          WHERE other_mp.match_id = mp.match_id AND other_mp.user_id = profiles.id
        )
    )
  );

DROP FUNCTION IF EXISTS public.get_waitlist_counts(uuid[]);