
-- Chat connections - links a server to its chat plugin API key
CREATE TABLE public.chat_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid REFERENCES public.servers(id) ON DELETE CASCADE NOT NULL UNIQUE,
  api_key uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.chat_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Server owners can view chat connections"
  ON public.chat_connections FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.servers WHERE servers.id = chat_connections.server_id AND servers.owner_id = auth.uid()));

CREATE POLICY "Server owners can insert chat connections"
  ON public.chat_connections FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.servers WHERE servers.id = chat_connections.server_id AND servers.owner_id = auth.uid()));

CREATE POLICY "Server owners can update chat connections"
  ON public.chat_connections FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.servers WHERE servers.id = chat_connections.server_id AND servers.owner_id = auth.uid()));

CREATE POLICY "Server owners can delete chat connections"
  ON public.chat_connections FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.servers WHERE servers.id = chat_connections.server_id AND servers.owner_id = auth.uid()));

CREATE POLICY "Admins can manage chat connections"
  ON public.chat_connections FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Chat messages
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid REFERENCES public.servers(id) ON DELETE CASCADE NOT NULL,
  player_name text,
  user_id uuid,
  source text NOT NULL DEFAULT 'minecraft',
  message text NOT NULL,
  delivered boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Server owners can view chat messages"
  ON public.chat_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.servers WHERE servers.id = chat_messages.server_id AND servers.owner_id = auth.uid()));

CREATE POLICY "Server owners can insert web messages"
  ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    source = 'web' AND
    (EXISTS (SELECT 1 FROM public.servers WHERE servers.id = chat_messages.server_id AND servers.owner_id = auth.uid())
     OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Admins can view chat messages"
  ON public.chat_messages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Online players tracking
CREATE TABLE public.chat_online_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid REFERENCES public.servers(id) ON DELETE CASCADE NOT NULL,
  player_name text NOT NULL,
  player_uuid text,
  joined_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(server_id, player_name)
);

ALTER TABLE public.chat_online_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Server owners can view online players"
  ON public.chat_online_players FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.servers WHERE servers.id = chat_online_players.server_id AND servers.owner_id = auth.uid()));

CREATE POLICY "Admins can view online players"
  ON public.chat_online_players FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for online players
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_online_players;
