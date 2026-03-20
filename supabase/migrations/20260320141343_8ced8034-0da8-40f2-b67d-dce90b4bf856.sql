
CREATE TABLE public.staff_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_post_id uuid REFERENCES public.staff_posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_comments ENABLE ROW LEVEL SECURITY;

-- Everyone can read comments on active posts
CREATE POLICY "Staff comments are viewable by everyone"
ON public.staff_comments FOR SELECT
TO public
USING (true);

-- Authenticated users can add comments
CREATE POLICY "Authenticated users can add staff comments"
ON public.staff_comments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Authors can delete their comments
CREATE POLICY "Authors can delete their staff comments"
ON public.staff_comments FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Admins can manage all comments
CREATE POLICY "Admins can manage staff comments"
ON public.staff_comments FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
