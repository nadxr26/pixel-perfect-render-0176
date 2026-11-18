DROP POLICY IF EXISTS "Players and hosts view match waitlist" ON public.match_waitlist;
CREATE POLICY "Signed-in users view waitlist" ON public.match_waitlist
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON TABLE public.match_waitlist FROM authenticated;
GRANT SELECT ON TABLE public.match_waitlist TO authenticated;
DROP FUNCTION IF EXISTS public.get_waitlist_counts(uuid[]);