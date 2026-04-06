CREATE TABLE public.banned_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  reason text NOT NULL DEFAULT '',
  banned_at timestamp with time zone NOT NULL DEFAULT now(),
  banned_by uuid
);

ALTER TABLE public.banned_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage bans" ON public.banned_users
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can check own ban" ON public.banned_users
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);