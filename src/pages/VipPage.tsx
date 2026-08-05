import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { buildPageJsonLdGraph } from "@/lib/pageJsonLd";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Crown, Zap, Rocket, Check, Tag, ArrowRight, Terminal } from "lucide-react";
import { toast } from "sonner";

const VIP_TIERS = [
  {
    id: "basic",
    icon: Crown,
    price: 5,
    originalPrice: 5,
    days: 7,
    cooldown: 8,
    colorClass: "from-blue-500 to-cyan-400",
    borderClass: "border-blue-500/30 hover:border-blue-400/60",
    badgeClass: "bg-blue-500/10 text-blue-400",
    glowClass: "shadow-blue-500/20",
  },
  {
    id: "pro",
    icon: Zap,
    price: 20,
    originalPrice: 25,
    days: 30,
    cooldown: 4,
    colorClass: "from-primary to-purple-400",
    borderClass: "border-primary/30 hover:border-primary/60",
    badgeClass: "bg-primary/10 text-primary",
    glowClass: "shadow-primary/20",
    popular: true,
  },
  {
    id: "max",
    icon: Rocket,
    price: 50,
    originalPrice: 75,
    days: 90,
    cooldown: 2,
    colorClass: "from-amber-500 to-orange-400",
    borderClass: "border-amber-500/30 hover:border-amber-400/60",
    badgeClass: "bg-amber-500/10 text-amber-400",
    glowClass: "shadow-amber-500/20",
  },
];

const VipPage = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [servers, setServers] = useState<{ id: string; name: string }[]>([]);
  const [selectedServer, setSelectedServer] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchServers = async () => {
      const { data } = await supabase
        .from("servers")
        .select("id, name")
        .eq("owner_id", user.id);
      if (data) setServers(data);
      if (data && data.length > 0) setSelectedServer(data[0].id);
    };
    fetchServers();
  }, [user]);

  const handlePurchase = async (tierId: string) => {
    if (!user) {
      toast.error(t("vip_login_required"));
      return;
    }
    if (!selectedServer) {
      toast.error(t("vip_select_server"));
      return;
    }

    setLoading(tierId);
    try {
      const { data, error } = await supabase.functions.invoke("create-vip-checkout", {
        body: {
          tier: tierId,
          server_id: selectedServer,
          discount_code: discountCode || undefined,
        },
      });

      if (error) {
        console.error("VIP checkout error:", error);
        toast.error(t("vip_error"));
        setLoading(null);
        return;
      }
      if (data?.error === "invalid_discount_code") {
        toast.error(t("vip_invalid_code"));
        setLoading(null);
        return;
      }
      if (data?.error === "discount_code_expired") {
        toast.error(t("vip_code_expired"));
        setLoading(null);
        return;
      }
      if (data?.error) {
        console.error("VIP checkout error:", data.error);
        toast.error(t("vip_error"));
        setLoading(null);
        return;
      }
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      console.error("VIP checkout exception:", e);
      toast.error(t("vip_error"));
    }
    setLoading(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="VIP členstvo — zvýrazni svoj server | MCServery"
        description="Získaj VIP členstvo a zvýrazni svoj Minecraft server na vrchole zoznamu. Viac hráčov, lepšia viditeľnosť a kratší cooldown hlasovania."
        path="/vip"
        jsonLd={buildPageJsonLdGraph({
          name: "VIP členstvo",
          description: "Získaj VIP členstvo a zvýrazni svoj Minecraft server na vrchole zoznamu.",
          path: "/vip",
          breadcrumbs: [["VIP členstvo", "/vip"]],
        })}
      />
      <Header />
      <main className="flex-1 container mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            {t("vip_title_1")} <span className="text-gradient">{t("vip_title_2")}</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t("vip_subtitle")}
          </p>
        </div>

        {/* Server selection */}
        {user && servers.length > 0 && (
          <div className="max-w-md mx-auto mb-10">
            <label className="text-sm font-semibold text-foreground mb-2 block">
              {t("vip_select_server_label")}
            </label>
            <select
              value={selectedServer}
              onChange={(e) => setSelectedServer(e.target.value)}
              className="w-full rounded-md border border-border bg-secondary/50 py-2.5 px-4 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
              {servers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        {!user && (
          <div className="text-center mb-10">
            <p className="text-muted-foreground mb-3">{t("vip_login_required")}</p>
            <Link to="/auth">
              <Button className="gradient-primary border-0 font-display font-semibold">
                {t("nav_login")} <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        )}

        {/* Tier cards */}
        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto mb-12">
          {VIP_TIERS.map((tier) => {
            const Icon = tier.icon;
            return (
              <div
                key={tier.id}
                className={`relative rounded-xl border ${tier.borderClass} bg-secondary/20 p-6 transition-all duration-300 hover:shadow-xl hover:${tier.glowClass} ${tier.popular ? "ring-2 ring-primary/40 scale-[1.02]" : ""}`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    {t("vip_most_popular")}
                  </div>
                )}

                <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 mb-4 ${tier.badgeClass} text-sm font-bold`}>
                  <Icon className="h-4 w-4" />
                  {t(`vip_tier_${tier.id}` as any)}
                </div>

                <div className="mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-4xl font-display font-bold bg-gradient-to-r ${tier.colorClass} bg-clip-text text-transparent`}>
                      {tier.price}€
                    </span>
                    {tier.originalPrice !== tier.price && (
                      <span className="text-lg text-muted-foreground line-through">{tier.originalPrice}€</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("vip_duration_prefix")} {tier.days} {t("vip_days")}
                  </p>
                </div>

                <ul className="space-y-2.5 mb-6">
                  <li className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    {t("vip_feature_pinned")}
                  </li>
                  <li className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    {t("vip_feature_vote_cooldown")} {tier.cooldown}h
                  </li>
                  <li className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    {t("vip_feature_badge")}
                  </li>
                  <li className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    {t("vip_feature_priority")}
                  </li>
                  <li className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    {t("vip_feature_staff_priority")}
                  </li>
                  <li className="flex items-start gap-2 text-sm text-foreground">
                    <Terminal className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    {t("vip_feature_console")}
                  </li>
                </ul>

                <Button
                  onClick={() => handlePurchase(tier.id)}
                  disabled={!!loading || !user || servers.length === 0}
                  className={`w-full font-display font-bold bg-gradient-to-r ${tier.colorClass} border-0 text-white hover:opacity-90`}
                  size="lg"
                >
                  {loading === tier.id ? t("loading") : t("vip_buy_now")}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Discount code */}
        {user && servers.length > 0 && (
          <div className="max-w-md mx-auto text-center">
            <div className="flex items-center gap-2 mb-2 justify-center">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">{t("vip_discount_code")}</span>
            </div>
            <Input
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
              placeholder={t("vip_discount_placeholder")}
              className="text-center font-mono uppercase tracking-wider"
              maxLength={20}
            />
            <p className="text-xs text-muted-foreground mt-2">{t("vip_discount_hint")}</p>
          </div>
        )}

        {/* Payment methods info */}
        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground mb-3">{t("vip_payment_methods")}</p>
          <div className="flex items-center justify-center gap-4 text-muted-foreground/60">
            <span className="text-xs font-medium px-3 py-1 rounded-full border border-border">Visa</span>
            <span className="text-xs font-medium px-3 py-1 rounded-full border border-border">Mastercard</span>
            <span className="text-xs font-medium px-3 py-1 rounded-full border border-border">PayPal</span>
            <span className="text-xs font-medium px-3 py-1 rounded-full border border-border">Google Pay</span>
            <span className="text-xs font-medium px-3 py-1 rounded-full border border-border">Apple Pay</span>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default VipPage;
