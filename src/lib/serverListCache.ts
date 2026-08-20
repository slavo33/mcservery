/**
 * Cache pre zoznam serverov na /servers.
 *
 * 1) `serverListStore` — stale-while-revalidate cache pre dáta z backendu
 *    (pamäť + sessionStorage), aby opakované návštevy stránky vykreslili
 *    obsah okamžite a nečakali na sieťový dotaz.
 * 2) `queryCache` — LRU memo cache pre výsledky filtrovania a zoradenia,
 *    aby sa pri opakovaných kombináciách filtrov nepočítalo všetko odznova.
 */

const STORAGE_KEY = "mcservery:servers:v1";
export const SERVERS_TTL_MS = 60_000;

export interface CachedPayload<T> {
  data: T;
  ts: number;
}

let memoryPayload: CachedPayload<unknown> | null = null;

const safeSession = (): Storage | null => {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
};

export const serverListStore = {
  /** Vráti cachnuté dáta (aj staré) + príznak, či sú ešte čerstvé. */
  read<T>(ttlMs = SERVERS_TTL_MS): { data: T; fresh: boolean } | null {
    let payload = memoryPayload as CachedPayload<T> | null;
    if (!payload) {
      const s = safeSession();
      if (!s) return null;
      try {
        const raw = s.getItem(STORAGE_KEY);
        if (!raw) return null;
        payload = JSON.parse(raw) as CachedPayload<T>;
        memoryPayload = payload as CachedPayload<unknown>;
      } catch {
        return null;
      }
    }
    if (!payload || !Array.isArray((payload as any).data)) return null;
    return { data: payload.data, fresh: Date.now() - payload.ts < ttlMs };
  },

  write<T>(data: T): void {
    const payload: CachedPayload<T> = { data, ts: Date.now() };
    memoryPayload = payload as CachedPayload<unknown>;
    const s = safeSession();
    if (!s) return;
    try {
      s.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* quota / private mode — pamäťová cache stačí */
    }
  },

  clear(): void {
    memoryPayload = null;
    try {
      safeSession()?.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  },
};

/** Jednoduchá LRU cache s obmedzenou veľkosťou. */
export class LruCache<V> {
  private map = new Map<string, V>();
  constructor(private readonly maxSize = 30) {}

  get(key: string): V | undefined {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key) as V;
    // refresh poradia (LRU)
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key: string, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.maxSize) {
      const oldest = this.map.keys().next().value as string | undefined;
      if (oldest !== undefined) this.map.delete(oldest);
    }
  }

  has(key: string): boolean {
    return this.map.has(key);
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }
}

export interface QueryKeyParts {
  search: string;
  platform: string;
  version: string;
  software: string;
  minigame: string;
  vipOnly: boolean;
  sortBy: string;
  sortDir: string;
  /** Verzia datasetu — mení sa pri novom fetchi alebo zmene live stavov. */
  dataVersion: string;
}

export const buildQueryKey = (p: QueryKeyParts): string =>
  [
    p.search.trim().toLowerCase(),
    p.platform,
    p.version,
    p.software,
    p.minigame,
    p.vipOnly ? "vip" : "all",
    p.sortBy,
    p.sortDir,
    p.dataVersion,
  ].join("|");

/**
 * Podpis datasetu + live stavov. Pri triedení podľa hráčov sa výsledok mení
 * spolu s počtami hráčov, takže musia byť súčasťou kľúča.
 */
export const buildDataVersion = (
  ids: string[],
  statuses: Record<string, { online?: boolean; players?: { online?: number } } | null | undefined>,
  sortBy: string,
): string => {
  const base = `${ids.length}:${ids[0] ?? ""}:${ids[ids.length - 1] ?? ""}`;
  if (sortBy !== "players") return base;
  let sum = 0;
  let onlineCount = 0;
  for (const key of Object.keys(statuses)) {
    const st = statuses[key];
    if (!st) continue;
    if (st.online) onlineCount++;
    sum += st.players?.online ?? 0;
  }
  return `${base}:${onlineCount}:${sum}`;
};

/** Zdieľaná LRU cache výsledkov filtrovania/zoradenia na /servers. */
export const queryCache = new LruCache<unknown[]>(40);
