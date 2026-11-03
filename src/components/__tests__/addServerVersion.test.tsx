import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { LanguageProvider } from "@/i18n/LanguageContext";
import AddServer from "@/pages/AddServer";
import VersionBadge from "@/components/VersionBadge";

type CapturedServerRow = {
  name: string;
  ip: string;
  description: string;
  version: string;
  platform?: string[];
  proxy?: string | null;
  [key: string]: unknown;
};
type CapturedServerUpdate = Partial<CapturedServerRow> & Record<string, unknown>;

/** Zachytené riadky "databázy" */
const inserted: CapturedServerRow[] = [];

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "test-user" }, profile: null, loading: false }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () =>
          Object.assign(
            Promise.resolve({ data: [], count: 0, error: null }),
            { maybeSingle: () => Promise.resolve({ data: null, error: null }) }
          ),
      }),
      insert: (row: CapturedServerRow) => {
        inserted.push(row);
        return Promise.resolve({ error: null });
      },
    }),
  },
}));

const wrap = (ui: React.ReactElement) =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <LanguageProvider>{ui}</LanguageProvider>
      </MemoryRouter>
    </HelmetProvider>
  );

describe("uloženie verzie 26.2 pri vytváraní servera", () => {
  beforeEach(() => {
    inserted.length = 0;
  });

  it("uloží vybratú verziu 26.2 a zobrazí ju na profile ako v26.2", async () => {
    const { container } = wrap(<AddServer />);

    const inputs = container.querySelectorAll("input[type=text]");
    fireEvent.change(inputs[0], { target: { value: "TestServer" } });
    fireEvent.change(inputs[1], { target: { value: "play.testserver.sk" } });

    const versionSelect = screen.getByRole("option", { name: "26.2" })
      .closest("select") as HTMLSelectElement;
    fireEvent.change(versionSelect, { target: { value: "26.2" } });
    expect(versionSelect.value).toBe("26.2");

    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => expect(inserted).toHaveLength(1));
    // 1) do databázy ide presne vybratá verzia
    expect(inserted[0].version).toBe("26.2");

    // 2) profil servera vykreslí uloženú hodnotu v jednotnom tvare
    const stored = inserted[0].version as string;
    render(<VersionBadge version={stored} />);
    expect(screen.getByText("v26.2")).toBeInTheDocument();
  });

  it("nič neuloží, ak verzia nie je vybratá", async () => {
    const { container } = wrap(<AddServer />);
    const inputs = container.querySelectorAll("input[type=text]");
    fireEvent.change(inputs[0], { target: { value: "BezVerzie" } });
    fireEvent.change(inputs[1], { target: { value: "play.bezverzie.sk" } });

    fireEvent.submit(container.querySelector("form")!);

    await new Promise((r) => setTimeout(r, 50));
    expect(inserted).toHaveLength(0);
  });
});
