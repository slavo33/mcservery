
-- Votes table
CREATE TABLE public.votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  minecraft_nick text NOT NULL,
  voter_ip text NOT NULL,
  claimed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for cooldown check (nick + server + time)
CREATE INDEX idx_votes_cooldown ON public.votes (server_id, minecraft_nick, created_at DESC);
CREATE INDEX idx_votes_pending ON public.votes (server_id, claimed) WHERE NOT claimed;

-- Add vote_count to servers
ALTER TABLE public.servers ADD COLUMN vote_count integer NOT NULL DEFAULT 0;

-- Add vote_api_key to servers (for MC plugin authentication)
ALTER TABLE public.servers ADD COLUMN vote_api_key uuid DEFAULT gen_random_uuid();

-- Enable RLS
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- Everyone can read votes (for counts)
CREATE POLICY "Votes are viewable by everyone" ON public.votes FOR SELECT USING (true);

-- Anyone can insert votes (no auth required, controlled by edge function)
CREATE POLICY "Anyone can vote via edge function" ON public.votes FOR INSERT WITH CHECK (true);

-- Only server owner can update votes (mark claimed)
CREATE POLICY "Server owners can update votes" ON public.votes FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.servers WHERE id = server_id AND owner_id = auth.uid())
);

-- Trigger to update vote_count
CREATE OR REPLACE FUNCTION public.update_server_vote_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.servers SET vote_count = vote_count + 1 WHERE id = NEW.server_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.servers SET vote_count = vote_count - 1 WHERE id = OLD.server_id;
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER update_vote_count
AFTER INSERT OR DELETE ON public.votes
FOR EACH ROW
EXECUTE FUNCTION public.update_server_vote_count();
