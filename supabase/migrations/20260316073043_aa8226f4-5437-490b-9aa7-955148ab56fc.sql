CREATE POLICY "Admins can delete servers"
ON public.servers
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));