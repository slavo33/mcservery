import { describe, expect, it } from "vitest";
import { buildStaffPostJsonLd, buildStaffPostJsonLdGraph, staffValidThrough } from "@/lib/staffJsonLd";

const input = {
  position: "Helper",
  description: "Hľadáme aktívneho helpera na náš Minecraft server s dobrou znalosťou pravidiel.",
  slug: "helper-bloodsmp",
  serverName: "BloodSMP",
  createdAt: "2026-01-10T10:00:00.000Z",
  image: "https://mcservery.one/img.webp",
  requirements: "Vek 15+, discord, aktivita 2h denne",
};

describe("staff JobPosting JSON-LD", () => {
  it("obsahuje povinné polia pre Google JobPosting", () => {
    const ld = buildStaffPostJsonLd(input);
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("JobPosting");
    for (const field of ["title", "description", "datePosted", "validThrough", "hiringOrganization"]) {
      expect(ld[field]).toBeTruthy();
    }
    expect(ld.jobLocationType).toBe("TELECOMMUTE");
    expect(ld.applicantLocationRequirements).toBeTruthy();
    expect(ld.url).toBe("https://mcservery.one/staff/helper-bloodsmp");
    expect((ld.hiringOrganization as Record<string, string>).name).toBe("BloodSMP");
  });

  it("validThrough je 6 mesiacov po datePosted", () => {
    expect(staffValidThrough(input.createdAt).startsWith("2026-07-10")).toBe(true);
  });

  it("je serializovateľný bez chýb a bez undefined hodnôt", () => {
    const graph = buildStaffPostJsonLdGraph(input);
    const raw = JSON.stringify(graph);
    expect(raw).not.toContain("undefined");
    expect(JSON.parse(raw)).toHaveLength(3);
  });

  it("graf obsahuje korektne číslované drobečky", () => {
    const graph = buildStaffPostJsonLdGraph(input);
    const crumbs = graph.find((n) => n["@type"] === "BreadcrumbList") as
      | { itemListElement: { position: number; name: string; item: string }[] }
      | undefined;
    expect(crumbs).toBeTruthy();
    expect(crumbs!.itemListElement.map((i) => i.position)).toEqual([1, 2, 3]);
    expect(crumbs!.itemListElement.every((i) => i.name && i.item.startsWith("https://"))).toBe(true);
  });

  it("funguje aj bez obrázka, servera a požiadaviek", () => {
    const ld = buildStaffPostJsonLd({
      position: "Builder",
      description: "Popis inzerátu",
      slug: "builder",
      createdAt: "2026-02-01T00:00:00.000Z",
    });
    expect(ld.image).toBeUndefined();
    expect(ld.qualifications).toBeUndefined();
    expect((ld.hiringOrganization as Record<string, string>).name).toBe("MCServery");
  });
});
