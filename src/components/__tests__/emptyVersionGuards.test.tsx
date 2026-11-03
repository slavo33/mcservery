import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { LanguageProvider } from "@/i18n/LanguageContext";
import AddServer from "@/pages/AddServer";
import EditServer from "@/pages/EditServer";
import VersionBadge, { formatVersion } from "@/components/VersionBadge";
import { buildServerMeta, toSoftwareVersion } from "@/lib/serverJsonLd";

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
  description: "Popis testovacieho servera.",
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

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ slug: SERVER_ROW.slug }),
    useNavigate: () => vi.fn(),
  };
});

vi.mock("@/integrations/supabase/client", () => {
  const selectChain = (table: string) => ({
    eq: () =>
      Object.assign(Promise.resolve({ data: [], count: 0, error: null }), {
        single: () =>
          Promise.resolve({ data: table === "servers" ? SERVER_ROW : null, error: null }),
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
          if (table === "servers") updated.push(row);
          return { eq: () => Promise.resolve({ error: null }) };
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

/** Nikde na stránke nesmie ostať odznak verzie (aria-label "Verzia v…" alebo text vX.Y). */
const noVersionBadge = (container: HTMLElement) =>
  container.querySelectorAll('[aria-label^="Verzia v"], [aria-label^="Filtrovať servery podľa verzie"]')
    .length === 0 && !/\bv\d+\.\d+/.test(container.textContent || "");

describe("prázdna verzia — pridanie servera", () => {
  beforeEach(() => {
    inserted.length = 0;
    updated.length = 0;
  });

  it("zobrazí zrozumiteľnú hlášku, neodošle formulár a nevykreslí odznak", async () => {
    const { container } = wrap(<AddServer />);
    const inputs = container.querySelectorAll("input[type=text]");
    fireEvent.change(inputs[0], { target: { value: "BezVerzie" } });
    fireEvent.change(inputs[1], { target: { value: "play.bezverzie.sk" } });

    expect(noVersionBadge(container)).toBe(true);

    fireEvent.submit(container.querySelector("form")!);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent?.trim().length).toBeGreaterThan(10);
    expect(alert.textContent).toMatch(/Vyber verziu Minecraftu/i);
    expect(versionSelect()).toHaveAttribute("aria-invalid", "true");
    expect(inserted).toHaveLength(0);
    expect(noVersionBadge(container)).toBe(true);
  });

  it("opakované odoslanie bez verzie nič neuloží a hláška ostáva", async () => {
    const { container } = wrap(<AddServer />);
    const inputs = container.querySelectorAll("input[type=text]");
    fireEvent.change(inputs[0], { target: { value: "BezVerzie2" } });
    fireEvent.change(inputs[1], { target: { value: "play.bezverzie2.sk" } });

    fireEvent.submit(container.querySelector("form")!);
    await screen.findByRole("alert");
    fireEvent.submit(container.querySelector("form")!);
    await new Promise((r) => setTimeout(r, 50));

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(inserted).toHaveLength(0);
  });
});

describe("prázdna verzia — editácia servera", () => {
  beforeEach(() => {
    inserted.length = 0;
    updated.length = 0;
  });

  it("po vymazaní verzie zobrazí hlášku, neuloží zmenu a nezobrazí starý odznak", async () => {
    const { container } = wrap(<EditServer />);
    await waitFor(() => expect(versionSelect().value).toBe("26.2"));

    fireEvent.change(versionSelect(), { target: { value: "" } });
    fireEvent.submit(container.querySelector("form")!);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/Vyber verziu Minecraftu/i);
    expect(versionSelect()).toHaveAttribute("aria-invalid", "true");
    expect(updated).toHaveLength(0);
    expect(noVersionBadge(container)).toBe(true);
  });
});

describe("odznak a metadáta pri chýbajúcej verzii", () => {
  it("VersionBadge nevykreslí nič pre prázdnu alebo neplatnú hodnotu", () => {
    for (const value of ["", "   ", null, undefined, "v", "abc", "26.x", "v.", "1..2"]) {
      const { container, unmount } = render(<VersionBadge version={value} />);
      expect(container.innerHTML).toBe("");
      expect(formatVersion(value)).toBeNull();
      unmount();
    }
  });

  it("SEO title/description a JSON-LD neuvádzajú verziu, keď chýba", () => {
    const meta = buildServerMeta({ ...SERVER_ROW, version: "" });
    expect(meta.versionLabel).toBeNull();
    expect(meta.title).not.toMatch(/\bv\d/);
    expect(meta.description).not.toMatch(/Verzia v/);
    expect(meta.jsonLd.softwareVersion).toBeUndefined();
    expect(toSoftwareVersion("")).toBeNull();
  });
});
