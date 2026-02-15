import { Heart, Users, Wifi, WifiOff, Copy } from "lucide-react";
import type { MinecraftServer } from "@/lib/mockData";
import { useState } from "react";

interface ServerCardProps {
  server: MinecraftServer;
}

const ServerCard = ({ server }: ServerCardProps) => {
  const [liked, setLiked] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyIp = () => {
    navigator.clipboard.writeText(server.ip);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group gradient-card rounded-lg border border-border shadow-card transition-all duration-300 glow-border-hover overflow-hidden">
      {/* Image banner */}
      <div className="relative h-40 overflow-hidden bg-secondary">
        <div className="absolute inset-0 gradient-hero z-10" />
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground font-display text-2xl tracking-widest opacity-30">
          {server.name}
        </div>
        {/* Status */}
        <div className="absolute top-3 left-3 z-20">
          {server.isOnline ? (
            <span className="badge-platform" style={{ background: "hsla(145, 63%, 42%, 0.2)", color: "hsl(145 63% 55%)", borderColor: "hsla(145, 63%, 42%, 0.3)" }}>
              <Wifi className="h-3 w-3 mr-1" /> Online
            </span>
          ) : (
            <span className="badge-tag">
              <WifiOff className="h-3 w-3 mr-1" /> Offline
            </span>
          )}
        </div>
        {/* Players */}
        <div className="absolute top-3 right-3 z-20">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-background/60 backdrop-blur-sm px-2.5 py-1 text-xs font-medium text-foreground">
            <Users className="h-3 w-3" /> {server.players.online}/{server.players.max}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-display text-lg font-bold text-foreground leading-tight group-hover:text-primary transition-colors">
            {server.name}
          </h3>
          <button
            onClick={() => setLiked(!liked)}
            className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors shrink-0"
          >
            <Heart className={`h-4 w-4 transition-all ${liked ? "fill-primary text-primary scale-110" : ""}`} />
            <span className="text-xs">{server.likes + (liked ? 1 : 0)}</span>
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{server.description}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {server.platform.map((p) => (
            <span key={p} className="badge-platform">{p === "java" ? "Java" : "Bedrock"}</span>
          ))}
          <span className="badge-tag">{server.software}</span>
          <span className="badge-tag">v{server.version}</span>
          {server.proxy && <span className="badge-platform">{server.proxy}</span>}
        </div>

        {/* Minigames */}
        <div className="flex flex-wrap gap-1 mb-3">
          {server.minigames.slice(0, 3).map((mg) => (
            <span key={mg} className="text-xs text-muted-foreground bg-secondary rounded px-1.5 py-0.5">
              {mg}
            </span>
          ))}
          {server.minigames.length > 3 && (
            <span className="text-xs text-muted-foreground">+{server.minigames.length - 3}</span>
          )}
        </div>

        {/* IP */}
        <button
          onClick={copyIp}
          className="flex w-full items-center justify-between rounded-md border border-border bg-secondary/50 px-3 py-2 text-sm font-mono text-foreground transition-all hover:glow-border hover:border-primary/40"
        >
          <span>{server.ip}</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Copy className="h-3 w-3" />
            {copied ? "Skopírované!" : "Kopírovať"}
          </span>
        </button>
      </div>
    </div>
  );
};

export default ServerCard;
