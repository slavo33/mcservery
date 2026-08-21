REVOKE ALL ON FUNCTION public.generate_server_slug(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_staff_post_slug(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_server_slug(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_staff_post_slug(text) TO service_role;