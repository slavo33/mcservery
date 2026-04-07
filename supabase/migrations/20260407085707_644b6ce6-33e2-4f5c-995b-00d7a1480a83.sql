
-- 1. Unique constraint on server IP
ALTER TABLE public.servers ADD CONSTRAINT servers_ip_unique UNIQUE (ip);

-- 2. Ban check function for RLS
CREATE OR REPLACE FUNCTION public.is_banned(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.banned_users WHERE user_id = _user_id
  )
$$;

-- 3. User server count check
CREATE OR REPLACE FUNCTION public.user_server_count(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer FROM public.servers WHERE owner_id = _user_id
$$;

-- 4. User staff post count check
CREATE OR REPLACE FUNCTION public.user_staff_post_count(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer FROM public.staff_posts WHERE owner_id = _user_id
$$;

-- 5. Drop old INSERT policies and recreate with ban + limit checks
DROP POLICY IF EXISTS "Authenticated users can create servers" ON public.servers;
CREATE POLICY "Authenticated users can create servers" ON public.servers
  FOR INSERT TO public
  WITH CHECK (
    auth.uid() = owner_id
    AND NOT public.is_banned(auth.uid())
    AND public.user_server_count(auth.uid()) < 5
  );

DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.comments;
CREATE POLICY "Authenticated users can create comments" ON public.comments
  FOR INSERT TO public
  WITH CHECK (
    auth.uid() = user_id
    AND NOT public.is_banned(auth.uid())
  );

DROP POLICY IF EXISTS "Owners can create staff posts" ON public.staff_posts;
CREATE POLICY "Owners can create staff posts" ON public.staff_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = owner_id
    AND EXISTS (SELECT 1 FROM servers WHERE servers.id = staff_posts.server_id AND servers.owner_id = auth.uid())
    AND NOT public.is_banned(auth.uid())
    AND public.user_staff_post_count(auth.uid()) < 5
  );
