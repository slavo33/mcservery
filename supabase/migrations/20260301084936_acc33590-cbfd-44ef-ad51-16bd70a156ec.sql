-- Create a secure function to get top voters for a server (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_top_voters(p_server_id uuid, p_limit integer DEFAULT 5)
RETURNS TABLE(nick text, vote_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT minecraft_nick AS nick, COUNT(*) AS vote_count
  FROM public.votes
  WHERE server_id = p_server_id
  GROUP BY minecraft_nick
  ORDER BY vote_count DESC
  LIMIT LEAST(p_limit, 20)
$$;