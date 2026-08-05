import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import VersionBadge from "../VersionBadge";

/** Reprezentatívne dĺžky verzií — od najkratšej po najdlhšiu. */
const VERSIONS = ["1.7", "26.2", "1.20.4", "1.21.10", "1.21.10.1"] as const;

/** Bežné šírky mobilov (px) — od najužšieho zariadenia po veľký telefón. */
const MOBILE_WIDTHS = [320, 360, 375, 390, 414, 430] as const;

const renderAt = (ui: React.ReactElement, width: number) =>
  render(<MemoryRouter>{ui}</MemoryRouter>, {
    container: document.body.appendChild(
      Object.assign(document.createElement("div"), {
        style: `width:${width}px`,
      })
    ),
  });

describe("VersionBadge – vizuálna regresia (dĺžky verzií)", () => {
  it.each(VERSIONS)("markup odznaku pre v%s zostáva nezmenený", (version) => {
    const { container } = renderAt(<VersionBadge version={version} />, 375);
    expect(container.firstChild).toMatchSnapshot();
  });

  it.each(VERSIONS)(
    "klikateľný odznak (profil) pre v%s zostáva nezmenený",
    (version) => {
      const { container } = renderAt(
        <VersionBadge version={version} linkToFilter />,
        375
      );
      expect(container.firstChild).toMatchSnapshot();
    }
  );

  it("dlhšia verzia nemení layoutové triedy oproti kratšej", () => {
    const classesFor = (version: string) => {
      const { container } = renderAt(<VersionBadge version={version} />, 375);
      return (container.firstElementChild as HTMLElement).className;
    };
    expect(classesFor("1.21.10")).toBe(classesFor("26.2"));
    expect(classesFor("1.20.4")).toBe(classesFor("1.7"));
  });
});

describe("VersionBadge – vizuálna regresia (šírky mobilov)", () => {
  it.each(MOBILE_WIDTHS)(
    "pri šírke %ipx nikdy nezalamuje a ostáva čitateľný",
    (width) => {
      for (const version of VERSIONS) {
        const { container } = renderAt(<VersionBadge version={version} />, width);
        const badge = container.firstElementChild as HTMLElement;

        // žiadne zalamovanie ani na najužšom telefóne
        expect(badge.className).toContain("whitespace-nowrap");
        expect(badge.className).toContain("text-nowrap");
        expect(badge.className).toContain("tabular-nums");
        // jednoriadkový inline-flex layout
        expect(badge.className).toContain("inline-flex");
        expect(badge.className).toContain("leading-none");
        // kompaktné odsadenie na mobile, väčšie od sm:
        expect(badge.className).toContain("px-1.5");
        expect(badge.className).toContain("text-xs");
        expect(badge.className).toContain("sm:px-2.5");
        expect(badge.className).toContain("sm:text-sm");
        // vysoký kontrast cez sémantické tokeny
        expect(badge.className).toContain("bg-primary/90");
        expect(badge.className).toContain("text-primary-foreground");
        // ikona sa nikdy nezmenší/nezdeformuje
        expect(badge.querySelector("svg")?.getAttribute("class")).toContain(
          "shrink-0"
        );
      }
    }
  );

  it("na každej šírke zobrazí celý text verzie (nič sa nestratí)", () => {
    for (const width of MOBILE_WIDTHS) {
      for (const version of VERSIONS) {
        renderAt(<VersionBadge version={version} />, width);
        expect(
          screen.getAllByLabelText(`Verzia v${version}`)[0]
        ).toHaveTextContent(`v${version}`);
        document.body.innerHTML = "";
      }
    }
  });
});
