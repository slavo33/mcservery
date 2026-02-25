
-- Add slug column to servers
ALTER TABLE public.servers ADD COLUMN slug TEXT UNIQUE;

-- Create function to generate slug from IP
CREATE OR REPLACE FUNCTION public.generate_server_slug(server_ip TEXT)
RETURNS TEXT AS $$
DECLARE
  parts TEXT[];
  domain_name TEXT;
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 0;
BEGIN
  -- Split IP by dots
  parts := string_to_array(server_ip, '.');
  
  -- If it looks like a domain (has more than 4 parts or contains non-numeric parts)
  -- Extract the main domain name (second-to-last part before TLD)
  IF array_length(parts, 1) >= 3 AND parts[1] ~ '[a-zA-Z]' THEN
    -- e.g. play.crownix.eu -> crownix
    base_slug := lower(parts[array_length(parts, 1) - 1]);
  ELSIF array_length(parts, 1) >= 2 AND parts[1] ~ '[a-zA-Z]' THEN
    -- e.g. crownix.eu -> crownix
    base_slug := lower(parts[1]);
  ELSE
    -- Pure IP address, use full IP with dashes
    base_slug := replace(server_ip, '.', '-');
    base_slug := replace(base_slug, ':', '-');
  END IF;
  
  -- Remove non-alphanumeric chars except dashes
  base_slug := regexp_replace(base_slug, '[^a-z0-9-]', '', 'g');
  
  -- Check uniqueness
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.servers WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Populate existing servers with slugs
UPDATE public.servers SET slug = public.generate_server_slug(ip) WHERE slug IS NULL;

-- Make slug NOT NULL after populating
ALTER TABLE public.servers ALTER COLUMN slug SET NOT NULL;

-- Create trigger to auto-generate slug on insert
CREATE OR REPLACE FUNCTION public.set_server_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generate_server_slug(NEW.ip);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_server_slug_trigger
BEFORE INSERT ON public.servers
FOR EACH ROW
EXECUTE FUNCTION public.set_server_slug();
