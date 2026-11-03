import { describe, it, expect } from "vitest";
import { buildServerJsonLd, buildServerMeta, toEditions, toLoader, toOperatingSystem } from "@/lib/serverJsonLd";

describe("JSON-LD — typ servera a loader", () => {
  it("normalizuje edície z profilu", () => {
    expect(toEditions(["java", "Bedrock", "java"])).toEqual(["Java", "Bedrock"]);
    expect(toEditions([])).toEqual([]);
    expect(toEditions(null)).toEqual([]);
  });

  it("operatingSystem odráža zvolené edície", () => {
    expect(toOperatingSystem(["java"])).toBe("Minecraft Java Edition");
    expect(toOperatingSystem(["java", "bedrock"])).toBe("Minecraft Java Edition, Minecraft Bedrock Edition");
    expect(toOperatingSystem(null)).toBe("Minecraft");
  });

  it("loader ignoruje prázdne a 'Žiadny' hodnoty", () => {
    expect(toLoader("Paper")).toBe("Paper");
    expect(toLoader("  Purpur ")).toBe("Purpur");
    expect(toLoader("Žiadny")).toBeUndefined();
    expect(toLoader("")).toBeUndefined();
  });

  it("JSON-LD obsahuje edíciu aj loader presne podľa profilu", () => {
    const ld = buildServerJsonLd({
      name: "Test",
      description: "popis",
      version: "1.20.4",
      platform: ["java", "bedrock"],
      software: "Spigot",
    });
    expect(ld["@type"]).toBe("WebPage");
    expect(ld.keywords).toEqual(expect.arrayContaining([
      "Minecraft Java Edition",
      "Minecraft Bedrock Edition",
      "Spigot",
      "v1.20.4",
    ]));
    expect(ld).not.toHaveProperty("operatingSystem");
    expect(ld).not.toHaveProperty("runtimePlatform");
  });

  it("bez platformy a loadera zostane JSON-LD čisté", () => {
    const ld = buildServerJsonLd({ name: "Test", description: "popis", version: "1.20.4" });
    expect(ld["@type"]).toBe("WebPage");
    expect(ld.keywords).toEqual(["v1.20.4"]);
    expect(ld).not.toHaveProperty("operatingSystem");
    expect(ld).not.toHaveProperty("runtimePlatform");
  });

  it("buildServerMeta prenáša nastavenia profilu do JSON-LD", () => {
    const meta = buildServerMeta({
      name: "Purpur svet",
      ip: "play.test.eu",
      description: "popis",
      version: "26.2",
      slug: "test",
      platform: ["java"],
      software: "Purpur",
    });
    expect(meta.jsonLd.keywords).toEqual(expect.arrayContaining([
      "v26.2",
      "Purpur",
      "Minecraft Java Edition",
    ]));
  });
});
