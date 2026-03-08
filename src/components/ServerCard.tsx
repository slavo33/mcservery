import { Heart, Users, Wifi, WifiOff, Copy, Shield, ShieldOff, Vote, Crown } from "lucide-react";
import type { MinecraftServer } from "@/lib/mockData";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useServerStatus } from "@/hooks/useServerStatus";

interface ServerCardProps {
  server: MinecraftServer & { is_warez?: boolean; has_whitelist?: boolean; votes?: number; vip_expires_at?: string | null };
  dbMode?: boolean;
  dbId?: string;
}

const ServerCard = ({ server, dbMode, dbId }: ServerCardProps) => {
  const [liked, setLiked] = useState(false);
  const [copied, setCopied] = useState(false);
  const { t } = useLanguage();
  const { status } = useServerStatus(server.ip);

  const isOnline = status ? status.online : server.isOnline;
  const onlinePlayers = status ? status.players.online : server.players.online;
  const maxPlayers = status ? status.players.max : server.players.max;

  const copyIp = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(server.ip);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLiked(!liked);
  };

  const cardContent = (
    <div className="group gradient-card rounded-lg border border-border shadow-card transition-all duration-300 glow-border-hover overflow-hidden">
      <div className="relative h-40 overflow-hidden bg-secondary">
        <div className="absolute inset-0 gradient-hero z-10" />
        {server.image ? (
          <img src={server.image} alt={server.name} className="absolute inset-0 w-full h-full object-cover object-center" loading="lazy" decoding="async" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground font-display text-2xl tracking-widest opacity-30">
            {server.name}
          </div>
        )}
        <div className="absolute top-3 left-3 z-20 flex gap-1.5">
          {isOnline ? (
            <span className="badge-platform" style={{ background: "hsla(145, 63%, 42%, 0.2)", color: "hsl(145 63% 55%)", borderColor: "hsla(145, 63%, 42%, 0.3)" }}>
              <Wifi className="h-3 w-3 mr-1" /> {t("online")}
            </span>
          ) : (
            <span className="badge-tag">
              <WifiOff className="h-3 w-3 mr-1" /> {t("offline")}
            </span>
          )}
          {server.is_warez && (
            <span className="badge-tag text-xs">Warez</span>
          )}
          {server.has_whitelist && (
            <span className="badge-platform text-xs">
              <Shield className="h-3 w-3 mr-1" /> WL
            </span>
          )}
        </div>
        <div className="absolute top-3 right-3 z-20">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-background/60 backdrop-blur-sm px-2.5 py-1 text-xs font-medium text-foreground">
            <Users className="h-3 w-3" /> {onlinePlayers}/{maxPlayers}
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-display text-lg font-bold text-foreground leading-tight group-hover:text-primary transition-colors">
            {server.name}
          </h3>
          <div className="flex items-center gap-3 shrink-0">
            <span className="flex items-center gap-1 text-muted-foreground text-xs">
              <Vote className="h-3.5 w-3.5 text-primary" />
              {(server as any).votes || 0}
            </span>
            <button onClick={handleLike} className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
              <Heart className={`h-4 w-4 transition-all ${liked ? "fill-primary text-primary scale-110" : ""}`} />
              <span className="text-xs">{server.likes + (liked ? 1 : 0)}</span>
            </button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{server.description}</p>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {server.platform.map((p) => (
            <span key={p} className="badge-platform">{p === "java" ? "Java" : "Bedrock"}</span>
          ))}
          <span className="badge-tag">{server.software}</span>
          <span className="badge-tag">v{server.version}</span>
          {server.proxy && <span className="badge-platform">{server.proxy}</span>}
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          {server.minigames.slice(0, 3).map((mg) => (
            <span key={mg} className="text-xs text-muted-foreground bg-secondary rounded px-1.5 py-0.5">{mg}</span>
          ))}
          {server.minigames.length > 3 && (
            <span className="text-xs text-muted-foreground">+{server.minigames.length - 3}</span>
          )}
        </div>

        <button onClick={copyIp} className="flex w-full items-center justify-between rounded-md border border-border bg-secondary/50 px-3 py-2 text-sm font-mono text-foreground transition-all hover:border-primary/40">
          <span>{server.ip}</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Copy className="h-3 w-3" />
            {copied ? t("detail_copied") : t("detail_copy")}
          </span>
        </button>
      </div>
    </div>
  );

  if (dbMode && dbId) {
    return <Link to={`/server/${(server as any).slug || dbId}`}>{cardContent}</Link>;
  }

  return cardContent;
};

export default ServerCard;
