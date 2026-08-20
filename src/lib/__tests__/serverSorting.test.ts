import { describe, it, expect } from "vitest";
import {
  sortServers,
  getPlayerCount,
  getSortValue,
  toNumber,
  type SortableServer,
} from "@/lib/serverSorting";

const mk = (
  name: string,
  ip: string,
  extra: Partial<SortableServer> = {}
): SortableServer => ({ name, ip, likes: 0, votes: 0, players: { online: 0 }, ...extra });

describe("toNumber", () => {
  it("vracia 0 pre neplatné hodnoty", () => {
    expect(toNumber(undefined)).toBe(0);
    expect(toNumber(null)).toBe(0);
    expect(toNumber(NaN)).toBe(0);
    expect(toNumber(Infinity)).toBe(0);
    expect(toNumber("12")).toBe(0);
    expect(toNumber(12)).toBe(12);
  });
});

describe("getPlayerCount", () => {
  const s = mk("A", "a.net", { players: { online: 5 } });

  it("uprednostní živý stav pred uloženými dátami", () => {
    expect(getPlayerCount(s, { "a.net": { players: { online: 42 } } })).toBe(42);
  });

  it("použije fallback keď živý stav chýba", () => {
    expect(getPlayerCount(s, {})).toBe(5);
  });

  it("použije fallback keď živý stav nemá players", () => {
    expect(getPlayerCount(s, { "a.net": {} })).toBe(5);
  });

  it("vracia 0 keď nie je nič dostupné", () => {
    expect(getPlayerCount(mk("B", "b.net", { players: null }))).toBe(0);
  });

  it("rešpektuje živú nulu (offline server)", () => {
    expect(getPlayerCount(s, { "a.net": { players: { online: 0 } } })).toBe(0);
  });
});

describe("getSortValue", () => {
  const s = mk("A", "a.net", { likes: 3, votes: 7, players: { online: 9 } });
  it("mapuje sortBy na správne pole", () => {
    expect(getSortValue(s, "votes")).toBe(7);
    expect(getSortValue(s, "likes")).toBe(3);
    expect(getSortValue(s, "players")).toBe(9);
  });
});

describe("sortServers – podľa hráčov", () => {
  const servers = [
    mk("Alpha", "alpha.net", { players: { online: 1 } }),
    mk("Beta", "beta.net", { players: { online: 0 } }),
    mk("Gamma", "gamma.net", { players: { online: 3 } }),
    mk("Delta", "delta.net", { players: { online: 2 } }),
  ];
  const statuses = {
    "alpha.net": { players: { online: 5 } },
    "gamma.net": { players: { online: 3 } },
    "delta.net": { players: { online: 2 } },
  };

  it("zoradí zostupne podľa živého počtu hráčov", () => {
    expect(sortServers(servers, "players", "desc", statuses).map((s) => s.name)).toEqual([
      "Alpha",
      "Gamma",
      "Delta",
      "Beta",
    ]);
  });

  it("zoradí vzostupne", () => {
    expect(sortServers(servers, "players", "asc", statuses).map((s) => s.name)).toEqual([
      "Beta",
      "Delta",
      "Gamma",
      "Alpha",
    ]);
  });

  it("bez živých dát použije uložené hodnoty", () => {
    expect(sortServers(servers, "players", "desc", {}).map((s) => s.name)).toEqual([
      "Gamma",
      "Delta",
      "Alpha",
      "Beta",
    ]);
  });

  it("pri rovnosti triedi abecedne (deterministicky)", () => {
    const tied = [mk("Zulu", "z.net"), mk("Alpha", "a.net"), mk("Mike", "m.net")];
    expect(sortServers(tied, "players", "desc").map((s) => s.name)).toEqual([
      "Alpha",
      "Mike",
      "Zulu",
    ]);
  });

  it("nemutuje pôvodné pole", () => {
    const original = [...servers];
    sortServers(servers, "players", "desc", statuses);
    expect(servers).toEqual(original);
  });

  it("zvládne chýbajúce/nevalidné hodnoty bez pádu", () => {
    const messy = [
      mk("A", "a", { players: null }),
      mk("B", "b", { players: { online: undefined } }),
      mk("C", "c", { players: { online: 4 } }),
    ];
    expect(sortServers(messy, "players", "desc").map((s) => s.name)).toEqual(["C", "A", "B"]);
  });
});

describe("sortServers – votes a likes", () => {
  const servers = [
    mk("A", "a", { votes: 2, likes: 9 }),
    mk("B", "b", { votes: 8, likes: 1 }),
    mk("C", "c", { votes: 5, likes: 5 }),
  ];

  it("zoradí podľa hlasov", () => {
    expect(sortServers(servers, "votes", "desc").map((s) => s.name)).toEqual(["B", "C", "A"]);
  });

  it("zoradí podľa lajkov", () => {
    expect(sortServers(servers, "likes", "desc").map((s) => s.name)).toEqual(["A", "C", "B"]);
  });

  it("triedenie podľa hlasov ignoruje živý stav hráčov", () => {
    const statuses = { a: { players: { online: 999 } } };
    expect(sortServers(servers, "votes", "desc", statuses).map((s) => s.name)).toEqual([
      "B",
      "C",
      "A",
    ]);
  });
});
