import { supabase } from "@/integrations/supabase/client";

export interface ServerStatus {
  online: boolean;
  players: { online: number; max: number };
}

export const STATUS_CACHE_TTL = 60_000; // 1 min

type Entry = { data: ServerStatus; ts: number };

// Jediný zdroj pravdy pre živý stav serverov – zdieľaný medzi zoznamom,
// kartami aj detailom, aby filtre a triedenie vždy sedeli s tým, čo vidno.
const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<ServerStatus>>();
const subscribers = new Set<(ip: string, status: ServerStatus) => void>();

export const OFFLINE_STATUS: ServerStatus = { online: false, players: { online: 0, max: 0 } };

export const getCachedStatus = (ip: string): ServerStatus | null => {
  const entry = cache.get(ip);
  if (!entry) return null;
  if (Date.now() - entry.ts >= STATUS_CACHE_TTL) return null;
  return entry.data;
};

export const setCachedStatus = (ip: string, status: ServerStatus) => {
  cache.set(ip, { data: status, ts: Date.now() });
  for (const fn of subscribers) fn(ip, status);
};

export const subscribeStatus = (fn: (ip: string, status: ServerStatus) => void) => {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
};

/** Načíta stav (z cache alebo cez mc-ping) a zdieľa in-flight požiadavky podľa IP. */
export const fetchStatus = async (ip: string, opts?: { force?: boolean }): Promise<ServerStatus> => {
  if (!ip) return OFFLINE_STATUS;

  if (!opts?.force) {
    const cached = getCachedStatus(ip);
    if (cached) return cached;
  }

  const existing = inflight.get(ip);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke("mc-ping", { body: { ip } });
      if (error || !data) return OFFLINE_STATUS;
      return { online: !!data.online, players: data.players ?? { online: 0, max: 0 } } as ServerStatus;
    } catch {
      return OFFLINE_STATUS;
    } finally {
      inflight.delete(ip);
    }
  })();

  inflight.set(ip, promise);
  return promise;
};

/** Iba pre testy. */
export const __resetStatusStore = () => {
  cache.clear();
  inflight.clear();
  subscribers.clear();
};
