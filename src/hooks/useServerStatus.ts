import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ServerStatus {
  online: boolean;
  players: { online: number; max: number };
}

const cache = new Map<string, { data: ServerStatus; ts: number }>();
const CACHE_TTL = 60_000; // 1 min

// Dedup in-flight requests so multiple components with the same IP share one fetch
const inflight = new Map<string, Promise<ServerStatus>>();

const fetchServerStatus = async (ip: string): Promise<ServerStatus> => {
  const { data, error } = await supabase.functions.invoke("mc-ping", {
    body: { ip },
  });

  if (error || !data) {
    return { online: false, players: { online: 0, max: 0 } };
  }

  return { online: data.online, players: data.players };
};

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

    const doFetch = async () => {
      // Dedup: if there's already an inflight request for this IP, reuse it
      let promise = inflight.get(ip);
      if (!promise) {
        promise = fetchServerStatus(ip);
        inflight.set(ip, promise);
      }

      try {
        const result = await promise;
        if (cancelled) return;

        if (!result.online && retryCount.current < 2) {
          retryCount.current++;
          inflight.delete(ip); // allow retry with fresh request
          const delay = retryCount.current * 3000;
          setTimeout(doFetch, delay);
          return;
        }

        cache.set(ip, { data: result, ts: Date.now() });
        setStatus(result);
        retryCount.current = 0;
      } catch {
        if (cancelled) return;
        if (retryCount.current < 2) {
          retryCount.current++;
          inflight.delete(ip);
          const delay = retryCount.current * 3000;
          setTimeout(doFetch, delay);
          return;
        }
        const fallback = { online: false, players: { online: 0, max: 0 } };
        cache.set(ip, { data: fallback, ts: Date.now() });
        setStatus(fallback);
      } finally {
        inflight.delete(ip);
        if (!cancelled) setLoading(false);
      }
    };

    doFetch();
    return () => { cancelled = true; };
  }, [ip]);

  return { status, loading };
};
