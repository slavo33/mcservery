import { useState, useEffect, useRef } from "react";
import {
  ServerStatus,
  OFFLINE_STATUS,
  fetchStatus,
  getCachedStatus,
  setCachedStatus,
  subscribeStatus,
} from "@/lib/serverStatusStore";

export type { ServerStatus };

/**
 * Živý stav jedného servera. Číta a zapisuje do zdieľaného store
 * (`serverStatusStore`), takže hodnota je zhodná so zoznamom serverov.
 */
export const useServerStatus = (ip: string) => {
  const [status, setStatus] = useState<ServerStatus | null>(() => getCachedStatus(ip));
  const [loading, setLoading] = useState(!getCachedStatus(ip));
  const retryCount = useRef(0);

  useEffect(() => {
    if (!ip) {
      setLoading(false);
      return;
    }

    // Zostaň v synchrone s ostatnými komponentmi, ktoré ten istý IP načítali.
    const unsubscribe = subscribeStatus((changedIp, next) => {
      if (changedIp === ip) {
        setStatus(next);
        setLoading(false);
      }
    });

    const cached = getCachedStatus(ip);
    if (cached) {
      setStatus(cached);
      setLoading(false);
      return unsubscribe;
    }

    let cancelled = false;
    retryCount.current = 0;

    const doFetch = async () => {
      const result = await fetchStatus(ip, { force: retryCount.current > 0 });
      if (cancelled) return;

      if (!result.online && retryCount.current < 2) {
        retryCount.current++;
        setTimeout(doFetch, retryCount.current * 3000);
        return;
      }

      setCachedStatus(ip, result);
      setStatus(result);
      setLoading(false);
      retryCount.current = 0;
    };

    doFetch().catch(() => {
      if (cancelled) return;
      setCachedStatus(ip, OFFLINE_STATUS);
      setStatus(OFFLINE_STATUS);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [ip]);

  return { status, loading };
};
