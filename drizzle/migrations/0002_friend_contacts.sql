ALTER TABLE public.players ADD COLUMN IF NOT EXISTS contact text;

CREATE OR REPLACE FUNCTION public.friend_contacts() RETURNS TABLE(other uuid, contact text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.id, o.contact FROM friendships f
  JOIN players o ON o.id = CASE WHEN f.requester = auth.uid() THEN f.addressee ELSE f.requester END
  WHERE f.status = 'accepted' AND (f.requester = auth.uid() OR f.addressee = auth.uid()) AND o.contact IS NOT NULL
$$;
REVOKE EXECUTE ON FUNCTION public.friend_contacts() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.friend_contacts() TO authenticated;