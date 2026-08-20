import { useState, useMemo, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import PageBreadcrumbs from "@/components/PageBreadcrumbs";
import { buildPageJsonLdGraph } from "@/lib/pageJsonLd";
import VirtualServerGrid from "@/components/VirtualServerGrid";
import ServerFilters from "@/components/ServerFilters";
import { ArrowUpDown, Crown } from "lucide-react";
import type { MinecraftServer } from "@/lib/mockData";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { useMultiServerStatus } from "@/hooks/useMultiServerStatus";
import { useSearchParams } from "react-router-dom";
import { versions, platforms, softwareOptions, minigameOptions } from "@/lib/mockData";
import { sortServers } from "@/lib/serverSorting";

interface DbServer {
  id: string;
  name: string;
  description: string;
  ip: string;
  version: string;
  platform: string[];
  proxy: string | null;
  software: string;
  minigames: string[];
  tags: string[];
  likes_count: number;
  max_players: number;
  is_warez: boolean;
  has_whitelist: boolean;
  images: string[];
  vote_count: number;
}

const Servers = () => {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  // Všetky filtre sa držia v URL (napr. /servers?version=26.2&platform=Java&software=Paper&minigame=SkyWars&q=sky),
  // aby sa dali zdieľať a fungovali odkazy z odznakov na profile servera.
  const paramOrEmpty = (key: string, allowed?: string[]) => {
    const raw = searchParams.get(key) ?? "";
    if (!allowed) return raw;
    return allowed.includes(raw) ? raw : "";
  };

  const [search, setSearch] = useState(() => paramOrEmpty("q"));
  const [platform, setPlatform] = useState(() => paramOrEmpty("platform", platforms));
  const [version, setVersion] = useState(() => paramOrEmpty("version", versions));
  const [software, setSoftware] = useState(() => paramOrEmpty("software", softwareOptions));
  const [minigame, setMinigame] = useState(() => paramOrEmpty("minigame", minigameOptions));
  const [sortBy, setSortBy] = useState<"votes" | "likes" | "players">("votes");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [showVipOnly, setShowVipOnly] = useState(false);
  const [dbServers, setDbServers] = useState<DbServer[]>([]);
  const [loading, setLoading] = useState(true);

  // Synchronizácia URL -> stav (napr. späť/vpred v prehliadači alebo zdieľaný odkaz)
  useEffect(() => {
    setSearch(searchParams.get("q") ?? "");
    setPlatform(paramOrEmpty("platform", platforms));
    setVersion(paramOrEmpty("version", versions));
    setSoftware(paramOrEmpty("software", softwareOptions));
    setMinigame(paramOrEmpty("minigame", minigameOptions));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Synchronizácia stav -> URL
  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page"); // zmena filtra vždy vracia na prvú stranu
    setSearchParams(next, { replace: true });
  };

  const handleSearchChange = (v: string) => {
    setSearch(v);
    updateParam("q", v);
  };
  const handlePlatformChange = (v: string) => {
    setPlatform(v);
    updateParam("platform", v);
  };
  const handleVersionChange = (v: string) => {
    setVersion(v);
    updateParam("version", v);
  };
  const handleSoftwareChange = (v: string) => {
    setSoftware(v);
    updateParam("software", v);
  };
  const handleMinigameChange = (v: string) => {
    setMinigame(v);
    updateParam("minigame", v);
  };


  useEffect(() => {
    let cancelled = false;

    // 1) Okamžité vykreslenie z cache (stale-while-revalidate) — šetrí TTFB pri návrate na stránku
    const cached = serverListStore.read<DbServer[]>();
    if (cached) {
      setDbServers(cached.data);
      setLoading(false);
    }

    const load = async () => {
      const { data } = await supabase.from("servers").select("*").order("vote_count", { ascending: false });
      if (cancelled) return;
      if (data) {
        setDbServers(data as unknown as DbServer[]);
        serverListStore.write(data);
        queryCache.clear();
      }
      setLoading(false);
    };

    // Ak sú dáta čerstvé, revalidáciu odložíme mimo kritickej cesty renderu
    if (cached?.fresh) {
      const id = window.setTimeout(load, 800);
      return () => {
        cancelled = true;
        window.clearTimeout(id);
      };
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const allServers: (MinecraftServer & { dbId?: string; is_warez?: boolean; has_whitelist?: boolean; slug?: string })[] = useMemo(() => {
    return dbServers.map((s) => ({
      id: s.id,
      dbId: s.id,
      name: s.name,
      description: s.description,
      ip: s.ip,
      image: s.images && s.images.length > 0 ? s.images[0] : "",
      players: { online: 0, max: s.max_players },
      version: s.version,
      platform: s.platform as ("java" | "bedrock")[],
      proxy: s.proxy || undefined,
      software: s.software,
      minigames: s.minigames,
      likes: s.likes_count,
      votes: (s as any).vote_count || 0,
      tags: s.tags,
      isOnline: true,
      is_warez: s.is_warez,
      has_whitelist: s.has_whitelist,
      slug: (s as any).slug,
      vip_expires_at: (s as any).vip_expires_at,
      vote_cooldown_hours: (s as any).vote_cooldown_hours,
    }));
  }, [dbServers]);

  const serverIps = useMemo(() => allServers.map((s) => s.ip), [allServers]);
  const { statuses } = useMultiServerStatus(serverIps);

  const filtered = useMemo(() => {
    // Kľúč cache: filtre + zoradenie + podpis datasetu (a live stavov pri triedení podľa hráčov)
    const dataVersion = buildDataVersion(
      allServers.map((s) => s.id),
      statuses as any,
      sortBy,
    );
    const key = buildQueryKey({
      search,
      platform,
      version,
      software,
      minigame,
      vipOnly: showVipOnly,
      sortBy,
      sortDir,
      dataVersion,
    });

    const cachedResult = queryCache.get(key);
    if (cachedResult) return cachedResult as typeof allServers;

    let result = allServers.filter((s) => {
      if (showVipOnly) {
        const vipExpires = (s as any).vip_expires_at;
        if (!vipExpires || new Date(vipExpires) < new Date()) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        if (!s.name.toLowerCase().includes(q) && !s.ip.toLowerCase().includes(q)) return false;
      }
      if (platform) {
        const p = platform.toLowerCase() as "java" | "bedrock";
        if (!s.platform.includes(p)) return false;
      }
      if (version && s.version !== version) return false;
      if (software && s.software !== software) return false;
      if (minigame && !s.minigames.includes(minigame)) return false;
      return true;
    });

    // Sort (zdieľaná logika – kryté unit testami v src/lib/__tests__/serverSorting.test.ts)
    const sorted = sortServers(result as any, sortBy, sortDir, statuses as any) as typeof result;
    queryCache.set(key, sorted as unknown[]);
    return sorted;
  }, [search, platform, version, software, minigame, allServers, sortBy, sortDir, statuses, showVipOnly]);


  // ---- Stránkovanie ----
  const PER_PAGE = 12;
  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const rawPage = parseInt(searchParams.get("page") ?? "1", 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.min(rawPage, pageCount) : 1;
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const goToPage = (p: number) => {
    const target = Math.min(Math.max(1, p), pageCount);
    const next = new URLSearchParams(searchParams);
    if (target > 1) next.set("page", String(target));
    else next.delete("page");
    setSearchParams(next, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Zmena filtrov musí zresetovať stránku, aby sa nezobrazila prázdna strana
  useEffect(() => {
    if (searchParams.get("page") && page > pageCount) goToPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageCount]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Minecraft servery — zoznam a vyhľadávanie | MCServery"
        description="Prehľadávaj a filtruj Minecraft servery podľa verzie, platformy a herných módov. Nájdi si ten najlepší server pre seba."
        path="/servers"
        jsonLd={buildPageJsonLdGraph({
          name: "Minecraft servery",
          description:
            "Prehľadávaj a filtruj Minecraft servery podľa verzie, platformy a herných módov. Nájdi si ten najlepší server pre seba.",
          path: "/servers",
          pageType: "CollectionPage",
          breadcrumbs: [["Servery", "/servers"]],
        })}
      />
      <Header />
      <main className="flex-1 container mx-auto px-4 py-10">
        <PageBreadcrumbs items={[["Servery", "/servers"]]} />
        <h1 className="font-display text-4xl font-bold text-foreground mb-2">
          {t("servers_title_1")} <span className="text-gradient">{t("servers_title_2")}</span>
        </h1>
        <p className="text-muted-foreground mb-8">{t("servers_subtitle")}</p>

        <ServerFilters
          search={search} onSearchChange={handleSearchChange}
          selectedPlatform={platform} onPlatformChange={handlePlatformChange}
          selectedVersion={version} onVersionChange={handleVersionChange}
          selectedSoftware={software} onSoftwareChange={handleSoftwareChange}
          selectedMinigame={minigame} onMinigameChange={handleMinigameChange}
        />


        {/* Sorting + VIP filter */}
        <div className="flex items-center gap-2 mb-6 flex-wrap" data-sort-bar="" role="group" aria-label={t("sort_label")}>
          <button
            type="button"
            aria-pressed={showVipOnly}
            onClick={() => setShowVipOnly(!showVipOnly)}
            className={`text-sm px-3 py-1 rounded-full border transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${showVipOnly ? "border-amber-500 bg-amber-500/10 text-amber-400 font-bold" : "border-border text-muted-foreground hover:border-amber-500/40"}`}
          >
            <Crown className="h-3.5 w-3.5" aria-hidden="true" />
            {t("filter_vip")}
          </button>
          <span className="text-muted-foreground" aria-hidden="true">|</span>
          <span className="text-sm text-muted-foreground flex items-center gap-1" id="sort-bar-label">
            <ArrowUpDown className="h-4 w-4" aria-hidden="true" /> {t("sort_label")}:
          </span>
          {(["votes", "likes", "players"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              data-sort={opt}
              aria-pressed={sortBy === opt}
              aria-label={`${t("sort_label")}: ${t(`sort_${opt}` as any)}${sortBy === opt ? ` (${sortDir === "desc" ? "↓" : "↑"})` : ""}`}
              onClick={() => {
                if (sortBy === opt) setSortDir(sortDir === "desc" ? "asc" : "desc");
                else { setSortBy(opt); setSortDir("desc"); }
              }}
              className={`text-sm px-3 py-1 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${sortBy === opt ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
            >
              <span aria-hidden="true">{t(`sort_${opt}` as any)} {sortBy === opt ? (sortDir === "desc" ? "↓" : "↑") : ""}</span>
            </button>
          ))}
          <span className="sr-only" aria-live="polite">
            {t("sort_label")}: {t(`sort_${sortBy}` as any)} {sortDir === "desc" ? "↓" : "↑"}
          </span>
        </div>


        {loading ? (
          /* Skeleton s rovnakou výškou ako karty — drží layout a znižuje CLS */
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" data-server-grid-skeleton="" aria-hidden="true">
            {Array.from({ length: PER_PAGE }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border overflow-hidden">
                <div className="h-40 bg-secondary animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-5 w-2/3 rounded bg-secondary animate-pulse" />
                  <div className="h-4 w-full rounded bg-secondary animate-pulse" />
                  <div className="h-4 w-5/6 rounded bg-secondary animate-pulse" />
                  <div className="h-8 w-full rounded bg-secondary animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <>
            <VirtualServerGrid
              servers={paginated}
              statuses={statuses}
              gridProps={{
                "data-server-grid": "",
                "data-virtualized": "true",
                "data-results-count": filtered.length,
                "data-page": page,
                "data-page-count": pageCount,
              } as any}
            />


            {pageCount > 1 && (
              <nav
                aria-label="Stránkovanie serverov"
                data-pagination
                className="mt-8 flex flex-wrap items-center justify-center gap-2"
              >
                <button
                  data-page-prev
                  onClick={() => goToPage(page - 1)}
                  disabled={page === 1}
                  aria-label="Predchádzajúca strana"
                  className="min-h-11 min-w-11 rounded-md border border-border px-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"
                >
                  ‹
                </button>
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    data-page-btn={p}
                    aria-current={p === page ? "page" : undefined}
                    aria-label={`Strana ${p}`}
                    onClick={() => goToPage(p)}
                    className={`min-h-11 min-w-11 rounded-md border px-3 text-sm transition-colors ${
                      p === page
                        ? "border-primary bg-primary/10 text-primary font-bold"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  data-page-next
                  onClick={() => goToPage(page + 1)}
                  disabled={page === pageCount}
                  aria-label="Nasledujúca strana"
                  className="min-h-11 min-w-11 rounded-md border border-border px-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"
                >
                  ›
                </button>
              </nav>
            )}
          </>
        ) : (
          <div className="text-center py-20" data-results-count={0}>
            <p className="text-muted-foreground font-display text-xl">{t("servers_none")}</p>
            <p className="text-sm text-muted-foreground mt-2">{t("servers_none_hint")}</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Servers;
