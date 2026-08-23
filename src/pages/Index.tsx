import { useState, useEffect, useMemo } from "react";
import Header from "@/components/Header";
import SEO from "@/components/SEO";
import { buildPageJsonLdGraph } from "@/lib/pageJsonLd";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import ServerCard from "@/components/ServerCard";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ArrowRight, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import type { MinecraftServer } from "@/lib/mockData";
import { useMultiServerStatus } from "@/hooks/useMultiServerStatus";

const mapServer = (s: any): MinecraftServer & { is_warez?: boolean; has_whitelist?: boolean; votes?: number; slug?: string; vip_expires_at?: string | null; vote_cooldown_hours?: number } => ({
  id: s.id,
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
  tags: s.tags,
  isOnline: true,
  is_warez: s.is_warez,
  has_whitelist: s.has_whitelist,
  votes: s.vote_count || 0,
  slug: s.slug,
  vip_expires_at: s.vip_expires_at,
  vote_cooldown_hours: s.vote_cooldown_hours,
});

const Index = () => {
  const { t } = useLanguage();
  const [featured, setFeatured] = useState<(MinecraftServer & { is_warez?: boolean; has_whitelist?: boolean; vip_expires_at?: string | null })[]>([]);
  const [vipServers, setVipServers] = useState<(MinecraftServer & { is_warez?: boolean; has_whitelist?: boolean; vip_expires_at?: string | null })[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch VIP servers (active vip_expires_at)
      const { data: vipData } = await supabase
        .from("servers")
        .select("*")
        .gt("vip_expires_at", new Date().toISOString())
        .order("vote_count", { ascending: false });
      const vipIds = new Set((vipData || []).map((s: any) => s.id));
      if (vipData) {
        setVipServers(vipData.map(mapServer));
      }

      // Fetch top servers excluding VIP
      const { data: featuredData } = await supabase
        .from("servers")
        .select("*")
        .order("vote_count", { ascending: false })
        .limit(20);
      if (featuredData) {
        const filtered = featuredData.filter((s: any) => !vipIds.has(s.id)).slice(0, 3);
        setFeatured(filtered.map(mapServer));
      }
    };
    fetchData();
  }, []);

  // Jeden zdieľaný live zdroj stavu pre všetky karty na stránke.
  const serverIps = useMemo(
    () => Array.from(new Set([...vipServers, ...featured].map((s) => s.ip))),
    [vipServers, featured],
  );
  const { statuses } = useMultiServerStatus(serverIps);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="MCServery — Databáza Minecraft serverov"
        description="Nájdi najlepšie Minecraft servery na jednom mieste. Prehľadná databáza, aktuálne informácie a aktívna komunita hráčov."
        path="/"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "MCServery",
            url: "https://mcservery.one",
            description: "Nájdi najlepšie Minecraft servery na jednom mieste. Prehľadná databáza, aktuálne informácie a aktívna komunita hráčov.",
            potentialAction: {
              "@type": "SearchAction",
              target: "https://mcservery.one/servers?q={search_term_string}",
              "query-input": "required name=search_term_string",
            },
          },
          ...buildPageJsonLdGraph({
            name: "MCServery — Databáza Minecraft serverov",
            description:
              "Nájdi najlepšie Minecraft servery na jednom mieste. Prehľadná databáza, aktuálne informácie a aktívna komunita hráčov.",
            path: "/",
          }),
        ]}
      />
      <Header />
      <main className="flex-1">
        <HeroSection />

        {vipServers.length > 0 && (
          <section className="container mx-auto px-4 py-16">
            <div className="flex items-center gap-2 mb-8">
              <Crown className="h-5 w-5" style={{ color: "hsl(45 93% 55%)" }} />
              <h2 className="font-display text-3xl font-bold text-foreground">
                {t("featured_title")}
              </h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {vipServers.map((server) => (
                <ServerCard key={server.id} server={server} dbMode dbId={server.id} liveStatus={statuses[server.ip] ?? null} />
              ))}
            </div>
          </section>
        )}

        <section className="container mx-auto px-4 py-16" style={{ minHeight: '400px' }}>
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="font-display text-3xl font-bold text-foreground">
                {t("servers_title_1")} <span className="text-gradient">{t("servers_title_2")}</span>
              </h2>
            </div>
            <Link to="/servers">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground gap-1">
                {t("nav_servers")} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((server) => (
              <ServerCard key={server.id} server={server} dbMode dbId={server.id} liveStatus={statuses[server.ip] ?? null} />
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
