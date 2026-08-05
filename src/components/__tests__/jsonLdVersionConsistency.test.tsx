import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { LanguageProvider } from "@/i18n/LanguageContext";
import AddServer from "@/pages/AddServer";
import EditServer from "@/pages/EditServer";
import { buildServerMeta, isSoftwareVersionConsistent } from "@/lib/serverJsonLd";
import { versions } from "@/lib/mockData";

const inserted: any[] = [];
const updated: any[] = [];

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
  const actual = await vi.importActual<any>("react-router-dom");
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
        insert: (row: any) => {
          inserted.push(row);
          return Promise.resolve({ error: null });
        },
        update: (row: any) => {
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

const selectFor = (version: string) =>
  screen.getByRole("option", { name: version }).closest("select") as HTMLSelectElement;

/** JSON-LD, ktoré je práve v hlavičke dokumentu (profil po editácii). */
const headJsonLd = () => {
  const el = document.head.querySelector('script[type="application/ld+json"]');
  return el ? JSON.parse(el.textContent || "{}") : {};
};

const VERSION_PATTERN = /^v\d+(\.\d+){1,3}$/;

describe("JSON-LD softwareVersion zodpovedá zvolenej verzii", () => {
  beforeEach(() => {
    inserted.length = 0;
    updated.length = 0;
    document.head.querySelectorAll("meta, link, script").forEach((el) => el.remove());
    document.title = "";
  });

  it("po vytvorení servera s 26.2 má profil softwareVersion v26.2", async () => {
    const { container } = wrap(<AddServer />);
    const inputs = container.querySelectorAll("input[type=text]");
    fireEvent.change(inputs[0], { target: { value: "JsonLdServer" } });
    fireEvent.change(inputs[1], { target: { value: "play.jsonld.sk" } });
    fireEvent.change(selectFor("26.2"), { target: { value: "26.2" } });

    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => expect(inserted).toHaveLength(1));

    // Profil stavia JSON-LD z uloženého riadku – rovnaká cesta ako ServerDetail.
    const meta = buildServerMeta({
      name: inserted[0].name,
      ip: inserted[0].ip,
      description: inserted[0].description,
      version: inserted[0].version,
      slug: "jsonld",
    });
    expect(meta.jsonLd.softwareVersion).toBe("v26.2");
    expect(meta.jsonLd.softwareVersion as string).toMatch(VERSION_PATTERN);
    expect(isSoftwareVersionConsistent(meta.jsonLd, inserted[0].version)).toBe(true);
  });

  it("po editácii na 1.20.4 má profil v hlavičke softwareVersion v1.20.4", async () => {
    const { container } = wrap(<EditServer />);
    await waitFor(() => expect(selectFor("1.20.4").value).toBe("26.2"));

    fireEvent.change(selectFor("1.20.4"), { target: { value: "1.20.4" } });
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => expect(updated).toHaveLength(1));
    await waitFor(() => expect(headJsonLd().softwareVersion).toBe("v1.20.4"));
    expect(headJsonLd().softwareVersion).toMatch(VERSION_PATTERN);
    expect(isSoftwareVersionConsistent(headJsonLd(), updated[0].version)).toBe(true);
    // Stará verzia sa v JSON-LD už nesmie vyskytovať.
    expect(JSON.stringify(headJsonLd())).not.toContain("26.2");
  });

  it("každá ponúkaná verzia dáva softwareVersion v tvare vX.Y", () => {
    for (const version of versions) {
      const meta = buildServerMeta({ ...SERVER_ROW, version });
      expect(meta.jsonLd.softwareVersion, version).toMatch(VERSION_PATTERN);
      expect(meta.jsonLd.softwareVersion).toBe(`v${version}`);
      expect(isSoftwareVersionConsistent(meta.jsonLd, version)).toBe(true);
      // Tolerancia voči zápisu s prefixom / medzerami z databázy.
      expect(buildServerMeta({ ...SERVER_ROW, version: ` v${version} ` }).jsonLd.softwareVersion)
        .toBe(`v${version}`);
    }
  });
});
