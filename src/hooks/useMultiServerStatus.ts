import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ServerStatus {
  online: boolean;
  players: { online: number; max: number };
}

const cache = new Map<string, { data: ServerStatus; ts: number }>();
const CACHE_TTL = 60_000;

export const useMultiServerStatus = (ips: string[]) => {
  const [statuses, setStatuses] = useState<Record<string, ServerStatus>>(() => {
    const initial: Record<string, ServerStatus> = {};
    for (const ip of ips) {
      const c = cache.get(ip);
      if (c && Date.now() - c.ts < CACHE_TTL) initial[ip] = c.data;
    }
    return initial;
  });
  const [loading, setLoading] = useState(true);
  const prevIps = useRef<string>("");

  useEffect(() => {
    const key = ips.slice().sort().join(",");
    if (key === prevIps.current && !loading) return;
    prevIps.current = key;

    if (ips.length === 0) { setLoading(false); return; }

    let cancelled = false;

    const fetchAll = async () => {
      const toFetch = ips.filter((ip) => {
        const c = cache.get(ip);
        return !c || Date.now() - c.ts >= CACHE_TTL;
      });

      // Start with cached values
      const result: Record<string, ServerStatus> = {};
      for (const ip of ips) {
        const c = cache.get(ip);
        if (c && Date.now() - c.ts < CACHE_TTL) result[ip] = c.data;
      }

      // Fetch missing ones in parallel (max 10 concurrent)
      const batchSize = 10;
      for (let i = 0; i < toFetch.length; i += batchSize) {
        if (cancelled) return;
        const batch = toFetch.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map(async (ip) => {
            const { data, error } = await supabase.functions.invoke("mc-ping", { body: { ip } });
            if (error || !data) return { ip, status: { online: false, players: { online: 0, max: 0 } } as ServerStatus };
            return { ip, status: { online: data.online, players: data.players } as ServerStatus };
          })
        );

        for (const r of results) {
          if (r.status === "fulfilled") {
            cache.set(r.value.ip, { data: r.value.status, ts: Date.now() });
            result[r.value.ip] = r.value.status;
          }
        }

        if (!cancelled) setStatuses({ ...result });
      }

      if (!cancelled) setLoading(false);
    };

    fetchAll();
    return () => { cancelled = true; };
  }, [ips.join(",")]);

  return { statuses, loading };
};
