
-- Remove permissive INSERT policy - edge function will use service_role key
DROP POLICY "Anyone can vote via edge function" ON public.votes;
