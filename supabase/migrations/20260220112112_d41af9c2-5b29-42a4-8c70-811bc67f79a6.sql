
-- Drop the old policy first
DROP POLICY IF EXISTS "Admins can update featured status" ON public.servers;

-- Now drop the column
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_admin;

-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Roles viewable by authenticated users"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);

-- Security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Admin policy for featured updates
CREATE POLICY "Admins can update featured status"
ON public.servers
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin')
);
