
-- Add VIP columns to servers
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS vip_expires_at timestamp with time zone DEFAULT NULL;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS vote_cooldown_hours integer NOT NULL DEFAULT 24;

-- VIP purchases table
CREATE TABLE public.vip_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  server_id uuid NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  tier text NOT NULL,
  price_id text NOT NULL,
  stripe_session_id text,
  discount_code_id uuid,
  amount_paid integer NOT NULL DEFAULT 0,
  starts_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.vip_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own purchases" ON public.vip_purchases
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all purchases" ON public.vip_purchases
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Discount codes table
CREATE TABLE public.discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  percent_off integer NOT NULL DEFAULT 15,
  max_uses integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage discount codes" ON public.discount_codes
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read active codes for validation" ON public.discount_codes
  FOR SELECT USING (is_active = true);

-- Discount code usage tracking
CREATE TABLE public.discount_code_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_code_id uuid NOT NULL REFERENCES public.discount_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  vip_purchase_id uuid REFERENCES public.vip_purchases(id) ON DELETE SET NULL,
  tier text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.discount_code_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all usage" ON public.discount_code_usage
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
