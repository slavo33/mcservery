import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { LanguageProvider } from "@/i18n/LanguageContext";
import EditServer from "@/pages/EditServer";
import {
  validateVersionCombination,
  validateVersionSelection,
} from "@/lib/versionCompatibility";

/** Server, ktorý prišiel z databázy v nekompatibilnom stave (26.2 + Bedrock). */
const SERVER_ROW = {
  id: "server-1",
  owner_id: "test-user",
  name: "TestServer",
  ip: "play.testserver.sk",
  description: "Popis",
  version: "26.2",
  software: "Paper",
  proxy: "BungeeCord",
  platform: ["bedrock"],
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
  const actual = await vi.importActual<any>("react-router-dom");
  return { ...actual, useParams: () => ({ slug: "testserver" }), useNavigate: () => vi.fn() };
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
        insert: () => Promise.resolve({ error: null }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        upsert: () => Promise.resolve({ error: null }),
      }),
    },
  };
});

describe("hlášky pri nekompatibilnej kombinácii — dôvod a náhrada", () => {
  it("platforma: uvedie dôvod (len Java) aj čo má používateľ spraviť", () => {
    const msg = validateVersionCombination({
      version: "26.2",
      software: "Paper",
      proxy: "",
      platform: ["Bedrock"],
    })!;
    expect(msg).toContain("Bedrock");
    expect(msg).toContain("26.2");
    expect(msg).toMatch(/len pre Java Edition/i); // dôvod
    expect(msg).toMatch(/nechaj označenú iba Java/i); // navrhovaná náhrada
    expect(msg).toMatch(/staršiu verziu/i);
  });

  it("software: vysvetlí, že chýba build, a vymenuje podporované náhrady", () => {
    const msg = validateVersionCombination({
      version: "26.2",
      software: "BungeeCord",
      proxy: "",
      platform: ["Java"],
    })!;
    expect(msg).toMatch(/BungeeCord zatiaľ nemá build pre verziu 26\.2/i); // dôvod
    expect(msg).toMatch(/server nenaštartoval/i);
    expect(msg).toMatch(/Vyber niektorý z podporovaných:/i); // náhrada
    expect(msg).toMatch(/Paper|Vanilla|Fabric/);
  });

  it("proxy: vysvetlí chýbajúci protokol a ponúkne konkrétne proxy", () => {
    const msg = validateVersionCombination({
      version: "26.2",
      software: "Paper",
      proxy: "Waterfall",
      platform: ["Java"],
    })!;
    expect(msg).toMatch(/Proxy Waterfall nepodporuje verziu 26\.2/i);
    expect(msg).toMatch(/nemajú protokol pre 26\.x/i); // dôvod
    expect(msg).toMatch(/Velocity/); // náhrada
    expect(msg).toMatch(/Žiadny/);
  });

  it("chýbajúca a neznáma verzia ponúkajú konkrétne verzie na výber", () => {
    const empty = validateVersionSelection("")!;
    expect(empty).toMatch(/Vyber verziu Minecraftu/i);
    expect(empty).toMatch(/Najnovšie dostupné sú .*\d+\.\d+/);

    const unknown = validateVersionSelection("77.7")!;
    expect(unknown).toMatch(/„77\.7“ nie je v zozname podporovaných verzií/i);
    expect(unknown).toMatch(/Vyber jednu z ponuky, napr\. .*\d+\.\d+/);
  });

  it("platná kombinácia nevracia žiadnu hlášku", () => {
    expect(
      validateVersionCombination({
        version: "26.2",
        software: "Paper",
        proxy: "Velocity",
        platform: ["Java"],
      })
    ).toBeNull();
  });

  it("vo formulári sa dôvod aj náhrada zobrazia okamžite, bez odoslania", async () => {
    render(
      <HelmetProvider>
        <MemoryRouter>
          <LanguageProvider>
            <EditServer />
          </LanguageProvider>
        </MemoryRouter>
      </HelmetProvider>
    );

    const alert = await screen.findByRole("alert");
    await waitFor(() => expect(alert.textContent).toMatch(/Bedrock/));
    expect(alert.textContent).toMatch(/len pre Java Edition/i);
    expect(alert.textContent).toMatch(/nechaj označenú iba Java/i);
  });
});
