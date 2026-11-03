import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { LanguageProvider } from "@/i18n/LanguageContext";
import AddServer from "@/pages/AddServer";

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

const toastError = vi.fn<(message: string) => void>();
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: (message: string) => toastError(message) },
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

const wrap = () =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <LanguageProvider>
          <AddServer />
        </LanguageProvider>
      </MemoryRouter>
    </HelmetProvider>
  );

const selectByOption = (name: string) =>
  screen.getByRole("option", { name }).closest("select") as HTMLSelectElement;

const fillBasics = (container: HTMLElement, name: string, ip: string) => {
  const inputs = container.querySelectorAll("input[type=text]");
  fireEvent.change(inputs[0], { target: { value: name } });
  fireEvent.change(inputs[1], { target: { value: ip } });
};

describe("integrácia: verzia 26.2 a nekompatibilné voľby", () => {
  beforeEach(() => {
    inserted.length = 0;
    toastError.mockClear();
  });

  it("po výbere 26.2 skryje Bedrock, nekompatibilný software aj staré proxy", () => {
    const { container } = wrap();
    const versionSelect = selectByOption("26.2");

    // pred výberom next-gen verzie je Bedrock dostupný
    fireEvent.change(versionSelect, { target: { value: "1.21" } });
    expect(screen.getByRole("button", { name: "Bedrock" })).toBeInTheDocument();

    fireEvent.change(versionSelect, { target: { value: "26.2" } });

    // platformy: len Java
    expect(screen.queryByRole("button", { name: "Bedrock" })).toBeNull();
    expect(screen.getByRole("button", { name: "Java" })).toBeInTheDocument();

    // software: bez loaderov bez buildu pre 26.x
    const softwareSelect = selectByOption("Paper");
    const swOptions = within(softwareSelect).getAllByRole("option").map((o) => o.textContent);
    expect(swOptions).toContain("Paper");
    for (const bad of ["Magma", "Mohist", "Bedrock", "Nukkit", "PocketMine"]) {
      expect(swOptions).not.toContain(bad);
    }

    // proxy: bez BungeeCord/Waterfall
    const proxySelect = selectByOption("Velocity");
    const pxOptions = within(proxySelect).getAllByRole("option").map((o) => o.textContent);
    expect(pxOptions).toContain("Velocity");
    expect(pxOptions).not.toContain("BungeeCord");
    expect(pxOptions).not.toContain("Waterfall");

    expect(
      screen.getByText(/iba pre Java Edition/i)
    ).toBeInTheDocument();
  });

  it("pri prechode na 26.2 vyčistí už zvolené nekompatibilné voľby a neuloží ich", async () => {
    const { container } = wrap();
    const versionSelect = selectByOption("26.2");

    fillBasics(container, "MixServer", "play.mixserver.sk");

    // stará verzia -> zvolíme Bedrock + staré proxy
    fireEvent.change(versionSelect, { target: { value: "1.21" } });
    fireEvent.click(screen.getByRole("button", { name: "Java" }));
    fireEvent.click(screen.getByRole("button", { name: "Bedrock" }));
    const oldProxy = selectByOption("Velocity");
    if (within(oldProxy).queryByRole("option", { name: "BungeeCord" })) {
      fireEvent.change(oldProxy, { target: { value: "BungeeCord" } });
    }

    // prepnutie na next-gen verziu
    fireEvent.change(versionSelect, { target: { value: "26.2" } });
    expect(screen.queryByRole("button", { name: "Bedrock" })).toBeNull();

    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => expect(inserted).toHaveLength(1));
    const row = inserted[0];
    expect(row.version).toBe("26.2");
    expect(row.platform).not.toContain("bedrock");
    expect(row.platform).toEqual(["java"]);
    expect(row.proxy).toBeNull();
  });

  it("zablokuje uloženie, keď je stav formulára nekompatibilný s 26.2", async () => {
    const { validateVersionCombination } = await import("@/lib/versionCompatibility");
    // simulácia obídenia UI (napr. cez devtools) – validácia musí zabrániť uloženiu
    const err = validateVersionCombination({
      version: "26.2",
      software: "Magma",
      proxy: "BungeeCord",
      platform: ["Java", "Bedrock"],
    });
    expect(err).toBeTruthy();
    expect(inserted).toHaveLength(0);
  });
});
