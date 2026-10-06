ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS is_group boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS name text CHECK (name IS NULL OR char_length(name) BETWEEN 1 AND 60),
  ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.conversation_members ADD COLUMN IF NOT EXISTS hidden_at timestamptz;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_to uuid REFERENCES public.messages(id) ON DELETE SET NULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Delete chat for me only: hides history up to now; new messages bring it back.
CREATE OR REPLACE FUNCTION public.hide_conversation(_c uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE conversation_members SET hidden_at = now() WHERE conversation_id = _c AND user_id = auth.uid();
$$;

-- Unsend: only the sender, removed for everyone.
CREATE OR REPLACE FUNCTION public.unsend_message(_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM messages WHERE id = _id AND sender_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'You can only unsend your own messages'; END IF;
END $$;

-- Group creation with real users only.
CREATE OR REPLACE FUNCTION public.create_group(_name text, _members uuid[]) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _me uuid := auth.uid(); _c uuid; _u uuid;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF _name IS NULL OR char_length(trim(_name)) < 1 OR char_length(trim(_name)) > 60 THEN RAISE EXCEPTION 'Group name must be 1-60 characters'; END IF;
  IF coalesce(array_length(_members,1),0) < 1 OR array_length(_members,1) > 50 THEN RAISE EXCEPTION 'Pick 1 to 50 members'; END IF;
  INSERT INTO conversations(is_group, name, created_by) VALUES (true, trim(_name), _me) RETURNING id INTO _c;
  INSERT INTO conversation_members(conversation_id, user_id) VALUES (_c, _me);
  FOREACH _u IN ARRAY _members LOOP
    IF _u <> _me AND EXISTS (SELECT 1 FROM profiles WHERE id = _u) THEN
      INSERT INTO conversation_members(conversation_id, user_id) VALUES (_c, _u) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  RETURN _c;
END $$;

REVOKE EXECUTE ON FUNCTION public.hide_conversation(uuid), public.unsend_message(uuid), public.create_group(text, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hide_conversation(uuid), public.unsend_message(uuid), public.create_group(text, uuid[]) TO authenticated;

-- Replies must point to a message in the same conversation.
CREATE OR REPLACE FUNCTION public.messages_reply_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.reply_to IS NOT NULL AND NOT EXISTS (SELECT 1 FROM messages WHERE id = NEW.reply_to AND conversation_id = NEW.conversation_id) THEN
    RAISE EXCEPTION 'Invalid reply';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS messages_reply_guard ON public.messages;
CREATE TRIGGER messages_reply_guard BEFORE INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.messages_reply_guard();

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;