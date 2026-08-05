import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import VersionBadge from "../VersionBadge";

const renderBadge = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

/**
 * Simulácia čítačky obrazovky: prečíta prístupné meno (aria-label)
 * a prístupný popis (aria-describedby) daného prvku.
 */
const screenReaderAnnouncement = (el: HTMLElement) => {
  const name = el.getAttribute("aria-label") ?? el.textContent ?? "";
  const describedBy = el.getAttribute("aria-describedby");
  const desc = describedBy
    ? Array.from(describedBy.split(/\s+/))
        .map((id) => document.getElementById(id)?.textContent ?? "")
        .join(" ")
    : "";
  const role =
    el.getAttribute("role") ??
    (el.tagName === "A" ? "link" : el.tagName === "BUTTON" ? "button" : "text");
  return `${name} ${desc} (${role})`.replace(/\s+/g, " ").trim();
};

describe("VersionBadge – ARIA a čítačka obrazovky", () => {
  it("čítačka prečíta verziu aj popis kompatibility bez otvorenia tooltipu", () => {
    renderBadge(<VersionBadge version="26.2" />);
    const badge = screen.getByLabelText("Verzia v26.2");

    const announcement = screenReaderAnnouncement(badge);
    expect(announcement).toContain("Verzia v26.2");
    expect(announcement).toMatch(/len pre Java Edition/i);
    expect(announcement).toContain("(button)");
  });

  it("popis je previazaný cez aria-describedby na existujúci prvok", () => {
    renderBadge(<VersionBadge version="1.20.4" />);
    const badge = screen.getByLabelText("Verzia v1.20.4");
    const id = badge.getAttribute("aria-describedby");
    expect(id).toBeTruthy();
    const desc = document.getElementById(id!);
    expect(desc).not.toBeNull();
    expect(desc!.textContent).toMatch(/Java aj Bedrock Edition/i);
    expect(desc!.className).toContain("sr-only");
  });

  it("odkazová varianta má popisné meno aj popis pre čítačku", () => {
    renderBadge(<VersionBadge version="26.2" linkToFilter />);
    const link = screen.getByRole("link", {
      name: "Filtrovať servery podľa verzie v26.2",
    });
    expect(screenReaderAnnouncement(link)).toMatch(/len pre Java Edition/i);
  });

  it("ikona odznaku je pre čítačku skrytá (aria-hidden)", () => {
    const { container } = renderBadge(<VersionBadge version="26.2" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("stav rozbalenia oznamuje cez aria-expanded a ovláda sa klávesnicou", async () => {
    renderBadge(<VersionBadge version="26.2" />);
    const badge = screen.getByLabelText("Verzia v26.2");
    expect(badge).toHaveAttribute("aria-expanded", "false");
    expect(badge).toHaveAttribute("tabindex", "0");

    fireEvent.keyDown(badge, { key: "Enter" });
    await waitFor(() => expect(badge).toHaveAttribute("aria-expanded", "true"));

    fireEvent.keyDown(badge, { key: "Escape" });
    await waitFor(() => expect(badge).toHaveAttribute("aria-expanded", "false"));

    fireEvent.keyDown(badge, { key: " " });
    await waitFor(() => expect(badge).toHaveAttribute("aria-expanded", "true"));
  });

  it("bez tooltipu je odznak čistý text bez interaktívnej sémantiky", () => {
    renderBadge(<VersionBadge version="26.2" showTooltip={false} />);
    const badge = screen.getByLabelText("Verzia v26.2");
    expect(badge).not.toHaveAttribute("role");
    expect(badge).not.toHaveAttribute("tabindex");
    expect(badge).not.toHaveAttribute("aria-describedby");
    expect(badge).not.toHaveAttribute("aria-expanded");
  });

  it("kontrast drží cez sémantické tokeny aj vo forced-colors a contrast-more", () => {
    renderBadge(<VersionBadge version="26.2" />);
    const cls = screen.getByLabelText("Verzia v26.2").className;
    // žiadne natvrdo zadané farby
    expect(cls).not.toMatch(/text-white|bg-black|bg-\[#|text-gray-/);
    expect(cls).toContain("bg-primary/90");
    expect(cls).toContain("text-primary-foreground");
    expect(cls).toContain("contrast-more:bg-primary");
    expect(cls).toContain("forced-colors:text-[ButtonText]");
    expect(cls).toContain("focus-visible:ring-2");
  });
});
