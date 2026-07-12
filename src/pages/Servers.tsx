import { useState, useMemo, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ServerCard from "@/components/ServerCard";
import ServerFilters from "@/components/ServerFilters";
import { ArrowUpDown, Crown } from "lucide-react";
import type { MinecraftServer } from "@/lib/mockData";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { useMultiServerStatus } from "@/hooks/useMultiServerStatus";

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
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("");
  const [version, setVersion] = useState("");
  const [software, setSoftware] = useState("");
  const [sortBy, setSortBy] = useState<"votes" | "likes" | "players">("votes");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [showVipOnly, setShowVipOnly] = useState(false);
  const [dbServers, setDbServers] = useState<DbServer[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("servers").select("*").order("vote_count", { ascending: false });
      if (data) setDbServers(data as unknown as DbServer[]);
    };
    fetch();
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
      return true;
    });

    // Sort
    result.sort((a, b) => {
      let valA = 0, valB = 0;
      if (sortBy === "votes") { valA = (a as any).votes || 0; valB = (b as any).votes || 0; }
      else if (sortBy === "likes") { valA = a.likes; valB = b.likes; }
      else if (sortBy === "players") {
        valA = statuses[a.ip]?.players.online ?? a.players.online;
        valB = statuses[b.ip]?.players.online ?? b.players.online;
      }
      return sortDir === "desc" ? valB - valA : valA - valB;
    });

    return result;
  }, [search, platform, version, software, allServers, sortBy, sortDir, statuses, showVipOnly]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Minecraft servery — zoznam a vyhľadávanie | MCServery"
        description="Prehľadávaj a filtruj Minecraft servery podľa verzie, platformy a herných módov. Nájdi si ten najlepší server pre seba."
        path="/servers"
      />
      <Header />
      <main className="flex-1 container mx-auto px-4 py-10">
        <h1 className="font-display text-4xl font-bold text-foreground mb-2">
          {t("servers_title_1")} <span className="text-gradient">{t("servers_title_2")}</span>
        </h1>
        <p className="text-muted-foreground mb-8">{t("servers_subtitle")}</p>

        <ServerFilters
          search={search} onSearchChange={setSearch}
          selectedPlatform={platform} onPlatformChange={setPlatform}
          selectedVersion={version} onVersionChange={setVersion}
          selectedSoftware={software} onSoftwareChange={setSoftware}
        />

        {/* Sorting + VIP filter */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setShowVipOnly(!showVipOnly)}
            className={`text-sm px-3 py-1 rounded-full border transition-colors flex items-center gap-1.5 ${showVipOnly ? "border-amber-500 bg-amber-500/10 text-amber-400 font-bold" : "border-border text-muted-foreground hover:border-amber-500/40"}`}
          >
            <Crown className="h-3.5 w-3.5" />
            {t("filter_vip")}
          </button>
          <span className="text-muted-foreground/40">|</span>
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <ArrowUpDown className="h-4 w-4" /> {t("sort_label")}:
          </span>
          {(["votes", "likes", "players"] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => {
                if (sortBy === opt) setSortDir(sortDir === "desc" ? "asc" : "desc");
                else { setSortBy(opt); setSortDir("desc"); }
              }}
              className={`text-sm px-3 py-1 rounded-full border transition-colors ${sortBy === opt ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
            >
              {t(`sort_${opt}` as any)} {sortBy === opt ? (sortDir === "desc" ? "↓" : "↑") : ""}
            </button>
          ))}
        </div>

        {filtered.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((server) => (
              <ServerCard key={server.id} server={server} dbMode={!!server.dbId} dbId={server.dbId} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
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
