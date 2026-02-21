
-- =============================================
-- FIX 1: Move vote_api_key to separate table
-- =============================================

-- Create server_secrets table
CREATE TABLE public.server_secrets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id uuid NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  vote_api_key uuid DEFAULT gen_random_uuid(),
  UNIQUE(server_id)
);

-- Enable RLS
ALTER TABLE public.server_secrets ENABLE ROW LEVEL SECURITY;

-- Only server owners can read their secrets
CREATE POLICY "Owners can view their server secrets"
  ON public.server_secrets FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.servers
    WHERE servers.id = server_secrets.server_id
      AND servers.owner_id = auth.uid()
  ));

-- Only server owners can update their secrets
CREATE POLICY "Owners can update their server secrets"
  ON public.server_secrets FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.servers
    WHERE servers.id = server_secrets.server_id
      AND servers.owner_id = auth.uid()
  ));

-- Auto-create secrets row when server is created
CREATE POLICY "Owners can insert their server secrets"
  ON public.server_secrets FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.servers
    WHERE servers.id = server_secrets.server_id
      AND servers.owner_id = auth.uid()
  ));

-- Migrate existing data
INSERT INTO public.server_secrets (server_id, vote_api_key)
SELECT id, vote_api_key FROM public.servers
WHERE vote_api_key IS NOT NULL
ON CONFLICT (server_id) DO NOTHING;

-- Also create secrets for servers without vote_api_key
INSERT INTO public.server_secrets (server_id)
SELECT id FROM public.servers
WHERE id NOT IN (SELECT server_id FROM public.server_secrets)
ON CONFLICT (server_id) DO NOTHING;

-- Remove vote_api_key from servers table
ALTER TABLE public.servers DROP COLUMN vote_api_key;

-- =============================================
-- FIX 2: Restrict votes SELECT to server owners
-- =============================================

-- Drop the public SELECT policy on votes
DROP POLICY "Votes are viewable by everyone" ON public.votes;

-- Only server owners can view votes for their servers
CREATE POLICY "Server owners can view votes"
  ON public.votes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.servers
    WHERE servers.id = votes.server_id
      AND servers.owner_id = auth.uid()
  ));

-- Create trigger to auto-create server_secrets when a server is created
CREATE OR REPLACE FUNCTION public.create_server_secrets()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.server_secrets (server_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_server_created_secrets
  AFTER INSERT ON public.servers
  FOR EACH ROW
  EXECUTE FUNCTION public.create_server_secrets();
