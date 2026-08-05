import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import VersionBadge from "../VersionBadge";

const renderBadge = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe("VersionBadge – tooltip s kompatibilitou", () => {
  it("po kliknutí/ťuknutí zobrazí plnú verziu a popis kompatibility (mobil)", async () => {
    renderBadge(<VersionBadge version="26.2" />);
    fireEvent.click(screen.getByLabelText("Verzia v26.2"));

    await waitFor(() => {
      expect(screen.getAllByText("Minecraft v26.2").length).toBeGreaterThan(0);
    });
    const summary = screen.getAllByText(/len pre Java Edition/i)[0];
    expect(summary).toHaveTextContent("Paper");
    expect(summary).toHaveTextContent("Velocity");
  });

  it("pre staršiu verziu popíše Java aj Bedrock podporu", async () => {
    renderBadge(<VersionBadge version="1.20.4" />);
    fireEvent.click(screen.getByLabelText("Verzia v1.20.4"));

    await waitFor(() => {
      expect(
        screen.getAllByText(/Java aj Bedrock Edition/i).length
      ).toBeGreaterThan(0);
    });
  });

  it("opakované ťuknutie tooltip zase zavrie", async () => {
    renderBadge(<VersionBadge version="26.2" />);
    const badge = screen.getByLabelText("Verzia v26.2");
    fireEvent.click(badge);
    await waitFor(() =>
      expect(screen.getAllByText("Minecraft v26.2").length).toBeGreaterThan(0)
    );
    fireEvent.click(badge);
    await waitFor(() =>
      expect(screen.queryByText("Minecraft v26.2")).not.toBeInTheDocument()
    );
  });

  it("na odkaze (profil) prvý ťuk ukáže tooltip a až druhý naviguje", async () => {
    const Location = () => {
      const loc = useLocation();
      return <div data-testid="loc">{loc.pathname + loc.search}</div>;
    };
    render(
      <MemoryRouter initialEntries={["/server/test"]}>
        <VersionBadge version="26.2" linkToFilter />
        <Location />
      </MemoryRouter>
    );
    const link = screen.getByRole("link", {
      name: "Filtrovať servery podľa verzie v26.2",
    });
    expect(link).toHaveAttribute("href", "/servers?version=26.2");

    fireEvent.touchStart(link);
    fireEvent.click(link);
    await waitFor(() =>
      expect(screen.getAllByText("Minecraft v26.2").length).toBeGreaterThan(0)
    );
    // prvý ťuk nenaviguje
    expect(screen.getByTestId("loc")).toHaveTextContent("/server/test");

    fireEvent.click(link);
    await waitFor(() =>
      expect(screen.getByTestId("loc")).toHaveTextContent(
        "/servers?version=26.2"
      )
    );
  });

  it("dá sa vypnúť cez showTooltip={false}", () => {
    renderBadge(<VersionBadge version="26.2" showTooltip={false} />);
    const badge = screen.getByLabelText("Verzia v26.2");
    fireEvent.click(badge);
    expect(screen.queryByText("Minecraft v26.2")).not.toBeInTheDocument();
    expect(badge).not.toHaveAttribute("role", "button");
  });

  it("odznak s tooltipom je dostupný z klávesnice", () => {
    renderBadge(<VersionBadge version="26.2" />);
    const badge = screen.getByLabelText("Verzia v26.2");
    expect(badge).toHaveAttribute("tabindex", "0");
    expect(badge).toHaveAttribute("role", "button");
  });
});
