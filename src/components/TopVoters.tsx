import { useState, useEffect } from "react";
import { Trophy, Crown } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

interface TopVoter {
  nick: string;
  count: number;
}

interface TopVotersProps {
  serverId: string;
  refreshKey?: number;
}

const TopVoters = ({ serverId, refreshKey }: TopVotersProps) => {
  const { t } = useLanguage();
  const [voters, setVoters] = useState<TopVoter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopVoters = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-top-voters?server_id=${serverId}&limit=5`,
          {
            headers: {
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
          }
        );
        const data = await res.json();
        setVoters(data.voters || []);
      } catch {
        // silently fail
      }
      setLoading(false);
    };
    fetchTopVoters();
  }, [serverId, refreshKey]);

  if (loading || voters.length === 0) return null;

  const rankColors = [
    "text-yellow-500",  // #1 gold
    "text-gray-400",    // #2 silver
    "text-amber-600",   // #3 bronze
    "text-muted-foreground",
    "text-muted-foreground",
  ];

  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          {t("top_voters_title")}
        </h3>
      </div>

      <div className="space-y-2">
        {voters.map((voter, i) => (
          <div
            key={voter.nick}
            className="flex items-center gap-3 rounded-md bg-background/50 px-3 py-2 border border-border/50"
          >
            <span className={`font-display font-bold text-sm w-6 ${rankColors[i] || "text-muted-foreground"}`}>
              {i === 0 ? <Crown className="h-4 w-4 fill-yellow-500 text-yellow-500" /> : `#${i + 1}`}
            </span>
            <img
              src={`https://mc-heads.net/avatar/${voter.nick}/32`}
              alt={voter.nick}
              className="h-8 w-8 rounded pixelated"
              loading="lazy"
            />
            <span className="font-mono text-sm text-foreground flex-1 truncate">
              {voter.nick}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {voter.count}×
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopVoters;
