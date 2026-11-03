import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { LanguageProvider } from "@/i18n/LanguageContext";
import EditServer from "@/pages/EditServer";
import VersionBadge from "@/components/VersionBadge";
import { applyServerHeadMeta } from "@/lib/serverJsonLd";

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

const NEW_VERSION = "1.20.4";

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
        update: (row: CapturedServerUpdate) => {
          if (table === "servers") updated.push(row);
          return { eq: () => Promise.resolve({ error: null }) };
        },
        insert: () => Promise.resolve({ error: null }),
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
  screen.getByRole("option", { name: NEW_VERSION }).closest("select") as HTMLSelectElement;

const metaContent = (selector: string) =>
  document.head.querySelector<HTMLMetaElement>(selector)?.getAttribute("content") ?? "";

const jsonLd = () => {
  const el = document.head.querySelector('script[type="application/ld+json"]');
  return el ? JSON.parse(el.textContent || "{}") : {};
};

describe("editácia verzie 26.2 → 1.20.4 prepočíta odznak aj meta dáta", () => {
  beforeEach(() => {
    updated.length = 0;
    document.head.querySelectorAll("meta, link, script").forEach((el) => el.remove());
    document.title = "";
  });

  it("uloží novú verziu a okamžite prepíše title, OG/Twitter meta aj JSON-LD", async () => {
    // Východiskový stav hlavičky zodpovedá pôvodnej verzii 26.2
    applyServerHeadMeta({ ...SERVER_ROW, version: "26.2" });
    expect(document.title).toContain("v26.2");
    expect(metaContent('meta[property="og:title"]')).toContain("v26.2");

    const { container } = wrap(<EditServer />);
    await waitFor(() => expect(versionSelect().value).toBe("26.2"));

    fireEvent.change(versionSelect(), { target: { value: NEW_VERSION } });
    fireEvent.submit(container.querySelector("form")!);

    // 1) do databázy ide nová verzia
    await waitFor(() => expect(updated).toHaveLength(1));
    expect(updated[0].version).toBe(NEW_VERSION);

    // 2) title a sociálne meta tagy sú prepočítané bez reloadu
    await waitFor(() => expect(document.title).toContain(`v${NEW_VERSION}`));
    expect(document.title).not.toContain("v26.2");
    for (const sel of [
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
    ]) {
      expect(metaContent(sel)).toContain(`v${NEW_VERSION}`);
      expect(metaContent(sel)).not.toContain("v26.2");
    }
    for (const sel of [
      'meta[name="description"]',
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
    ]) {
      expect(metaContent(sel)).toContain(`Verzia v${NEW_VERSION}.`);
      expect(metaContent(sel)).not.toContain("v26.2");
    }
    expect(metaContent('meta[property="og:url"]')).toBe(
      `https://mcservery.one/server/${SERVER_ROW.slug}`
    );
    expect(
      document.head.querySelector('link[rel="canonical"]')?.getAttribute("href")
    ).toBe(`https://mcservery.one/server/${SERVER_ROW.slug}`);

    // 3) JSON-LD softwareVersion zodpovedá novej verzii
    expect(jsonLd().keywords).toContain(`v${NEW_VERSION}`);

    // 4) odznak na profile zobrazí novú verziu
    render(<VersionBadge version={updated[0].version} />);
    expect(screen.getByText(`v${NEW_VERSION}`)).toBeInTheDocument();
    expect(screen.queryByText("v26.2")).toBeNull();
  });

  it("staré meta tagy verzie 26.2 v hlavičke neostanú duplicitne", async () => {
    applyServerHeadMeta({ ...SERVER_ROW, version: "26.2" });
    const { container } = wrap(<EditServer />);
    await waitFor(() => expect(versionSelect().value).toBe("26.2"));

    fireEvent.change(versionSelect(), { target: { value: NEW_VERSION } });
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => expect(document.title).toContain(`v${NEW_VERSION}`));
    expect(document.head.querySelectorAll('meta[property="og:title"]')).toHaveLength(1);
    // Structured data profilu: SoftwareApplication + BreadcrumbList, bez duplicít.
    const ldTypes = Array.from(
      document.head.querySelectorAll('script[type="application/ld+json"]')
    ).map((el) => JSON.parse(el.textContent || "{}")["@type"]);
    expect(ldTypes).toEqual([
      "WebPage",
      "BreadcrumbList",
      "WebPage",
      "Organization",
    ]);
    expect(document.head.innerHTML).not.toContain("v26.2");
  });
});
