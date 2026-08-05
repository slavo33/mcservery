import { describe, it, expect } from "vitest";
import { versions } from "@/lib/mockData";
import {
  isNextGenVersion,
  getAvailablePlatforms,
  getAvailableSoftware,
  validateVersionCombination,
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
    const invalid = validateVersionCombination("26.2", "Bedrock", [], "");
    expect(invalid.valid).toBe(false);
    const valid = validateVersionCombination("26.2", "Java", ["Paper"], "Velocity");
    expect(valid.valid).toBe(true);
  });
});
