DROP POLICY IF EXISTS "Signed-in users view waitlist" ON public.match_waitlist;
DROP POLICY IF EXISTS "Players and hosts view match waitlist" ON public.match_waitlist;
CREATE POLICY "Players and hosts view match waitlist" ON public.match_waitlist
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_waitlist.match_id AND m.host_id = auth.uid()
    )
  );
REVOKE SELECT ON TABLE public.match_waitlist FROM authenticated;
GRANT SELECT (match_id, user_id, created_at) ON TABLE public.match_waitlist TO authenticated;

CREATE OR REPLACE FUNCTION public.get_waitlist_counts(_match_ids uuid[])
RETURNS TABLE (match_id uuid, waitlist_count bigint, my_position bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH ordered AS (
    SELECT w.match_id, w.user_id,
      row_number() OVER (PARTITION BY w.match_id ORDER BY w.created_at, w.user_id) AS position
    FROM public.match_waitlist w
    JOIN public.matches m ON m.id = w.match_id
    WHERE w.match_id = ANY(_match_ids)
      AND (
        m.host_id = auth.uid()
        OR (m.status = 'open' AND m.match_date >= (now() AT TIME ZONE 'Asia/Kolkata')::date)
        OR EXISTS (
          SELECT 1 FROM public.match_participants mp
          WHERE mp.match_id = m.id AND mp.user_id = auth.uid()
        )
      )
  )
  SELECT o.match_id, count(*)::bigint,
    max(o.position) FILTER (WHERE o.user_id = auth.uid())
  FROM ordered o
  WHERE auth.uid() IS NOT NULL
  GROUP BY o.match_id;
$$;
REVOKE ALL ON FUNCTION public.get_waitlist_counts(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_waitlist_counts(uuid[]) TO authenticated;