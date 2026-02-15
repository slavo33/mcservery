
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can read profiles (for displaying nicknames/avatars on comments)
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nickname', 'Hráč'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Servers table
CREATE TABLE public.servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  ip TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.20.4',
  platform TEXT[] NOT NULL DEFAULT '{java}',
  proxy TEXT,
  software TEXT NOT NULL DEFAULT 'Paper',
  minigames TEXT[] NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  images TEXT[] NOT NULL DEFAULT '{}',
  max_players INT NOT NULL DEFAULT 100,
  likes_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Servers are viewable by everyone" ON public.servers
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create servers" ON public.servers
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their servers" ON public.servers
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their servers" ON public.servers
  FOR DELETE USING (auth.uid() = owner_id);

-- Comments table
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are viewable by everyone" ON public.comments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create comments" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authors can update their comments" ON public.comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Authors can delete their comments" ON public.comments
  FOR DELETE USING (auth.uid() = user_id);

-- Reactions table
CREATE TYPE public.reaction_type AS ENUM ('heart', 'thumbs_up', 'thumbs_down', 'laugh', 'fire', 'sad');

CREATE TABLE public.reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction reaction_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id, reaction)
);

ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reactions are viewable by everyone" ON public.reactions
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can add reactions" ON public.reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their reactions" ON public.reactions
  FOR DELETE USING (auth.uid() = user_id);

-- Server likes table
CREATE TABLE public.server_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(server_id, user_id)
);

ALTER TABLE public.server_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes are viewable by everyone" ON public.server_likes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like" ON public.server_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike" ON public.server_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Update likes_count trigger
CREATE OR REPLACE FUNCTION public.update_server_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.servers SET likes_count = likes_count + 1 WHERE id = NEW.server_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.servers SET likes_count = likes_count - 1 WHERE id = OLD.server_id;
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER on_server_like_change
  AFTER INSERT OR DELETE ON public.server_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_server_likes_count();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_servers_updated_at
  BEFORE UPDATE ON public.servers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
