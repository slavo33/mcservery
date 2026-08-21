
REVOKE EXECUTE ON FUNCTION public.create_server_secrets() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_server_likes_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_server_vote_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_staff_post_likes_count() FROM PUBLIC, anon, authenticated;

-- Policy helper functions: only signed-in users need them (policies evaluate them)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_banned(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_server_count(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_staff_post_count(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_banned(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_server_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_staff_post_count(uuid) TO authenticated;

-- Public leaderboard RPC stays callable (read-only aggregate, no PII)
GRANT EXECUTE ON FUNCTION public.get_top_voters(uuid, integer) TO anon, authenticated;
