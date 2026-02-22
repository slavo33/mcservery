ALTER TABLE public.server_secrets
ADD COLUMN votifier_ip text DEFAULT NULL,
ADD COLUMN votifier_port integer DEFAULT NULL,
ADD COLUMN votifier_public_key text DEFAULT NULL;