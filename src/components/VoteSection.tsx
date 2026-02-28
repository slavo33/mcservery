import { useState, useEffect, useCallback } from "react";
import { Vote, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";

interface VoteSectionProps {
  serverId: string;
  voteCount: number;
  onVoted: () => void;
}

const formatTimeLeft = (ms: number): string => {
  if (ms <= 0) return "";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const VoteSection = ({ serverId, voteCount, onVoted }: VoteSectionProps) => {
  const { t } = useLanguage();
  const [nick, setNick] = useState("");
  const [loading, setLoading] = useState(false);
  const [voted, setVoted] = useState(false);
  const [cooldownEnd, setCooldownEnd] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState("");

  const trimmedNick = nick.trim();
  const isValidNick = /^[a-zA-Z0-9_]{3,16}$/.test(trimmedNick);

  // Countdown timer
  useEffect(() => {
    if (!cooldownEnd) {
      setTimeLeft("");
      return;
    }
    const update = () => {
      const ms = new Date(cooldownEnd).getTime() - Date.now();
      if (ms <= 0) {
        setCooldownEnd(null);
        setTimeLeft("");
      } else {
        setTimeLeft(formatTimeLeft(ms));
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [cooldownEnd]);

  const handleVote = async () => {
    if (!trimmedNick) {
      toast.error(t("vote_nick_required"));
      return;
    }
    if (!isValidNick) {
      toast.error(t("vote_nick_invalid"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-vote`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ server_id: serverId, minecraft_nick: trimmedNick }),
        }
      );

      const result = await res.json();

      if (result?.error === "cooldown" || result?.error === "cooldown_ip") {
        setCooldownEnd(result.next_vote || null);
        toast.error(t("vote_cooldown"));
        setLoading(false);
        return;
      }

      if (result?.error === "invalid_nick") {
        toast.error(t("vote_nick_invalid"));
        setLoading(false);
        return;
      }

      if (result?.error === "votifier_public_key_invalid") {
        toast.error(t("vote_error_votifier_key"));
        setLoading(false);
        return;
      }

      if (result?.error === "votifier_delivery_failed") {
        toast.error(t("vote_error_votifier_connection"));
        setLoading(false);
        return;
      }

      if (result?.error) {
        toast.error(t("vote_error"));
        setLoading(false);
        return;
      }

      setVoted(true);
      toast.success(t("vote_success"));
      onVoted();
    } catch {
      toast.error(t("vote_error"));
    }
    setLoading(false);
  };

  if (voted) {
    return (
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-6 text-center">
        <CheckCircle className="h-10 w-10 text-primary mx-auto mb-3" />
        <p className="font-display font-bold text-lg text-foreground">{t("vote_thanks")}</p>
        <p className="text-sm text-muted-foreground mt-1">{t("vote_next_in_24h")}</p>
      </div>
    );
  }

  const isCooldown = !!cooldownEnd && !!timeLeft;

  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <Vote className="h-5 w-5 text-primary" />
          {t("vote_title")}
        </h3>
        <span className="text-sm font-medium text-muted-foreground">
          {voteCount} {t("vote_count")}
        </span>
      </div>

      <p className="text-sm text-muted-foreground">{t("vote_description")}</p>

      <div className="flex items-center gap-3">
        {/* MC head preview */}
        <div className="shrink-0">
          {isValidNick ? (
            <img
              src={`https://mc-heads.net/avatar/${trimmedNick}/40`}
              alt={trimmedNick}
              className="h-10 w-10 rounded pixelated border border-border"
            />
          ) : (
            <div className="h-10 w-10 rounded border border-border bg-muted flex items-center justify-center">
              <img
                src="https://mc-heads.net/avatar/Steve/40"
                alt="Steve"
                className="h-8 w-8 rounded pixelated opacity-30"
              />
            </div>
          )}
        </div>

        <Input
          value={nick}
          onChange={(e) => setNick(e.target.value)}
          placeholder={t("vote_nick_placeholder")}
          className="font-mono"
          maxLength={16}
          disabled={loading || isCooldown}
          onKeyDown={(e) => e.key === "Enter" && handleVote()}
        />
      </div>

      {isCooldown ? (
        <div className="w-full h-12 rounded-md bg-muted border border-border flex items-center justify-center gap-2 text-muted-foreground">
          <Clock className="h-5 w-5" />
          <span className="font-display font-semibold text-sm">
            {t("vote_cooldown_timer")} {timeLeft}
          </span>
        </div>
      ) : (
        <Button
          onClick={handleVote}
          disabled={loading || !trimmedNick}
          className="w-full h-12 text-base font-display font-bold tracking-wide"
          size="lg"
        >
          {loading ? (
            <Clock className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Vote className="h-5 w-5 mr-2" />
              {t("vote_submit_big")}
            </>
          )}
        </Button>
      )}
    </div>
  );
};

export default VoteSection;
