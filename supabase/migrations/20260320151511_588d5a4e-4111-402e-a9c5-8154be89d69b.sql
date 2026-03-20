ALTER TABLE public.staff_posts ADD COLUMN vip_tier text DEFAULT NULL;
ALTER TABLE public.staff_posts ADD COLUMN vip_expires_at timestamp with time zone DEFAULT NULL;