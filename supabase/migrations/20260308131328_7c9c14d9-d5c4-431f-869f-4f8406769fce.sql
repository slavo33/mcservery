
UPDATE public.servers
SET vip_expires_at = now() + interval '7 days'
WHERE is_featured = true AND (vip_expires_at IS NULL OR vip_expires_at < now());
