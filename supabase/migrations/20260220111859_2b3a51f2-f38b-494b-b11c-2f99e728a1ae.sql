
-- Add is_featured column to servers
ALTER TABLE public.servers ADD COLUMN is_featured boolean NOT NULL DEFAULT false;

-- Add is_admin column to profiles
ALTER TABLE public.profiles ADD COLUMN is_admin boolean NOT NULL DEFAULT false;

-- Allow admins to update is_featured on any server
CREATE POLICY "Admins can update featured status"
ON public.servers
FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);
