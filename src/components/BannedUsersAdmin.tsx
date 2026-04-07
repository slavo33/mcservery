import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Ban, ShieldOff, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";

interface BannedUser {
  id: string;
  user_id: string;
  reason: string;
  banned_at: string;
  nickname?: string;
}

const BannedUsersAdmin = () => {
  const { t, locale } = useLanguage();
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBannedUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("banned_users")
      .select("*")
      .order("banned_at", { ascending: false });

    if (!data) {
      setLoading(false);
      return;
    }

    const userIds = data.map((b) => b.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, nickname")
      .in("id", userIds);

    const profileMap = new Map<string, string>();
    if (profiles) profiles.forEach((p) => profileMap.set(p.id, p.nickname));

    setBannedUsers(
      data.map((b) => ({
        ...b,
        nickname: profileMap.get(b.user_id) || "?",
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchBannedUsers();
  }, []);

  const handleUnban = async (ban: BannedUser) => {
    if (!confirm(t("ban_unban_confirm"))) return;
    const { error } = await supabase.from("banned_users").delete().eq("id", ban.id);
    if (error) {
      toast.error(t("ban_unban_error"));
      return;
    }
    toast.success(t("ban_unban_success"));
    fetchBannedUsers();
  };

  const localeMap: Record<string, string> = {
    sk: "sk-SK", cs: "cs-CZ", en: "en-US", de: "de-DE", fr: "fr-FR",
    ru: "ru-RU", uk: "uk-UA", es: "es-ES", pt: "pt-PT", br: "pt-BR",
    zh: "zh-CN", ja: "ja-JP",
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(localeMap[locale] || "en-US", {
      day: "numeric", month: "short", year: "numeric",
    });

  return (
    <div className="mt-10">
      <div className="flex items-center gap-2 mb-4">
        <Ban className="h-5 w-5 text-destructive" />
        <h2 className="font-display text-xl font-bold text-foreground">{t("ban_title")}</h2>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      ) : bannedUsers.length === 0 ? (
        <div className="text-center py-8 rounded-lg border border-border bg-secondary/20">
          <ShieldOff className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{t("ban_none")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bannedUsers.map((ban) => (
            <div key={ban.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/20 p-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 w-8 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{ban.nickname}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(ban.banned_at)}
                    {ban.reason && <> · {ban.reason}</>}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => handleUnban(ban)}>
                <ShieldOff className="h-3.5 w-3.5" />
                {t("ban_unban")}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BannedUsersAdmin;
