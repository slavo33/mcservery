-- 1. Voter IP privacy: column-level security on votes
REVOKE SELECT ON public.votes FROM authenticated;
REVOKE SELECT ON public.votes FROM anon;
GRANT SELECT (id, server_id, minecraft_nick, claimed, created_at) ON public.votes TO authenticated;
GRANT SELECT (id, server_id, minecraft_nick, claimed, created_at) ON public.votes TO anon;

-- 2. user_roles: users can only read their own role
DROP POLICY IF EXISTS "Roles viewable by authenticated users" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 3. server-images storage: scope upload/delete to the user's own folder
DROP POLICY IF EXISTS "Users can upload server images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete server images" ON storage.objects;

CREATE POLICY "Users can upload own server images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'server-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own server images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'server-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Remove broad listing on public buckets (public direct-link access still works)
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Server images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view bug screenshots" ON storage.objects;

-- 5. Realtime authorization: only server owners/admins may subscribe to a server's chat topics
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Server owners can receive chat realtime" ON realtime.messages;
CREATE POLICY "Server owners can receive chat realtime"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.servers s
    WHERE s.owner_id = auth.uid()
      AND realtime.topic() IN (
        'chat-messages-' || s.id::text,
        'chat-players-' || s.id::text
      )
  )
);

-- 6. Function search_path hardening
ALTER FUNCTION public.generate_staff_post_slug(text) SET search_path = 'public';
