-- Add votifier_token column for NuVotifier v2 protocol support
ALTER TABLE public.server_secrets ADD COLUMN IF NOT EXISTS votifier_token text DEFAULT NULL;
