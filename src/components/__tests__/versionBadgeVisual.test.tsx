import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import VersionBadge, { formatVersion } from "../VersionBadge";

const renderBadge = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe("VersionBadge – vizuálne zobrazenie", () => {
  it("na karte servera vykreslí verziu ako neklikateľný odznak", () => {
    renderBadge(<VersionBadge version="26.2" />);
    const badge = screen.getByLabelText("Verzia v26.2");
    expect(badge).toBeInTheDocument();
    expect(badge.tagName).toBe("SPAN");
    expect(badge).toHaveTextContent("v26.2");
  });

  it("na profile servera je odznak odkaz na filter podľa verzie", () => {
    renderBadge(<VersionBadge version="26.2" linkToFilter />);
    const link = screen.getByRole("link", {
      name: "Filtrovať servery podľa verzie v26.2",
    });
    expect(link).toHaveAttribute("href", "/servers?version=26.2");
  });

  it("nikdy nezalamuje text a má vysoký kontrast", () => {
    renderBadge(<VersionBadge version="1.20.4" />);
    const badge = screen.getByLabelText("Verzia v1.20.4");
    expect(badge.className).toContain("whitespace-nowrap");
    expect(badge.className).toContain("text-nowrap");
    expect(badge.className).toContain("tabular-nums");
    expect(badge.className).toContain("bg-primary/90");
    expect(badge.className).toContain("text-primary-foreground");
  });

  it("aplikuje doplnkové triedy z props (rôzne umiestnenie na karte/profile)", () => {
    renderBadge(<VersionBadge version="26.2" className="ml-2" />);
    expect(screen.getByLabelText("Verzia v26.2").className).toContain("ml-2");
  });

  it("normalizuje vstup s 'v' a medzerami rovnako ako po editácii", () => {
    expect(formatVersion(" V26.2 ")).toBe("v26.2");
    expect(formatVersion("1.21")).toBe("v1.21");
    expect(formatVersion("")).toBeNull();
    expect(formatVersion(null)).toBeNull();
    expect(formatVersion("neplatna")).toBeNull();
  });

  it("po editácii verzie zobrazí novú hodnotu (karta aj profil)", () => {
    const { rerender } = renderBadge(<VersionBadge version="26.2" />);
    expect(screen.getByLabelText("Verzia v26.2")).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <VersionBadge version="v1.20.4" />
      </MemoryRouter>
    );
    expect(screen.queryByLabelText("Verzia v26.2")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Verzia v1.20.4")).toHaveTextContent("v1.20.4");

    // profilová varianta prepne aj cieľ filtra
    rerender(
      <MemoryRouter>
        <VersionBadge version="1.20.4" linkToFilter />
      </MemoryRouter>
    );
    expect(
      screen.getByRole("link", { name: "Filtrovať servery podľa verzie v1.20.4" })
    ).toHaveAttribute("href", "/servers?version=1.20.4");
  });

  it("po editácii na prázdnu/neplatnú hodnotu sa odznak vôbec nevykreslí", () => {
    const { rerender, container } = renderBadge(<VersionBadge version="26.2" />);
    rerender(
      <MemoryRouter>
        <VersionBadge version="   " />
      </MemoryRouter>
    );
    expect(container.querySelector("[aria-label^='Verzia']")).toBeNull();
  });
});
