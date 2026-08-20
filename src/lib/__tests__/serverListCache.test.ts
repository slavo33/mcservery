import { describe, it, expect, beforeEach } from "vitest";
import {
  LruCache,
  buildQueryKey,
  buildDataVersion,
  serverListStore,
  queryCache,
  SERVERS_TTL_MS,
} from "@/lib/serverListCache";

const parts = (over: Partial<Parameters<typeof buildQueryKey>[0]> = {}) => ({
  search: "",
  platform: "",
  version: "",
  software: "",
  minigame: "",
  vipOnly: false,
  sortBy: "votes",
  sortDir: "desc",
  dataVersion: "3:a:c",
  ...over,
});

describe("LruCache", () => {
  it("uloží a vráti hodnotu", () => {
    const c = new LruCache<number[]>(2);
    c.set("a", [1]);
    expect(c.get("a")).toEqual([1]);
  });

  it("vyhodí najstaršiu položku pri prekročení veľkosti", () => {
    const c = new LruCache<number[]>(2);
    c.set("a", [1]);
    c.set("b", [2]);
    c.set("c", [3]);
    expect(c.has("a")).toBe(false);
    expect(c.has("b")).toBe(true);
    expect(c.has("c")).toBe(true);
    expect(c.size).toBe(2);
  });

  it("čítanie obnoví poradie (LRU)", () => {
    const c = new LruCache<number[]>(2);
    c.set("a", [1]);
    c.set("b", [2]);
    c.get("a");
    c.set("c", [3]);
    expect(c.has("a")).toBe(true);
    expect(c.has("b")).toBe(false);
  });

  it("clear vyprázdni cache", () => {
    const c = new LruCache<number[]>(2);
    c.set("a", [1]);
    c.clear();
    expect(c.size).toBe(0);
  });
});

describe("buildQueryKey", () => {
  it("rovnaké filtre dajú rovnaký kľúč", () => {
    expect(buildQueryKey(parts())).toBe(buildQueryKey(parts()));
  });

  it("normalizuje vyhľadávanie (trim + lowercase)", () => {
    expect(buildQueryKey(parts({ search: "  SkyBlock " }))).toBe(buildQueryKey(parts({ search: "skyblock" })));
  });

  it("rôzne filtre dajú rôzne kľúče", () => {
    const base = buildQueryKey(parts());
    expect(buildQueryKey(parts({ version: "26.2" }))).not.toBe(base);
    expect(buildQueryKey(parts({ platform: "Java" }))).not.toBe(base);
    expect(buildQueryKey(parts({ software: "Paper" }))).not.toBe(base);
    expect(buildQueryKey(parts({ minigame: "SkyWars" }))).not.toBe(base);
    expect(buildQueryKey(parts({ vipOnly: true }))).not.toBe(base);
    expect(buildQueryKey(parts({ sortBy: "likes" }))).not.toBe(base);
    expect(buildQueryKey(parts({ sortDir: "asc" }))).not.toBe(base);
    expect(buildQueryKey(parts({ dataVersion: "4:a:d" }))).not.toBe(base);
  });
});

describe("buildDataVersion", () => {
  const statuses = {
    "a.net": { online: true, players: { online: 5 } },
    "b.net": { online: false, players: { online: 0 } },
  };

  it("pri triedení mimo hráčov ignoruje live stavy", () => {
    const v1 = buildDataVersion(["a", "b"], statuses as any, "votes");
    const v2 = buildDataVersion(["a", "b"], { "a.net": { online: true, players: { online: 99 } } } as any, "votes");
    expect(v1).toBe(v2);
  });

  it("pri triedení podľa hráčov reflektuje zmenu počtu hráčov", () => {
    const v1 = buildDataVersion(["a", "b"], statuses as any, "players");
    const v2 = buildDataVersion(
      ["a", "b"],
      { ...statuses, "a.net": { online: true, players: { online: 6 } } } as any,
      "players",
    );
    expect(v1).not.toBe(v2);
  });

  it("mení sa pri zmene datasetu", () => {
    expect(buildDataVersion(["a", "b"], {}, "votes")).not.toBe(buildDataVersion(["a", "b", "c"], {}, "votes"));
  });
});

describe("serverListStore", () => {
  beforeEach(() => {
    serverListStore.clear();
    queryCache.clear();
  });

  it("zapíše a prečíta čerstvé dáta", () => {
    serverListStore.write([{ id: "1" }]);
    const res = serverListStore.read<{ id: string }[]>();
    expect(res?.data).toEqual([{ id: "1" }]);
    expect(res?.fresh).toBe(true);
  });

  it("označí staré dáta ako nečerstvé", () => {
    serverListStore.write([{ id: "1" }]);
    const res = serverListStore.read<{ id: string }[]>(0);
    expect(res?.fresh).toBe(false);
    expect(res?.data).toHaveLength(1);
  });

  it("po clear vráti null", () => {
    serverListStore.write([{ id: "1" }]);
    serverListStore.clear();
    expect(serverListStore.read()).toBeNull();
  });

  it("TTL je rozumná (<= 5 min)", () => {
    expect(SERVERS_TTL_MS).toBeGreaterThan(0);
    expect(SERVERS_TTL_MS).toBeLessThanOrEqual(300_000);
  });
});
