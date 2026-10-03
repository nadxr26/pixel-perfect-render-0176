-- Follow system. Reuses public.profiles (same ids as auth users); no new user/profile system.
CREATE TABLE public.follows (
  follower_id  uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),                       -- no duplicate follows
  CONSTRAINT follows_no_self_follow CHECK (follower_id <> following_id)
);
CREATE INDEX follows_following_idx ON public.follows (following_id, created_at DESC); -- "who follows X" + follower counts
CREATE INDEX follows_follower_idx  ON public.follows (follower_id, created_at DESC);  -- "who does X follow" + following counts

GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;   -- no UPDATE: a follow is created or removed, never edited
GRANT ALL ON public.follows TO service_role;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Signed-in users can see follow relationships (needed for counts and follower/following lists, like profiles).
CREATE POLICY "Signed-in users view follows" ON public.follows FOR SELECT TO authenticated USING (true);
-- You can only create follows where YOU are the follower, and never follow yourself.
CREATE POLICY "Users follow as themselves" ON public.follows FOR INSERT TO authenticated
  WITH CHECK (follower_id = auth.uid() AND follower_id <> following_id);
-- You can only remove your own follows (unfollow). Nobody can remove someone else's.
CREATE POLICY "Users unfollow as themselves" ON public.follows FOR DELETE TO authenticated
  USING (follower_id = auth.uid());

ALTER TABLE public.follows REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.follows;