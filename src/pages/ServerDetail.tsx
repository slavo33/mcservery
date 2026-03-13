import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CommentSection from "@/components/CommentSection";
import VoteSection from "@/components/VoteSection";
import TopVoters from "@/components/TopVoters";
import { Heart, Users, Copy, ArrowLeft, Shield, ShieldOff, ExternalLink, Trash2, Pencil, User, Crown } from "lucide-react";
import ReportDialog from "@/components/ReportDialog";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";
import { useServerStatus } from "@/hooks/useServerStatus";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface ServerDetailData {
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
  owner_id: string;
  is_warez: boolean;
  has_whitelist: boolean;
  discord_url: string | null;
  website_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  twitter_url: string | null;
  ownerNickname?: string;
  ownerAvatar?: string | null;
  ownerBio?: string;
  vip_expires_at?: string | null;
  images?: string[];
  vote_count?: number;
  vote_cooldown_hours?: number;
  slug?: string;
  vip_tier?: string | null;
}

interface OwnerProfile {
  nickname: string;
  avatar_url: string | null;
  bio: string;
}

const ServerDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user, isAdmin } = useAuth();
  const { t } = useLanguage();
  const [server, setServer] = useState<ServerDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [voteCount, setVoteCount] = useState(0);
  const [voteRefreshKey, setVoteRefreshKey] = useState(0);

  const navigate = useNavigate();

  const { status } = useServerStatus(server?.ip || "");

  const hasFetchedServer = useRef(false);
  const hasFetchedLike = useRef(false);

  useEffect(() => {
    if (!slug || hasFetchedServer.current) return;
    const fetchServer = async () => {
      const { data } = await supabase
        .from("servers")
        .select("*")
        .eq("slug", slug)
        .single();
      if (data) {
        hasFetchedServer.current = true;
        const { data: profileData } = await supabase
          .from("profiles")
          .select("nickname, avatar_url, bio")
          .eq("id", data.owner_id)
          .single();
        const p = profileData as OwnerProfile | null;
        // Fetch active VIP tier
        let vipTier: string | null = null;
        if (data.vip_expires_at && new Date(data.vip_expires_at) > new Date()) {
          const { data: vipData } = await supabase
            .from("vip_purchases")
            .select("tier")
            .eq("server_id", data.id)
            .gt("expires_at", new Date().toISOString())
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          vipTier = vipData?.tier || null;
        }

        setServer({
          ...(data as unknown as ServerDetailData),
          ownerNickname: p?.nickname || "Hráč",
          ownerAvatar: p?.avatar_url || null,
          ownerBio: p?.bio || "",
          vip_tier: vipTier,
        });
        setLikesCount(data.likes_count);
        setVoteCount((data as any).vote_count || 0);
      }
      setLoading(false);
    };
    fetchServer();
  }, [slug]);

  useEffect(() => {
    if (!server || !user || hasFetchedLike.current) return;
    hasFetchedLike.current = true;
    const checkLike = async () => {
      const { data } = await supabase.from("server_likes").select("id").eq("server_id", server.id).eq("user_id", user.id).maybeSingle();
      setLiked(!!data);
    };
    checkLike();
  }, [server, user]);

  const toggleLike = async () => {
    if (!user) { toast.error(t("nav_login")); return; }
    if (!server) return;
    const serverId = server.id;
    if (liked) {
      await supabase.from("server_likes").delete().eq("server_id", serverId).eq("user_id", user.id);
      setLiked(false);
      setLikesCount((c) => c - 1);
    } else {
      await supabase.from("server_likes").insert({ server_id: serverId, user_id: user.id });
      setLiked(true);
      setLikesCount((c) => c + 1);
    }
  };

  const toggleVip = async () => {
    if (!server || !user || !isAdmin) return;
    const isCurrentlyVip = server.vip_expires_at && new Date(server.vip_expires_at) > new Date();
    const newVipExpires = isCurrentlyVip ? null : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const newCooldownHours = isCurrentlyVip ? 24 : 8;
    const { error } = await supabase
      .from("servers")
      .update({ vip_expires_at: newVipExpires, vote_cooldown_hours: newCooldownHours })
      .eq("id", server.id);
    if (error) {
      toast.error("Error");
    } else {
      setServer({ ...server, vip_expires_at: newVipExpires, vote_cooldown_hours: newCooldownHours });
      toast.success(newVipExpires ? t("featured_pinned") : t("featured_unpinned"));
    }
  };

  const copyIp = () => {
    if (server) {
      navigator.clipboard.writeText(server.ip);
      toast.success(t("detail_copied"));
    }
  };

  const handleDeleteServer = async () => {
    if (!server || !user || user.id !== server.owner_id) return;
    if (!confirm(t("detail_delete_confirm"))) return;
    const { error } = await supabase.from("servers").delete().eq("id", server.id);
    if (error) {
      toast.error(t("detail_delete_error"));
    } else {
      toast.success(t("detail_delete_success"));
      navigate("/servers");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">{t("loading")}</p></main>
        <Footer />
      </div>
    );
  }

  if (!server) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">{t("detail_not_found")}</p></main>
        <Footer />
      </div>
    );
  }

  const links = [
    { url: server.discord_url, label: "Discord" },
    { url: server.website_url, label: t("add_website") },
    { url: server.instagram_url, label: "Instagram" },
    { url: server.tiktok_url, label: "TikTok" },
    { url: server.youtube_url, label: "YouTube" },
    { url: server.twitter_url, label: "Twitter / X" },
  ].filter((l) => l.url);

  const onlinePlayers = status?.players?.online ?? 0;
  const maxPlayers = status?.players?.max ?? server.max_players;
  const isOnline = status?.online ?? false;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-10 max-w-3xl">
        <Link to="/servers" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> {t("detail_back")}
        </Link>

        <div className="gradient-card rounded-lg border border-border shadow-card overflow-hidden">
          <div className="relative h-48 bg-secondary">
            <div className="absolute inset-0 gradient-hero z-10" />
            {server.images && server.images.length > 0 ? (
              <img src={server.images[0]} alt={server.name} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground font-display text-4xl tracking-widest opacity-20">
                {server.name}
              </div>
            )}
            {/* Status overlay */}
            <div className="absolute top-4 right-4 z-20">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background/60 backdrop-blur-sm px-3 py-1.5 text-sm font-medium text-foreground">
                <Users className="h-4 w-4" />
                <span className={isOnline ? "text-green-400" : "text-muted-foreground"}>
                  {onlinePlayers}/{maxPlayers}
                </span>
              </span>
            </div>
          </div>

          {/* Image gallery */}
          {server.images && server.images.length > 1 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 px-6 pt-4">
              {server.images.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="rounded-md overflow-hidden border border-border aspect-video hover:border-primary/40 transition-colors">
                  <img src={url} alt={`${server.name} ${i + 1}`} className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          )}

          <div className="p-6 space-y-6">
            {/* Owner profile card */}
            <Link to={`/user/${server.owner_id}`} className="flex items-center gap-3 rounded-md border border-border bg-secondary/30 p-3 hover:border-primary/40 transition-colors">
              <Avatar className="h-12 w-12 border border-border">
                {server.ownerAvatar ? (
                  <AvatarImage src={server.ownerAvatar} alt={server.ownerNickname} />
                ) : null}
                <AvatarFallback><User className="h-5 w-5 text-muted-foreground" /></AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground text-sm hover:text-primary transition-colors">{server.ownerNickname || t("comments_player")}</p>
                {server.ownerBio && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{server.ownerBio}</p>
                )}
                <p className="text-xs text-primary/70 mt-0.5">{t("detail_view_profile")}</p>
              </div>
            </Link>

            {/* VIP Tier Badge */}
            {server.vip_expires_at && new Date(server.vip_expires_at) > new Date() && server.vip_tier && (() => {
              const tier = server.vip_tier.toLowerCase();
              const cooldown = tier === "max" ? 2 : tier === "pro" ? 4 : 8;
              const tierStyles: Record<string, string> = {
                basic: "from-blue-500 to-blue-600 shadow-blue-500/25",
                pro: "from-purple-500 to-purple-600 shadow-purple-500/25",
                max: "from-amber-500 to-amber-600 shadow-amber-500/25",
              };
              return (
                <div className={`flex items-center gap-2 rounded-lg bg-gradient-to-r ${tierStyles[tier] || tierStyles.basic} px-4 py-2.5 text-white shadow-lg`}>
                  <Crown className="h-5 w-5 fill-white/30" />
                  <div>
                    <span className="font-bold text-sm">VIP {server.vip_tier.toUpperCase()}</span>
                    <span className="text-xs opacity-80 ml-2">• {t("vote_description").includes("24") ? `Cooldown ${cooldown}h` : `Cooldown ${cooldown}h`}</span>
                  </div>
                </div>
              );
            })()}

            <div className="flex items-start justify-between">
              <div>
                <h1 className="font-display text-3xl font-bold text-foreground">{server.name}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("detail_added_by")} {server.ownerNickname || t("comments_player")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {isAdmin && (
                  <button
                    onClick={toggleVip}
                    className={`transition-colors ${server.vip_expires_at && new Date(server.vip_expires_at) > new Date() ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500"}`}
                    title={server.vip_expires_at && new Date(server.vip_expires_at) > new Date() ? t("featured_unpin") : t("featured_pin")}
                  >
                    <Crown className={`h-5 w-5 ${server.vip_expires_at && new Date(server.vip_expires_at) > new Date() ? "fill-yellow-500" : ""}`} />
                  </button>
                )}
                {user?.id === server.owner_id && (
                  <>
                    <Link to={`/server/${server.slug || slug}/edit`} className="text-muted-foreground hover:text-primary transition-colors" title={t("detail_edit_server")}>
                      <Pencil className="h-5 w-5" />
                    </Link>
                    <button onClick={handleDeleteServer} className="text-muted-foreground hover:text-destructive transition-colors" title={t("detail_delete_server")}>
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </>
                )}
                <button onClick={toggleLike} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                  <Heart className={`h-6 w-6 transition-all ${liked ? "fill-primary text-primary" : ""}`} />
                  <span className="font-display text-lg">{likesCount}</span>
                </button>
                {user && user.id !== server.owner_id && (
                  <ReportDialog targetId={server.id} reportType="server" />
                )}
              </div>
            </div>

            <p className="text-foreground/90 whitespace-pre-line leading-relaxed break-words">{server.description}</p>

            {/* Tags + badges */}
            <div className="flex flex-wrap gap-2">
              {server.platform.map((p) => (
                <span key={p} className="badge-platform">{p === "java" ? "Java" : "Bedrock"}</span>
              ))}
              <span className="badge-tag">{server.software}</span>
              <span className="badge-tag">v{server.version}</span>
              {server.proxy && <span className="badge-platform">{server.proxy}</span>}
              <span className={`badge-tag ${server.is_warez ? "" : ""}`}>
                {server.is_warez ? t("detail_warez") : t("detail_original")}
              </span>
              <span className="badge-platform">
                {server.has_whitelist ? (
                  <><Shield className="h-3 w-3 mr-1" /> {t("detail_whitelist")}</>
                ) : (
                  <><ShieldOff className="h-3 w-3 mr-1" /> {t("detail_no_whitelist")}</>
                )}
              </span>
            </div>

            {server.minigames.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">{t("detail_minigames")}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {server.minigames.map((mg) => (
                    <span key={mg} className="text-xs text-muted-foreground bg-secondary rounded px-2 py-1">{mg}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Social Links */}
            {links.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">{t("add_links")}</h3>
                <div className="flex flex-wrap gap-2">
                  {links.map((link) => (
                    <a
                      key={link.label}
                      href={link.url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/50 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* IP */}
            <button onClick={copyIp} className="flex w-full items-center justify-between rounded-md border border-border bg-secondary/50 px-4 py-3 text-foreground font-mono transition-all hover:border-primary/40 glow-border-hover">
              <span>{server.ip}</span>
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Copy className="h-4 w-4" /> {t("detail_copy")}
              </span>
            </button>

            <div className="border-t border-border pt-6 space-y-4">
              <VoteSection
                serverId={server.id}
                voteCount={voteCount}
                cooldownHours={server.vote_cooldown_hours || 24}
                onVoted={() => {
                  setVoteCount((c) => c + 1);
                  setVoteRefreshKey((k) => k + 1);
                }}
              />
              <TopVoters serverId={server.id} refreshKey={voteRefreshKey} />
            </div>

            <div className="border-t border-border pt-6">
              <CommentSection serverId={server.id} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ServerDetailPage;
