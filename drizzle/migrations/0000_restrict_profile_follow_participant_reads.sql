DROP POLICY IF EXISTS "Signed-in users view follows" ON public.follows;
CREATE POLICY "Users view their follow relationships" ON public.follows
  FOR SELECT TO authenticated
  USING (follower_id = auth.uid() OR following_id = auth.uid());

DROP POLICY IF EXISTS "Signed-in users can view profiles" ON public.profiles;
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
  );

DROP POLICY IF EXISTS "Signed-in users view participants" ON public.match_participants;
CREATE POLICY "Users view relevant match participants" ON public.match_participants
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_participants.match_id AND m.host_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_participants.match_id
        AND m.status = 'open'
        AND m.match_date >= (now() AT TIME ZONE 'Asia/Kolkata')::date
    )
  );

REVOKE SELECT ON TABLE public.match_participants FROM authenticated;
GRANT SELECT (match_id, user_id, spots, joined_at) ON TABLE public.match_participants TO authenticated;

CREATE OR REPLACE FUNCTION public.get_follow_counts(_profile_id uuid)
RETURNS TABLE (followers bigint, following bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.follows f WHERE f.following_id = _profile_id),
    (SELECT count(*) FROM public.follows f WHERE f.follower_id = _profile_id)
  WHERE auth.uid() IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _profile_id);
$$;
REVOKE ALL ON FUNCTION public.get_follow_counts(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_follow_counts(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_match_payment_details(_match_ids uuid[])
RETURNS TABLE (match_id uuid, user_id uuid, payment_status text, amount integer, paid_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT mp.match_id, mp.user_id, mp.payment_status, mp.amount, mp.paid_at
  FROM public.match_participants mp
  JOIN public.matches m ON m.id = mp.match_id
  WHERE auth.uid() IS NOT NULL
    AND mp.match_id = ANY(_match_ids)
    AND (m.host_id = auth.uid() OR mp.user_id = auth.uid());
$$;
REVOKE ALL ON FUNCTION public.get_match_payment_details(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_match_payment_details(uuid[]) TO authenticated;