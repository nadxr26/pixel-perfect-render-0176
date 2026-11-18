DROP POLICY IF EXISTS "Users view relevant match participants" ON public.match_participants;
DROP FUNCTION public.can_view_match_participant_list(uuid, uuid);
CREATE FUNCTION public.can_view_match_participant_list(_match_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = _match_id
      AND (
        m.host_id = auth.uid()
        OR (m.status = 'open' AND m.match_date >= (now() AT TIME ZONE 'Asia/Kolkata')::date)
        OR EXISTS (
          SELECT 1 FROM public.match_participants mp
          WHERE mp.match_id = m.id AND mp.user_id = auth.uid()
        )
      )
  );
$$;
REVOKE ALL ON FUNCTION public.can_view_match_participant_list(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_match_participant_list(uuid) TO authenticated;
CREATE POLICY "Users view relevant match participants" ON public.match_participants
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.can_view_match_participant_list(match_id)
  );