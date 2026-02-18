import { useState, useEffect, useRef } from "react";
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
  const retryCount = useRef(0);

  useEffect(() => {
    if (!ip) { setLoading(false); return; }

    const c = cache.get(ip);
    if (c && Date.now() - c.ts < CACHE_TTL) {
      setStatus(c.data);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const fetchStatus = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("mc-ping", {
          body: { ip },
        });

        if (cancelled) return;

        if (error || !data) {
          // Retry up to 2 times with backoff
          if (retryCount.current < 2) {
            retryCount.current++;
            const delay = retryCount.current * 3000;
            timeoutId = setTimeout(fetchStatus, delay);
            return;
          }
          setStatus({ online: false, players: { online: 0, max: 0 } });
        } else {
          const s: ServerStatus = { online: data.online, players: data.players };
          cache.set(ip, { data: s, ts: Date.now() });
          setStatus(s);
          retryCount.current = 0;
        }
      } catch {
        if (cancelled) return;
        if (retryCount.current < 2) {
          retryCount.current++;
          const delay = retryCount.current * 3000;
          timeoutId = setTimeout(fetchStatus, delay);
          return;
        }
        setStatus({ online: false, players: { online: 0, max: 0 } });
      }
      if (!cancelled) setLoading(false);
    };

    fetchStatus();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [ip]);

  return { status, loading };
};
