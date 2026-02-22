import { useState } from "react";
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

const VoteSection = ({ serverId, voteCount, onVoted }: VoteSectionProps) => {
  const { t } = useLanguage();
  const [nick, setNick] = useState("");
  const [loading, setLoading] = useState(false);
  const [voted, setVoted] = useState(false);
  const [cooldownEnd, setCooldownEnd] = useState<string | null>(null);

  const trimmedNick = nick.trim();
  const isValidNick = /^[a-zA-Z0-9_]{3,16}$/.test(trimmedNick);

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
          disabled={loading}
          onKeyDown={(e) => e.key === "Enter" && handleVote()}
        />
      </div>

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

      {cooldownEnd && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {t("vote_cooldown")}
        </p>
      )}
    </div>
  );
};

export default VoteSection;
