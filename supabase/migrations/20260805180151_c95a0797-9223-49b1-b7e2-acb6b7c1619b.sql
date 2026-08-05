CREATE OR REPLACE FUNCTION public.validate_server_version()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v text;
  p text;
  next_gen_software text[] := ARRAY['Vanilla','Spigot','Paper','Purpur','Pufferfish','Folia','Fabric','Quilt','NeoForge'];
  next_gen_proxy text[] := ARRAY['Žiadny','Velocity','Gate','Infrared'];
BEGIN
  v := btrim(regexp_replace(COALESCE(NEW.version, ''), '^[vV]', ''));

  IF v = '' THEN
    RAISE EXCEPTION 'Verzia servera je povinná.' USING ERRCODE = '23514';
  END IF;

  IF v !~ '^[0-9]+(\.[0-9]+){0,3}$' THEN
    RAISE EXCEPTION 'Neplatný formát verzie: %', NEW.version USING ERRCODE = '23514';
  END IF;

  NEW.version := v;

  IF v LIKE '26.%' THEN
    FOREACH p IN ARRAY COALESCE(NEW.platform, ARRAY[]::text[]) LOOP
      IF lower(p) <> 'java' THEN
        RAISE EXCEPTION 'Verzia % je dostupná iba pre Java Edition.', v USING ERRCODE = '23514';
      END IF;
    END LOOP;

    IF COALESCE(NEW.software, '') <> '' AND NOT (NEW.software = ANY (next_gen_software)) THEN
      RAISE EXCEPTION 'Software % nepodporuje verziu %.', NEW.software, v USING ERRCODE = '23514';
    END IF;

    IF COALESCE(NEW.proxy, '') <> '' AND NOT (NEW.proxy = ANY (next_gen_proxy)) THEN
      RAISE EXCEPTION 'Proxy % nepodporuje verziu %.', NEW.proxy, v USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_server_version_trigger ON public.servers;
CREATE TRIGGER validate_server_version_trigger
BEFORE INSERT OR UPDATE ON public.servers
FOR EACH ROW EXECUTE FUNCTION public.validate_server_version();