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
  );
DROP FUNCTION IF EXISTS public.can_view_profile(uuid);
DROP FUNCTION IF EXISTS public.can_view_match(uuid, uuid);