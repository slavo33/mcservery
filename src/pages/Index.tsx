import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import ServerCard from "@/components/ServerCard";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ArrowRight, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import type { MinecraftServer } from "@/lib/mockData";

const mapServer = (s: any): MinecraftServer & { is_warez?: boolean; has_whitelist?: boolean; votes?: number; slug?: string } => ({
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
});

const Index = () => {
  const { t } = useLanguage();
  const [featured, setFeatured] = useState<(MinecraftServer & { is_warez?: boolean; has_whitelist?: boolean })[]>([]);
  const [pinned, setPinned] = useState<(MinecraftServer & { is_warez?: boolean; has_whitelist?: boolean })[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch pinned first
      const { data: pinnedData } = await supabase
        .from("servers")
        .select("*")
        .eq("is_featured", true);
      const pinnedIds = new Set((pinnedData || []).map((s: any) => s.id));
      if (pinnedData) {
        const mapped = pinnedData.map(mapServer);
        mapped.sort((a, b) => ((b as any).votes || 0) - ((a as any).votes || 0));
        setPinned(mapped);
      }

      // Fetch featured excluding pinned
      const { data: featuredData } = await supabase
        .from("servers")
        .select("*")
        .eq("is_featured", false)
        .order("vote_count", { ascending: false })
        .limit(3);
      if (featuredData) setFeatured(featuredData.map(mapServer));
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <HeroSection />

        {/* Reserve min-height to prevent CLS when data loads */}
        <section className="container mx-auto px-4 py-16" style={{ minHeight: pinned.length > 0 ? undefined : '400px' }}>
          {pinned.length > 0 && (
            <>
              <div className="flex items-center gap-2 mb-8">
                <Pin className="h-5 w-5 text-primary fill-primary" />
                <h2 className="font-display text-3xl font-bold text-foreground">
                  {t("featured_title")}
                </h2>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {pinned.map((server) => (
                  <ServerCard key={server.id} server={server} dbMode dbId={server.id} />
                ))}
              </div>
            </>
          )}
        </section>

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
              <ServerCard key={server.id} server={server} dbMode dbId={server.id} />
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
