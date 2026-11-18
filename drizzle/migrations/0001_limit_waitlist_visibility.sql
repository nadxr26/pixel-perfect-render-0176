DROP POLICY IF EXISTS "Signed-in users view waitlist" ON public.match_waitlist;
CREATE POLICY "Players and hosts view match waitlist" ON public.match_waitlist
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_waitlist.match_id AND m.host_id = auth.uid()
    )
  );