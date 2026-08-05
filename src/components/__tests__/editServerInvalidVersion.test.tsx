import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { LanguageProvider } from "@/i18n/LanguageContext";
import EditServer from "@/pages/EditServer";
import { toast } from "sonner";

const updated: any[] = [];
/** Chyba, ktorú vráti databázový trigger `validate_server_version_trigger`. */
let dbError: any = null;

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
        update: (row: any) => {
          if (table === "servers") updated.push(row);
          return {
            eq: () =>
              Promise.resolve({ error: table === "servers" ? dbError : null }),
          };
        },
        upsert: () => Promise.resolve({ error: null }),
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

const setRogueVersion = (value: string) => {
  const select = versionSelect();
  const rogue = document.createElement("option");
  rogue.value = value;
  select.appendChild(rogue);
  fireEvent.change(select, { target: { value } });
};

const loadForm = async () => {
  const view = wrap(<EditServer />);
  await waitFor(() => expect(versionSelect().value).toBe("26.2"));
  return view;
};

describe("editácia servera — neplatná verzia sa nezapíše", () => {
  beforeEach(() => {
    updated.length = 0;
    dbError = null;
    vi.mocked(toast.error).mockClear();
    vi.mocked(toast.success).mockClear();
    document.head.querySelectorAll("meta, link, script").forEach((el) => el.remove());
    document.title = "";
  });

  it("UI zablokuje uloženie neznámej verzie — do databázy nejde žiadny zápis", async () => {
    const { container } = await loadForm();
    setRogueVersion("77.7.7");
    fireEvent.submit(container.querySelector("form")!);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/nie je v zozname podporovaných verzií/i);
    expect(versionSelect()).toHaveAttribute("aria-invalid", "true");
    expect(updated).toHaveLength(0);
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("UI zablokuje uloženie prázdnej verzie a hláška zmizne po oprave", async () => {
    const { container } = await loadForm();
    fireEvent.change(versionSelect(), { target: { value: "" } });
    fireEvent.submit(container.querySelector("form")!);

    expect((await screen.findByRole("alert")).textContent).toMatch(/Vyber verziu Minecraftu/i);
    expect(updated).toHaveLength(0);

    fireEvent.change(versionSelect(), { target: { value: "1.20.4" } });
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });

  it("pôvodná verzia v selecte zostane zachovaná, keď je uloženie zablokované", async () => {
    const { container } = await loadForm();
    setRogueVersion("abc");
    fireEvent.submit(container.querySelector("form")!);
    await screen.findByRole("alert");

    // Formulár sa nesmie „potichu" prepnúť na inú verziu ani odoslať.
    expect(versionSelect().value).toBe("abc");
    expect(updated).toHaveLength(0);
  });

  it("keď sa UI validácia obíde, databáza zápis zamietne (23514) a zobrazí sa dôvod", async () => {
    dbError = {
      code: "23514",
      message: "Verzia 26.2 podporuje iba platformu Java.",
    };
    const { container } = await loadForm();
    fireEvent.change(versionSelect(), { target: { value: "26.2" } });
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => expect(updated).toHaveLength(1));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Verzia 26.2 podporuje iba platformu Java.")
    );
    expect(toast.success).not.toHaveBeenCalled();
    // Zamietnutý zápis nesmie prepísať SEO metadáta profilu novou verziou.
    expect(document.title).not.toContain("26.2");
    expect(document.head.querySelector('script[type="application/ld+json"]')).toBeNull();

  });
});
