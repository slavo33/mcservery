
-- Add new columns to servers table
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS is_warez boolean NOT NULL DEFAULT false;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS has_whitelist boolean NOT NULL DEFAULT false;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS discord_url text DEFAULT NULL;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS website_url text DEFAULT NULL;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS instagram_url text DEFAULT NULL;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS tiktok_url text DEFAULT NULL;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS youtube_url text DEFAULT NULL;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS twitter_url text DEFAULT NULL;
