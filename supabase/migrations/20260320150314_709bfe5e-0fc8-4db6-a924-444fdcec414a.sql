
-- Add likes_count to staff_posts
ALTER TABLE public.staff_posts ADD COLUMN IF NOT EXISTS likes_count integer NOT NULL DEFAULT 0;

-- Create staff_post_likes table
CREATE TABLE public.staff_post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_post_id uuid NOT NULL REFERENCES public.staff_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_post_id, user_id)
);

-- Enable RLS
ALTER TABLE public.staff_post_likes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Staff post likes viewable by everyone"
  ON public.staff_post_likes FOR SELECT TO public
  USING (true);

CREATE POLICY "Authenticated users can like staff posts"
  ON public.staff_post_likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike staff posts"
  ON public.staff_post_likes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Trigger to update likes_count
CREATE OR REPLACE FUNCTION public.update_staff_post_likes_count()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.staff_posts SET likes_count = likes_count + 1 WHERE id = NEW.staff_post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.staff_posts SET likes_count = likes_count - 1 WHERE id = OLD.staff_post_id;
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER update_staff_post_likes_count_trigger
  AFTER INSERT OR DELETE ON public.staff_post_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_staff_post_likes_count();
