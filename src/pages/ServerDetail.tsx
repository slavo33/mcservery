import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CommentSection from "@/components/CommentSection";
import { Heart, Users, Wifi, WifiOff, Copy, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface ServerDetail {
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
  profiles: { nickname: string; avatar_url: string | null } | null;
}

const ServerDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [server, setServer] = useState<ServerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  useEffect(() => {
    if (!id) return;

    const fetchServer = async () => {
      const { data } = await supabase
        .from("servers")
        .select("*, profiles(nickname, avatar_url)")
        .eq("id", id)
        .single();

      if (data) {
        setServer(data as unknown as ServerDetail);
        setLikesCount(data.likes_count);
      }
      setLoading(false);
    };

    const checkLike = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("server_likes")
        .select("id")
        .eq("server_id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      setLiked(!!data);
    };

    fetchServer();
    checkLike();
  }, [id, user]);

  const toggleLike = async () => {
    if (!user) {
      toast.error("Prihlás sa pre lajkovanie");
      return;
    }
    if (!id) return;

    if (liked) {
      await supabase.from("server_likes").delete().eq("server_id", id).eq("user_id", user.id);
      setLiked(false);
      setLikesCount((c) => c - 1);
    } else {
      await supabase.from("server_likes").insert({ server_id: id, user_id: user.id });
      setLiked(true);
      setLikesCount((c) => c + 1);
    }
  };

  const copyIp = () => {
    if (server) {
      navigator.clipboard.writeText(server.ip);
      toast.success("IP skopírovaná!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Načítavam...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!server) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Server nenájdený</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-10 max-w-3xl">
        <Link to="/servers" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Späť na servery
        </Link>

        <div className="gradient-card rounded-lg border border-border shadow-card overflow-hidden">
          {/* Header */}
          <div className="relative h-48 bg-secondary">
            <div className="absolute inset-0 gradient-hero z-10" />
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground font-display text-4xl tracking-widest opacity-20">
              {server.name}
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Title + Like */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="font-display text-3xl font-bold text-foreground">{server.name}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Pridané: {server.profiles?.nickname || "Hráč"}
                </p>
              </div>
              <button onClick={toggleLike} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                <Heart className={`h-6 w-6 transition-all ${liked ? "fill-primary text-primary" : ""}`} />
                <span className="font-display text-lg">{likesCount}</span>
              </button>
            </div>

            {/* Description */}
            <p className="text-foreground/90">{server.description}</p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {server.platform.map((p) => (
                <span key={p} className="badge-platform">{p === "java" ? "Java" : "Bedrock"}</span>
              ))}
              <span className="badge-tag">{server.software}</span>
              <span className="badge-tag">v{server.version}</span>
              {server.proxy && <span className="badge-platform">{server.proxy}</span>}
            </div>

            {/* Minigames */}
            {server.minigames.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Minihry</h3>
                <div className="flex flex-wrap gap-1.5">
                  {server.minigames.map((mg) => (
                    <span key={mg} className="text-xs text-muted-foreground bg-secondary rounded px-2 py-1">
                      {mg}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* IP */}
            <button
              onClick={copyIp}
              className="flex w-full items-center justify-between rounded-md border border-border bg-secondary/50 px-4 py-3 text-foreground font-mono transition-all hover:border-primary/40 glow-border-hover"
            >
              <span>{server.ip}</span>
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Copy className="h-4 w-4" /> Kopírovať
              </span>
            </button>

            {/* Comments */}
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
