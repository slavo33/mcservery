// Zdieľaná logika triedenia serverov (zoznam aj karty používajú rovnaký živý stav)

export type SortBy = "votes" | "likes" | "players";
export type SortDir = "asc" | "desc";

export interface SortableServer {
  name: string;
  ip: string;
  likes?: number | null;
  votes?: number | null;
  players?: { online?: number | null } | null;
}

export interface LiveStatus {
  players?: { online?: number | null } | null;
}

export const toNumber = (v: unknown): number =>
  typeof v === "number" && Number.isFinite(v) ? v : 0;

/** Počet hráčov: prioritne živý stav, fallback na uložené dáta. */
export function getPlayerCount(
  server: SortableServer,
  statuses: Record<string, LiveStatus | undefined> = {}
): number {
  return toNumber(statuses[server.ip]?.players?.online ?? server.players?.online);
}

export function getSortValue(
  server: SortableServer,
  sortBy: SortBy,
  statuses: Record<string, LiveStatus | undefined> = {}
): number {
  if (sortBy === "votes") return toNumber(server.votes);
  if (sortBy === "likes") return toNumber(server.likes);
  return getPlayerCount(server, statuses);
}

/** Stabilné triedenie – pri rovnosti abecedne podľa mena. */
export function sortServers<T extends SortableServer>(
  servers: T[],
  sortBy: SortBy,
  sortDir: SortDir = "desc",
  statuses: Record<string, LiveStatus | undefined> = {}
): T[] {
  return [...servers].sort((a, b) => {
    const valA = getSortValue(a, sortBy, statuses);
    const valB = getSortValue(b, sortBy, statuses);
    if (valA === valB) return a.name.localeCompare(b.name);
    return sortDir === "desc" ? valB - valA : valA - valB;
  });
}
