import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ServerCard from "@/components/ServerCard";
import { User, ArrowLeft } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useLanguage } from "@/i18n/LanguageContext";
import type { MinecraftServer } from "@/lib/mockData";
import SEO from "@/components/SEO";
import { useMultiServerStatus } from "@/hooks/useMultiServerStatus";

interface UserProfileData {
  id: string;
  nickname: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { t, locale } = useLanguage();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [servers, setServers] = useState<(MinecraftServer & { dbId: string; is_warez: boolean; has_whitelist: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  // Jeden zdieľaný live zdroj stavu pre karty servera na profile.
  const serverIps = useMemo(() => Array.from(new Set(servers.map((s) => s.ip))), [servers]);
  const { statuses } = useMultiServerStatus(serverIps);

  useEffect(() => {
    if (!userId) return;
    const fetchData = async () => {
      const [profileRes, serversRes] = await Promise.all([
        supabase.from("profiles").select("id, nickname, avatar_url, bio, created_at").eq("id", userId).single(),
        supabase.from("servers").select("*").eq("owner_id", userId).order("likes_count", { ascending: false }),
      ]);

      if (profileRes.data) {
        setProfile(profileRes.data as unknown as UserProfileData);
      }

      if (serversRes.data) {
        setServers(
          serversRes.data.map((s) => ({
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
            votes: s.vote_count || 0,
            tags: s.tags,
            isOnline: true,
            is_warez: s.is_warez,
            has_whitelist: s.has_whitelist,
            slug: s.slug,
          }))
        );
      }

      setLoading(false);
    };
    fetchData();
  }, [userId]);

  const localeMap: Record<string, string> = {
    sk: "sk-SK", cs: "cs-CZ", en: "en-US", de: "de-DE", fr: "fr-FR",
    ru: "ru-RU", uk: "uk-UA", es: "es-ES", pt: "pt-PT", br: "pt-BR",
    zh: "zh-CN", ja: "ja-JP",
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">{t("loading")}</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SEO
          title="Profil sa nenašiel | MCServery"
          description="Tento používateľský profil na MCServery neexistuje."
          path={`/user/${userId ?? ""}`}
          noindex
        />
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">{t("user_profile_not_found")}</p>
        </main>
        <Footer />
      </div>
    );
  }

  const joinDate = new Date(profile.created_at).toLocaleDateString(localeMap[locale] || "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
    <SEO
      title={`${profile.nickname} — profil používateľa | MCServery`}
      description={`Servery a profil používateľa ${profile.nickname} na MCServery.`}
      path={`/user/${userId ?? ""}`}
      image={profile.avatar_url || undefined}
      imageAlt={`Avatar používateľa ${profile.nickname}`}
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        name: `${profile.nickname} — profil používateľa`,
        url: `https://mcservery.one/user/${userId ?? ""}`,
        dateCreated: profile.created_at,

        mainEntity: {
          "@type": "Person",
          name: profile.nickname,
          identifier: userId ?? undefined,
          ...(profile.avatar_url ? { image: profile.avatar_url } : {}),
          ...(profile.bio ? { description: profile.bio } : {}),
          url: `https://mcservery.one/user/${userId ?? ""}`,
        },
      }}
    />
      <Header />
      <main className="flex-1 container mx-auto px-4 py-10 max-w-3xl">
        <Link
          to="/servers"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> {t("user_profile_back")}
        </Link>

        {/* Profile card */}
        <div className="gradient-card rounded-lg border border-border shadow-card p-6 mb-8">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 border-2 border-border">
              {profile.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt={profile.nickname} />
              ) : null}
              <AvatarFallback>
                <User className="h-8 w-8 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-2xl font-bold text-foreground">
                {profile.nickname}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("user_profile_member_since")} {joinDate}
              </p>
              {profile.bio && (
                <p className="text-sm text-foreground/80 mt-2">{profile.bio}</p>
              )}
            </div>
          </div>
        </div>

        {/* User's servers */}
        <h2 className="font-display text-xl font-bold text-foreground mb-4">
          {t("user_profile_servers")} ({servers.length})
        </h2>

        {servers.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2">
            {servers.map((server) => (
              <ServerCard
                key={server.id}
                server={server}
                dbMode
                dbId={server.dbId}
                liveStatus={statuses[server.ip] ?? null}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            {t("user_profile_no_servers")}
          </p>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default UserProfile;
