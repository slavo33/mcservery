import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageContext";
import ServerFilters from "@/components/ServerFilters";
import AddServer from "@/pages/AddServer";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "test-user" }, profile: null, loading: false }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => Promise.resolve({ data: [], count: 0, error: null }),
      }),
    }),
  },
}));

const wrap = (ui: React.ReactElement) =>
  render(
    <MemoryRouter>
      <LanguageProvider>{ui}</LanguageProvider>
    </MemoryRouter>
  );

const NEW_VERSIONS = ["26.2", "26.1.2", "26.1.1", "26.1"];

describe("verzie vo filtroch serverov", () => {
  it("zobrazí nové verzie 26.x ako filtre", () => {
    wrap(
      <ServerFilters
        search=""
        onSearchChange={() => {}}
        selectedPlatform=""
        onPlatformChange={() => {}}
        selectedVersion=""
        onVersionChange={() => {}}
        selectedSoftware=""
        onSoftwareChange={() => {}}
      />
    );
    for (const v of NEW_VERSIONS) {
      expect(screen.getByRole("button", { name: v })).toBeInTheDocument();
    }
  });
});

describe("verzie vo formulári na pridanie servera", () => {
  it("ponúka nové verzie 26.x v selecte", () => {
    wrap(<AddServer />);
    for (const v of NEW_VERSIONS) {
      expect(screen.getByRole("option", { name: v })).toBeInTheDocument();
    }
  });
});
