
-- Add slug column to staff_posts
ALTER TABLE public.staff_posts ADD COLUMN IF NOT EXISTS slug text;

-- Create a function to generate staff post slug from server_ip
CREATE OR REPLACE FUNCTION public.generate_staff_post_slug(server_ip_val text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  -- Extract domain name from IP (e.g., 'play.crownix.eu' -> 'crownix')
  -- Same logic as generate_server_slug
  base_slug := server_ip_val;
  -- Remove port if present
  base_slug := split_part(base_slug, ':', 1);
  -- Try to extract the meaningful part of the domain
  -- For domains like play.crownix.eu, take 'crownix'
  IF base_slug LIKE '%.%' THEN
    -- Split by dots and take the second-to-last part for domains with 3+ parts
    IF array_length(string_to_array(base_slug, '.'), 1) >= 3 THEN
      base_slug := (string_to_array(base_slug, '.'))[array_length(string_to_array(base_slug, '.'), 1) - 1];
    ELSIF array_length(string_to_array(base_slug, '.'), 1) = 2 THEN
      base_slug := (string_to_array(base_slug, '.'))[1];
    END IF;
  END IF;
  -- Lowercase and remove non-alphanumeric
  base_slug := lower(regexp_replace(base_slug, '[^a-zA-Z0-9]', '', 'g'));
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'post';
  END IF;
  
  -- Check uniqueness
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.staff_posts WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$;

-- Create trigger function
CREATE OR REPLACE FUNCTION public.set_staff_post_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generate_staff_post_slug(NEW.server_ip);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS tr_set_staff_post_slug ON public.staff_posts;
CREATE TRIGGER tr_set_staff_post_slug
  BEFORE INSERT ON public.staff_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_staff_post_slug();

-- Backfill existing posts with slugs
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, server_ip FROM public.staff_posts WHERE slug IS NULL OR slug = '' LOOP
    UPDATE public.staff_posts SET slug = public.generate_staff_post_slug(r.server_ip) WHERE id = r.id;
  END LOOP;
END;
$$;

-- Make slug unique and not null after backfill
ALTER TABLE public.staff_posts ALTER COLUMN slug SET NOT NULL;
ALTER TABLE public.staff_posts ALTER COLUMN slug SET DEFAULT '';
CREATE UNIQUE INDEX IF NOT EXISTS staff_posts_slug_unique ON public.staff_posts (slug);
