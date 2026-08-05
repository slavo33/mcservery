import { describe, it, expect } from "vitest";
import { versions } from "@/lib/mockData";
import {
  isNextGenVersion,
  getAvailablePlatforms,
  getAvailableSoftware,
  validateVersionCombination,
  sanitizeForVersion,
  validateVersionSelection,
} from "@/lib/versionCompatibility";

const NEW_VERSIONS = ["26.2", "26.1.2", "26.1.1", "26.1"];

describe("zoznam verzií", () => {
  it("obsahuje nové verzie 26.x", () => {
    for (const v of NEW_VERSIONS) {
      expect(versions).toContain(v);
    }
  });

  it("má 26.2 ako najnovšiu (prvú) voľbu", () => {
    expect(versions[0]).toBe("26.2");
  });

  it("neobsahuje duplicity", () => {
    expect(new Set(versions).size).toBe(versions.length);
  });
});

describe("kompatibilita verzií 26.x", () => {
  it("označí 26.2 ako next-gen", () => {
    expect(isNextGenVersion("26.2")).toBe(true);
    expect(isNextGenVersion("1.21")).toBe(false);
  });

  it("ponúka pre 26.2 len Java platformu", () => {
    expect(getAvailablePlatforms("26.2")).toEqual(["Java"]);
  });

  it("nefiltruje možnosti pre staršie verzie", () => {
    expect(getAvailablePlatforms("1.21")).toContain("Bedrock");
  });

  it("neponúka pre 26.2 Bedrock-only software", () => {
    const sw = getAvailableSoftware("26.2");
    expect(sw).toContain("Paper");
    expect(sw).not.toContain("Bedrock");
  });

  it("blokuje neplatnú kombináciu 26.2 + Bedrock", () => {
    expect(
      validateVersionCombination({ version: "26.2", software: "", proxy: "", platform: ["Bedrock"] })
    ).toBeTruthy();
    expect(
      validateVersionCombination({ version: "26.2", software: "Paper", proxy: "Velocity", platform: ["Java"] })
    ).toBeNull();
  });

});

describe("blokovanie nekompatibilných volieb pri 26.2", () => {
  it("odmietne loader/software bez buildu pre 26.x a poradí náhradu", () => {
    const err = validateVersionCombination({
      version: "26.2",
      software: "Magma",
      proxy: "",
      platform: ["Java"],
    });
    expect(err).toContain("Magma");
    expect(err).toContain("Paper");
  });

  it("odmietne staré proxy (BungeeCord/Waterfall) a ponúkne Velocity", () => {
    for (const proxy of ["BungeeCord", "Waterfall"]) {
      const err = validateVersionCombination({
        version: "26.2",
        software: "Paper",
        proxy,
        platform: ["Java"],
      });
      expect(err).toContain(proxy);
      expect(err).toContain("Velocity");
    }
  });

  it("povolí Žiadny proxy aj podporované proxy", () => {
    for (const proxy of ["Žiadny", "Velocity", "Gate", "Infrared"]) {
      expect(
        validateVersionCombination({ version: "26.2", software: "Paper", proxy, platform: ["Java"] })
      ).toBeNull();
    }
  });

  it("sanitizeForVersion vyčistí nekompatibilné voľby pri prechode na 26.2", () => {
    const cleaned = sanitizeForVersion({
      version: "26.2",
      software: "Magma",
      proxy: "BungeeCord",
      platform: ["Java", "Bedrock"],
    });
    expect(cleaned.platform).toEqual(["Java"]);
    expect(cleaned.software).toBe("");
    expect(cleaned.proxy).toBe("");
  });

  it("nedovolí uložiť bez verzie ani s neznámou verziou", () => {
    expect(validateVersionSelection("")).toBeTruthy();
    expect(validateVersionSelection("99.9.9")).toContain("nie je v zozname");
    expect(validateVersionSelection("26.2")).toBeNull();
  });
});
