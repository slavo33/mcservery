import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface VipPurchase {
  id: string;
  user_id: string;
  server_id: string;
  tier: string;
  amount_paid: number;
  starts_at: string;
  expires_at: string;
  created_at: string;
  stripe_session_id: string | null;
  serverName?: string;
  buyerNickname?: string;
}

const VipPurchasesAdmin = () => {
  const { locale } = useLanguage();
  const [purchases, setPurchases] = useState<VipPurchase[]>([]);
  const [loading, setLoading] = useState(true);

  const localeMap: Record<string, string> = {
    sk: "sk-SK", cs: "cs-CZ", en: "en-US", de: "de-DE", fr: "fr-FR",
    ru: "ru-RU", uk: "uk-UA", es: "es-ES", pt: "pt-PT", br: "pt-BR",
    zh: "zh-CN", ja: "ja-JP",
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(localeMap[locale] || "en-US", {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("vip_purchases")
      .select("*")
      .order("created_at", { ascending: false });

    if (!data) { setLoading(false); return; }

    const serverIds = [...new Set(data.map((p) => p.server_id))];
    const userIds = [...new Set(data.map((p) => p.user_id))];

    const [{ data: servers }, { data: profiles }] = await Promise.all([
      supabase.from("servers").select("id, name").in("id", serverIds),
      supabase.from("profiles").select("id, nickname").in("id", userIds),
    ]);

    const serverMap = new Map<string, string>();
    servers?.forEach((s) => serverMap.set(s.id, s.name));
    const profileMap = new Map<string, string>();
    profiles?.forEach((p) => profileMap.set(p.id, p.nickname));

    setPurchases(
      data.map((p) => ({
        ...p,
        serverName: serverMap.get(p.server_id) || "?",
        buyerNickname: profileMap.get(p.user_id) || "?",
      }))
    );
    setLoading(false);
  };

  const isActive = (expiresAt: string) => new Date(expiresAt) > new Date();

  const tierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case "basic": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "pro": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "max": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <section className="mt-12">
      <div className="flex items-center gap-2 mb-4">
        <Crown className="h-5 w-5" style={{ color: "hsl(45 93% 55%)" }} />
        <h2 className="font-display text-xl font-bold text-foreground">VIP Nákupy</h2>
        <Badge variant="secondary" className="ml-auto">{purchases.length}</Badge>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Načítavam...</p>
      ) : purchases.length === 0 ? (
        <div className="text-center py-10">
          <Crown className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">Žiadne VIP nákupy</p>
        </div>
      ) : (
        <div className="space-y-3">
          {purchases.map((p) => (
            <div
              key={p.id}
              className="rounded-lg border border-border bg-secondary/20 p-4 space-y-2"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${tierColor(p.tier)}`}>
                    {p.tier.toUpperCase()}
                  </span>
                  <span className="text-sm font-medium text-foreground">{p.serverName}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  isActive(p.expires_at)
                    ? "bg-green-500/20 text-green-400"
                    : "bg-red-500/20 text-red-400"
                }`}>
                  {isActive(p.expires_at) ? "Aktívny" : "Expirovaný"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <p>Kupujúci: <span className="text-foreground">{p.buyerNickname}</span></p>
                <p>Suma: <span className="text-foreground">{(p.amount_paid / 100).toFixed(2)} €</span></p>
                <p>Začiatok: <span className="text-foreground">{formatDate(p.starts_at)}</span></p>
                <p>Vyprší: <span className="text-foreground">{formatDate(p.expires_at)}</span></p>
              </div>

              <p className="text-xs text-muted-foreground">
                Kúpené: {formatDate(p.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default VipPurchasesAdmin;
