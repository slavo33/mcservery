
CREATE TABLE public.staff_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid REFERENCES public.servers(id) ON DELETE CASCADE NOT NULL,
  owner_id uuid NOT NULL,
  position text NOT NULL,
  description text NOT NULL DEFAULT '',
  requirements text NOT NULL DEFAULT '',
  server_ip text NOT NULL DEFAULT '',
  discord_url text,
  website_url text,
  images text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_posts ENABLE ROW LEVEL SECURITY;

-- Everyone can read active posts
CREATE POLICY "Active staff posts are viewable by everyone"
ON public.staff_posts FOR SELECT
TO public
USING (is_active = true);

-- Owners can see their own posts (even inactive)
CREATE POLICY "Owners can view own staff posts"
ON public.staff_posts FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

-- Owners can create posts for their servers
CREATE POLICY "Owners can create staff posts"
ON public.staff_posts FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = owner_id
  AND EXISTS (SELECT 1 FROM public.servers WHERE id = server_id AND owner_id = auth.uid())
);

-- Owners can update their posts
CREATE POLICY "Owners can update staff posts"
ON public.staff_posts FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id);

-- Owners can delete their posts
CREATE POLICY "Owners can delete staff posts"
ON public.staff_posts FOR DELETE
TO authenticated
USING (auth.uid() = owner_id);

-- Admins can manage all posts
CREATE POLICY "Admins can manage staff posts"
ON public.staff_posts FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Auto-update updated_at
CREATE TRIGGER update_staff_posts_updated_at
  BEFORE UPDATE ON public.staff_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
