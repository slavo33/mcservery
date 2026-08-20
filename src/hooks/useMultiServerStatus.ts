import { useState, useEffect, useRef } from "react";
import {
  ServerStatus,
  fetchStatus,
  getCachedStatus,
  setCachedStatus,
  subscribeStatus,
} from "@/lib/serverStatusStore";

export type { ServerStatus };

/**
 * Živý stav viacerých serverov naraz. Používa ten istý zdieľaný store ako
 * `useServerStatus`, takže zoznam, karty aj detail zobrazujú rovnaké čísla
 * a triedenie/filtrovanie podľa hráčov vždy sedí s tým, čo používateľ vidí.
 */
export const useMultiServerStatus = (ips: string[]) => {
  const key = ips.join(",");
  const [statuses, setStatuses] = useState<Record<string, ServerStatus>>(() => {
    const initial: Record<string, ServerStatus> = {};
    for (const ip of ips) {
      const cached = getCachedStatus(ip);
      if (cached) initial[ip] = cached;
    }
    return initial;
  });
  const [loading, setLoading] = useState(true);
  const prevKey = useRef<string>("");

  useEffect(() => {
    const list = key ? key.split(",").filter(Boolean) : [];

    // Zmeny z iných komponentov (napr. detail servera) sa premietnu aj sem.
    const unsubscribe = subscribeStatus((changedIp, next) => {
      if (!list.includes(changedIp)) return;
      setStatuses((prev) => (prev[changedIp] === next ? prev : { ...prev, [changedIp]: next }));
    });

    if (list.length === 0) {
      setLoading(false);
      return unsubscribe;
    }

    const sortedKey = list.slice().sort().join(",");
    if (sortedKey === prevKey.current && !loading) return unsubscribe;
    prevKey.current = sortedKey;

    let cancelled = false;

    const fetchAll = async () => {
      const result: Record<string, ServerStatus> = {};
      const toFetch: string[] = [];
      for (const ip of list) {
        const cached = getCachedStatus(ip);
        if (cached) result[ip] = cached;
        else toFetch.push(ip);
      }
      if (!cancelled && Object.keys(result).length) setStatuses((prev) => ({ ...prev, ...result }));

      const batchSize = 10;
      for (let i = 0; i < toFetch.length; i += batchSize) {
        if (cancelled) return;
        const batch = toFetch.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map(async (ip) => ({ ip, status: await fetchStatus(ip) })),
        );

        for (const r of results) {
          if (r.status !== "fulfilled") continue;
          result[r.value.ip] = r.value.status;
          // Zápis do zdieľaného store notifikuje aj ostatné komponenty.
          setCachedStatus(r.value.ip, r.value.status);
        }

        if (!cancelled) setStatuses((prev) => ({ ...prev, ...result }));
      }

      if (!cancelled) setLoading(false);
    };

    fetchAll();
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [key]);

  return { statuses, loading };
};
