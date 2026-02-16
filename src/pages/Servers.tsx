import { useState, useMemo, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ServerCard from "@/components/ServerCard";
import ServerFilters from "@/components/ServerFilters";
import type { MinecraftServer } from "@/lib/mockData";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";

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
}

const Servers = () => {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("");
  const [version, setVersion] = useState("");
  const [software, setSoftware] = useState("");
  const [dbServers, setDbServers] = useState<DbServer[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("servers").select("*").order("likes_count", { ascending: false });
      if (data) setDbServers(data as unknown as DbServer[]);
    };
    fetch();
  }, []);

  const allServers: (MinecraftServer & { dbId?: string; is_warez?: boolean; has_whitelist?: boolean })[] = useMemo(() => {
    return dbServers.map((s) => ({
      id: s.id,
      dbId: s.id,
      name: s.name,
      description: s.description,
      ip: s.ip,
      image: "",
      players: { online: 0, max: s.max_players },
      version: s.version,
      platform: s.platform as ("java" | "bedrock")[],
      proxy: s.proxy || undefined,
      software: s.software,
      minigames: s.minigames,
      likes: s.likes_count,
      tags: s.tags,
      isOnline: true,
      is_warez: s.is_warez,
      has_whitelist: s.has_whitelist,
    }));
  }, [dbServers]);

  const filtered = useMemo(() => {
    return allServers.filter((s) => {
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
  }, [search, platform, version, software, allServers]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
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
