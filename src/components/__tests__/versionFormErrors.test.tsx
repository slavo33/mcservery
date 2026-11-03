import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { LanguageProvider } from "@/i18n/LanguageContext";
import AddServer from "@/pages/AddServer";
import EditServer from "@/pages/EditServer";

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

const inserted: CapturedServerRow[] = [];
const updated: CapturedServerUpdate[] = [];

const SERVER_ROW = {
  id: "server-1",
  owner_id: "test-user",
  name: "TestServer",
  ip: "play.testserver.sk",
  description: "Popis",
  version: "26.2",
  software: "Paper",
  proxy: "",
  platform: ["java"],
  minigames: [],
  images: [],
  is_warez: false,
  has_whitelist: false,
  slug: "testserver",
};

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "test-user" }, profile: null, loading: false }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useParams: () => ({ slug: "testserver" }) };
});

vi.mock("@/integrations/supabase/client", () => {
  const selectChain = (table: string) => ({
    eq: () =>
      Object.assign(Promise.resolve({ data: [], count: 0, error: null }), {
        single: () =>
          Promise.resolve({
            data: table === "servers" ? SERVER_ROW : null,
            error: null,
          }),
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
      }),
  });
  return {
    supabase: {
      from: (table: string) => ({
        select: () => selectChain(table),
        insert: (row: CapturedServerRow) => {
          inserted.push(row);
          return Promise.resolve({ error: null });
        },
        update: (row: CapturedServerUpdate) => {
          updated.push(row);
          return { eq: () => Promise.resolve({ error: null }) };
        },
        upsert: (row: CapturedServerUpdate) => {
          updated.push(row);
          return Promise.resolve({ error: null });
        },
      }),
    },
  };
});

const wrap = (ui: React.ReactElement) =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <LanguageProvider>{ui}</LanguageProvider>
      </MemoryRouter>
    </HelmetProvider>
  );

const versionSelect = () =>
  screen.getByRole("option", { name: "26.2" }).closest("select") as HTMLSelectElement;

describe("chybové hlášky pri verzii — pridanie servera", () => {
  beforeEach(() => {
    inserted.length = 0;
    updated.length = 0;
  });

  it("odmietne odoslanie s prázdnou verziou a zobrazí zrozumiteľnú hlášku", async () => {
    const { container } = wrap(<AddServer />);
    const inputs = container.querySelectorAll("input[type=text]");
    fireEvent.change(inputs[0], { target: { value: "BezVerzie" } });
    fireEvent.change(inputs[1], { target: { value: "play.bezverzie.sk" } });

    fireEvent.submit(container.querySelector("form")!);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/Vyber verziu Minecraftu/i);
    expect(versionSelect()).toHaveAttribute("aria-invalid", "true");
    expect(inserted).toHaveLength(0);
  });

  it("odmietne odoslanie s neplatnou (neznámou) verziou", async () => {
    const { container } = wrap(<AddServer />);
    const inputs = container.querySelectorAll("input[type=text]");
    fireEvent.change(inputs[0], { target: { value: "ZlaVerzia" } });
    fireEvent.change(inputs[1], { target: { value: "play.zlaverzia.sk" } });

    const select = versionSelect();
    // Simulácia obídenia UI — do selectu sa dostane hodnota mimo ponuky.
    const rogue = document.createElement("option");
    rogue.value = "99.9.9";
    select.appendChild(rogue);
    fireEvent.change(select, { target: { value: "99.9.9" } });

    fireEvent.submit(container.querySelector("form")!);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/nie je v zozname podporovaných verzií/i);
    expect(inserted).toHaveLength(0);
  });

  it("hláška zmizne po zvolení platnej verzie", async () => {
    const { container } = wrap(<AddServer />);
    const inputs = container.querySelectorAll("input[type=text]");
    fireEvent.change(inputs[0], { target: { value: "OK" } });
    fireEvent.change(inputs[1], { target: { value: "play.ok.sk" } });
    fireEvent.submit(container.querySelector("form")!);
    await screen.findByRole("alert");

    fireEvent.change(versionSelect(), { target: { value: "26.2" } });
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });
});

describe("chybové hlášky pri verzii — editácia servera", () => {
  beforeEach(() => {
    inserted.length = 0;
    updated.length = 0;
  });

  it("odmietne uloženie, keď sa verzia vymaže", async () => {
    const { container } = wrap(<EditServer />);
    await waitFor(() => expect(versionSelect().value).toBe("26.2"));

    fireEvent.change(versionSelect(), { target: { value: "" } });
    fireEvent.submit(container.querySelector("form")!);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/Vyber verziu Minecraftu/i);
    expect(versionSelect()).toHaveAttribute("aria-invalid", "true");
    expect(updated).toHaveLength(0);
  });

  it("odmietne uloženie s neplatnou verziou", async () => {
    const { container } = wrap(<EditServer />);
    await waitFor(() => expect(versionSelect().value).toBe("26.2"));

    const select = versionSelect();
    const rogue = document.createElement("option");
    rogue.value = "abc";
    select.appendChild(rogue);
    fireEvent.change(select, { target: { value: "abc" } });
    fireEvent.submit(container.querySelector("form")!);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/nie je v zozname podporovaných verzií/i);
    expect(updated).toHaveLength(0);
  });
});
