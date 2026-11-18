DROP FUNCTION public.get_waitlist_counts(uuid[]);
CREATE FUNCTION public.get_waitlist_counts(_match_ids uuid[])
RETURNS TABLE (match_id uuid, waitlist_count bigint, my_position bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH ordered AS (
    SELECT w.match_id, w.user_id,
      row_number() OVER (PARTITION BY w.match_id ORDER BY w.created_at, w.user_id) AS position
    FROM public.match_waitlist w
    WHERE w.match_id = ANY(_match_ids)
  )
  SELECT o.match_id, count(*)::bigint,
    max(o.position) FILTER (WHERE o.user_id = auth.uid())
  FROM ordered o
  WHERE auth.uid() IS NOT NULL AND public.can_view_match(o.match_id, auth.uid())
  GROUP BY o.match_id;
$$;
REVOKE ALL ON FUNCTION public.get_waitlist_counts(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_waitlist_counts(uuid[]) TO authenticated;