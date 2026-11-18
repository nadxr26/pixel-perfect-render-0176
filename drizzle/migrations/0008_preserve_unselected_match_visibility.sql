DROP POLICY IF EXISTS "Users view available or joined matches" ON public.matches;
CREATE POLICY "Signed-in users view matches" ON public.matches
  FOR SELECT TO authenticated USING (true);