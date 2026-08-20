import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join, resolve } from "path";

const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } },
}));

import {
  fetchStatus,
  getCachedStatus,
  setCachedStatus,
  subscribeStatus,
  __resetStatusStore,
} from "@/lib/serverStatusStore";

describe("zdieľaný live zdroj stavu serverov", () => {
  beforeEach(() => {
    __resetStatusStore();
    invoke.mockReset();
    invoke.mockResolvedValue({ data: { online: true, players: { online: 7, max: 100 } }, error: null });
  });
  afterEach(() => __resetStatusStore());

  it("dedupuje súbežné požiadavky na rovnaký IP", async () => {
    const [a, b] = await Promise.all([fetchStatus("mc.test:25565"), fetchStatus("mc.test:25565")]);
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
    expect(a.players.online).toBe(7);
  });

  it("zdieľa cache medzi jednotlivými aj hromadnými čítaniami", async () => {
    const first = await fetchStatus("mc.test:25565");
    setCachedStatus("mc.test:25565", first);
    expect(getCachedStatus("mc.test:25565")).toEqual(first);

    const second = await fetchStatus("mc.test:25565");
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });

  it("notifikuje odberateľov, takže zoznam aj karta ukazujú tie isté čísla", () => {
    const seen: Array<[string, number]> = [];
    const unsubscribe = subscribeStatus((ip, s) => seen.push([ip, s.players.online]));
    setCachedStatus("mc.test:25565", { online: true, players: { online: 42, max: 100 } });
    unsubscribe();
    setCachedStatus("mc.test:25565", { online: true, players: { online: 1, max: 100 } });
    expect(seen).toEqual([["mc.test:25565", 42]]);
  });

  it("vráti offline stav pri chybe mc-ping", async () => {
    invoke.mockResolvedValueOnce({ data: null, error: new Error("boom") });
    const status = await fetchStatus("bad.test:25565");
    expect(status).toEqual({ online: false, players: { online: 0, max: 0 } });
  });
});

describe("konzistencia zdroja stavu naprieč stránkami", () => {
  const pagesDir = resolve(__dirname, "../../pages");

  it("každý <ServerCard> v stránkach dostáva liveStatus z hromadného hooku", () => {
    const offenders: string[] = [];
    for (const file of readdirSync(pagesDir).filter((f) => f.endsWith(".tsx"))) {
      const src = readFileSync(join(pagesDir, file), "utf8");
      const cards = src.match(/<ServerCard[\s\S]*?\/>/g) || [];
      if (!cards.length) continue;
      if (!src.includes("useMultiServerStatus")) {
        offenders.push(`${file}: nepoužíva useMultiServerStatus`);
        continue;
      }
      cards.forEach((card, i) => {
        if (!card.includes("liveStatus")) offenders.push(`${file}: ServerCard #${i + 1} bez liveStatus`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it("hooky stavu čítajú výhradne zo zdieľaného storu", () => {
    const hooks = ["useServerStatus.ts", "useMultiServerStatus.ts"].map((f) =>
      readFileSync(resolve(__dirname, "../../hooks", f), "utf8"),
    );
    for (const src of hooks) {
      expect(src).toContain("@/lib/serverStatusStore");
      // žiadna vlastná lokálna cache ani priame volanie mc-ping
      expect(src).not.toContain("new Map<string, { data");
      expect(src).not.toContain('invoke("mc-ping"');
    }
  });
});
