REVOKE SELECT ON TABLE public.match_waitlist FROM authenticated;
GRANT SELECT (match_id, created_at) ON TABLE public.match_waitlist TO authenticated;
GRANT SELECT (match_id, user_id, created_at) ON TABLE public.match_waitlist TO authenticated;

CREATE OR REPLACE FUNCTION public.get_waitlist_counts(_match_ids uuid[])
RETURNS TABLE (match_id uuid, waitlist_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT w.match_id, count(*)
  FROM public.match_waitlist w
  WHERE auth.uid() IS NOT NULL
    AND w.match_id = ANY(_match_ids)
    AND public.can_view_match(w.match_id, auth.uid())
  GROUP BY w.match_id;
$$;
REVOKE ALL ON FUNCTION public.get_waitlist_counts(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_waitlist_counts(uuid[]) TO authenticated;