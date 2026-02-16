import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ServerStatus {
  online: boolean;
  players: { online: number; max: number };
}

const cache = new Map<string, { data: ServerStatus; ts: number }>();
const CACHE_TTL = 60_000; // 1 min

export const useServerStatus = (ip: string) => {
  const [status, setStatus] = useState<ServerStatus | null>(() => {
    const c = cache.get(ip);
    if (c && Date.now() - c.ts < CACHE_TTL) return c.data;
    return null;
  });
  const [loading, setLoading] = useState(!status);

  useEffect(() => {
    const c = cache.get(ip);
    if (c && Date.now() - c.ts < CACHE_TTL) {
      setStatus(c.data);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const fetchStatus = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("mc-ping", {
          body: { ip },
        });
        if (!cancelled && data) {
          const s = { online: data.online, players: data.players };
          cache.set(ip, { data: s, ts: Date.now() });
          setStatus(s);
        }
      } catch {
        if (!cancelled) setStatus({ online: false, players: { online: 0, max: 0 } });
      }
      if (!cancelled) setLoading(false);
    };

    fetchStatus();
    return () => { cancelled = true; };
  }, [ip]);

  return { status, loading };
};
