
CREATE TABLE public.staff_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_comment_id uuid REFERENCES public.staff_comments(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  reaction text NOT NULL CHECK (reaction IN ('heart','thumbs_up','thumbs_down','laugh','fire','sad')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_comment_id, user_id, reaction)
);

ALTER TABLE public.staff_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff reactions viewable by everyone"
ON public.staff_reactions FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated users can add staff reactions"
ON public.staff_reactions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their staff reactions"
ON public.staff_reactions FOR DELETE TO authenticated
USING (auth.uid() = user_id);
