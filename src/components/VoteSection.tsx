import { useState } from "react";
import { Vote, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
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

  const handleVote = async () => {
    const trimmedNick = nick.trim();
    if (!trimmedNick) {
      toast.error(t("vote_nick_required"));
      return;
    }

    const nickRegex = /^[a-zA-Z0-9_]{3,16}$/;
    if (!nickRegex.test(trimmedNick)) {
      toast.error(t("vote_nick_invalid"));
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("handle-vote", {
        body: { server_id: serverId, minecraft_nick: trimmedNick },
      });

      if (error) {
        const body = typeof error === "object" && "context" in error ? error : null;
        // Try to parse the response for specific errors
        toast.error(t("vote_error"));
        setLoading(false);
        return;
      }

      if (data?.error === "cooldown" || data?.error === "cooldown_ip") {
        setCooldownEnd(data.next_vote || null);
        toast.error(t("vote_cooldown"));
        setLoading(false);
        return;
      }

      if (data?.error === "invalid_nick") {
        toast.error(t("vote_nick_invalid"));
        setLoading(false);
        return;
      }

      if (data?.error) {
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
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center">
        <CheckCircle className="h-8 w-8 text-primary mx-auto mb-2" />
        <p className="font-display font-semibold text-foreground">{t("vote_thanks")}</p>
        <p className="text-sm text-muted-foreground mt-1">{t("vote_next_in_24h")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-3">
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

      <div className="flex gap-2">
        <Input
          value={nick}
          onChange={(e) => setNick(e.target.value)}
          placeholder={t("vote_nick_placeholder")}
          className="font-mono"
          maxLength={16}
          disabled={loading}
        />
        <Button onClick={handleVote} disabled={loading || !nick.trim()}>
          {loading ? <Clock className="h-4 w-4 animate-spin" /> : t("vote_submit")}
        </Button>
      </div>

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
