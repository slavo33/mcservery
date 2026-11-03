import { describe, it, expect } from "vitest";
import {
  buildServerJsonLd,
  toSoftwareVersion,
  isSoftwareVersionConsistent,
} from "../serverJsonLd";

describe("JSON-LD softwareVersion", () => {
  it("normalizuje verziu do tvaru vX.Y", () => {
    expect(toSoftwareVersion("26.2")).toBe("v26.2");
    expect(toSoftwareVersion(" V26.2 ")).toBe("v26.2");
    expect(toSoftwareVersion("1.20.4")).toBe("v1.20.4");
  });

  it("odmietne neplatné alebo neúplné hodnoty", () => {
    expect(toSoftwareVersion("")).toBeNull();
    expect(toSoftwareVersion(null)).toBeNull();
    expect(toSoftwareVersion(undefined)).toBeNull();
    expect(toSoftwareVersion("26")).toBeNull(); // chýba minor
    expect(toSoftwareVersion("najnovsia")).toBeNull();
    expect(toSoftwareVersion("26.x")).toBeNull();
  });

  it("vloží softwareVersion zodpovedajúci vybranej verzii", () => {
    const jsonLd = buildServerJsonLd({
      name: "Test",
      description: "Popis",
      version: "26.2",
    });
    expect(jsonLd.keywords).toContain("v26.2");
    expect(jsonLd["@type"]).toBe("WebPage");
    expect(isSoftwareVersionConsistent(jsonLd, "26.2")).toBe(true);
    expect(isSoftwareVersionConsistent(jsonLd, "1.20.4")).toBe(false);
  });

  it("pri neplatnej verzii pole vynechá (nikdy neuvedie nezmysel)", () => {
    const jsonLd = buildServerJsonLd({ name: "Test", description: "Popis", version: "  " });
    expect(jsonLd.keywords ?? []).not.toContain("v26.2");
    expect(JSON.stringify(jsonLd)).not.toContain("softwareVersion");
    expect(isSoftwareVersionConsistent(jsonLd, "  ")).toBe(true);
  });

  it("zostáva konzistentné po editácii verzie", () => {
    const before = buildServerJsonLd({ name: "Test", description: "Popis", version: "26.2" });
    const after = buildServerJsonLd({ name: "Test", description: "Popis", version: "v1.20.4" });
    expect(before.keywords).toContain("v26.2");
    expect(after.keywords).toContain("v1.20.4");
    expect(isSoftwareVersionConsistent(after, "1.20.4")).toBe(true);
    expect(isSoftwareVersionConsistent(after, "26.2")).toBe(false);
  });

  it("odznak a JSON-LD používajú rovnaký formát", async () => {
    const { formatVersion } = await import("@/components/VersionBadge");
    for (const v of ["26.2", "1.21", "1.20.4", "v26.1.2"]) {
      expect(toSoftwareVersion(v)).toBe(formatVersion(v));
    }
  });
});
