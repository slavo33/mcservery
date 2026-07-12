import { logError } from "@/lib/logger";
import { findInvalidUrl } from "@/lib/urlValidation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { softwareOptions, versions, minigameOptions, proxyOptions } from "@/lib/mockData";
import { useState, useEffect } from "react";
import { Plus, Server } from "lucide-react";
import ServerImageUpload from "@/components/ServerImageUpload";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";

const AddServer = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [ip, setIp] = useState("");
  const [description, setDescription] = useState("");
  const [version, setVersion] = useState("");
  const [software, setSoftware] = useState("");
  const [proxy, setProxy] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<string[]>([]);
  const [selectedMinigames, setSelectedMinigames] = useState<string[]>([]);
  const [isWarez, setIsWarez] = useState(false);
  const [serverImages, setServerImages] = useState<string[]>([]);
  const [hasWhitelist, setHasWhitelist] = useState(false);
  const [discordUrl, setDiscordUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [serverCount, setServerCount] = useState<number | null>(null);
  const MAX_SERVERS = 5;

  useEffect(() => {
    if (!user) return;
    supabase
      .from("servers")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .then(({ count }) => setServerCount(count ?? 0));
  }, [user]);

  const togglePlatform = (p: string) =>
    setSelectedPlatform((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );

  const toggleMinigame = (m: string) =>
    setSelectedMinigames((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error(t("add_login_required"));
      navigate("/auth");
      return;
    }
    if (!name.trim() || !ip.trim()) {
      toast.error("Vyplň názov a IP adresu");
      return;
    }

    const invalidUrl = findInvalidUrl([
      { label: "Discord", value: discordUrl },
      { label: "Website", value: websiteUrl },
      { label: "Instagram", value: instagramUrl },
      { label: "TikTok", value: tiktokUrl },
      { label: "YouTube", value: youtubeUrl },
      { label: "Twitter/X", value: twitterUrl },
    ]);
    if (invalidUrl) {
      toast.error(`${invalidUrl}: Povolené sú iba HTTP a HTTPS odkazy`);
      return;
    }

    setSubmitting(true);

    // Pre-check: server limit
    const { count } = await supabase
      .from("servers")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id);
    if (count !== null && count >= 5) {
      toast.error(t("add_limit_reached"));
      setSubmitting(false);
      return;
    }

    // Pre-check: duplicate IP
    const { data: existing } = await supabase
      .from("servers")
      .select("id")
      .eq("ip", ip.trim())
      .maybeSingle();
    if (existing) {
      toast.error(t("add_duplicate_ip"));
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from("servers").insert({
      owner_id: user.id,
      name: name.trim(),
      ip: ip.trim(),
      description: description.trim(),
      version: version || "1.20.4",
      software: software || "Paper",
      proxy: proxy || null,
      platform: selectedPlatform.map((p) => p.toLowerCase()),
      minigames: selectedMinigames,
      tags: selectedMinigames.slice(0, 5),
      is_warez: isWarez,
      has_whitelist: hasWhitelist,
      discord_url: discordUrl.trim() || null,
      website_url: websiteUrl.trim() || null,
      instagram_url: instagramUrl.trim() || null,
      tiktok_url: tiktokUrl.trim() || null,
      youtube_url: youtubeUrl.trim() || null,
      twitter_url: twitterUrl.trim() || null,
      images: serverImages,
    } as any);

    if (error) {
      logError("Server insert error:", error);
      if (error.code === "23505") {
        toast.error(t("add_duplicate_ip"));
      } else if (error.code === "42501") {
        toast.error(t("add_limit_reached"));
      } else {
        toast.error(t("add_generic_error"));
      }
    } else {
      toast.success(t("add_success"));
      navigate("/servers");
    }
    setSubmitting(false);
  };

  const inputClass = "w-full rounded-md border border-border bg-secondary/50 py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Pridaj Minecraft server | MCServery"
        description="Pridaj svoj Minecraft server do databázy MCServery zadarmo. Získaj viac hráčov a vybuduj si komunitu."
        path="/add-server"
      />
      <Header />
      <main className="flex-1 container mx-auto px-4 py-10 max-w-2xl">
        <h1 className="font-display text-4xl font-bold text-foreground mb-2">
          {t("add_title_1")} <span className="text-gradient">{t("add_title_2")}</span>
        </h1>
        <p className="text-muted-foreground mb-8">{t("add_subtitle")}</p>

        {user && serverCount !== null && (
          <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 mb-6 ${serverCount >= MAX_SERVERS ? "border-destructive/50 bg-destructive/10" : "border-border bg-secondary/30"}`}>
            <Server className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                {serverCount} / {MAX_SERVERS}
              </p>
              <p className="text-xs text-muted-foreground">
                {serverCount >= MAX_SERVERS ? t("add_limit_reached") : t("add_subtitle")}
              </p>
            </div>
            <div className="w-24 h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${serverCount >= MAX_SERVERS ? "bg-destructive" : "bg-primary"}`}
                style={{ width: `${(serverCount / MAX_SERVERS) * 100}%` }}
              />
            </div>
          </div>
        )}

        {!user && (
          <div className="gradient-card rounded-lg border border-border shadow-card p-6 text-center mb-6">
            <p className="text-muted-foreground mb-3">{t("add_login_required")}</p>
            <Button onClick={() => navigate("/auth")} className="gradient-primary border-0 text-primary-foreground font-display">
              {t("add_login_btn")}
            </Button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="gradient-card rounded-lg border border-border shadow-card p-6 space-y-6">
          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">{t("add_name")} *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="MôjServer" maxLength={50} className={inputClass} required />
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">{t("add_ip")} *</label>
            <input type="text" value={ip} onChange={(e) => setIp(e.target.value)} placeholder="play.mojserver.sk" maxLength={100} className={inputClass} required />
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">{t("add_desc")}</label>
            <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opíš svoj server..." maxLength={1000} className={`${inputClass} resize-none`} />
          </div>

          {/* Warez + Whitelist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between rounded-md border border-border bg-secondary/30 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{t("add_warez")}</p>
                <p className="text-xs text-muted-foreground">{t("add_warez_desc")}</p>
              </div>
              <Switch checked={isWarez} onCheckedChange={setIsWarez} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border bg-secondary/30 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{t("add_whitelist")}</p>
                <p className="text-xs text-muted-foreground">{t("add_whitelist_desc")}</p>
              </div>
              <Switch checked={hasWhitelist} onCheckedChange={setHasWhitelist} />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground mb-2 block">{t("add_platform")}</label>
            <div className="flex gap-2">
              {["Java", "Bedrock"].map((p) => (
                <button key={p} type="button" onClick={() => togglePlatform(p)}
                  className={`filter-chip ${selectedPlatform.includes(p) ? "active" : ""}`}>{p}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">{t("add_version")}</label>
              <select value={version} onChange={(e) => setVersion(e.target.value)} className={inputClass}>
                <option value="">—</option>
                {versions.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">{t("add_software")}</label>
              <select value={software} onChange={(e) => setSoftware(e.target.value)} className={inputClass}>
                <option value="">—</option>
                {softwareOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">{t("add_proxy")}</label>
            <select value={proxy} onChange={(e) => setProxy(e.target.value)} className={inputClass}>
              {proxyOptions.map((p) => (
                <option key={p} value={p === "Žiadny" ? "" : p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground mb-2 block">{t("add_minigames")}</label>
            <div className="flex flex-wrap gap-1.5">
              {minigameOptions.map((m) => (
                <button key={m} type="button" onClick={() => toggleMinigame(m)}
                  className={`filter-chip ${selectedMinigames.includes(m) ? "active" : ""}`}>{m}</button>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <label className="text-sm font-semibold text-foreground mb-3 block">{t("add_links")}</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("add_discord")}</label>
                <input type="url" value={discordUrl} onChange={(e) => setDiscordUrl(e.target.value)} placeholder="https://discord.gg/..." className={inputClass} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("add_website")}</label>
                <input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://..." className={inputClass} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("add_instagram")}</label>
                <input type="url" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/..." className={inputClass} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("add_tiktok")}</label>
                <input type="url" value={tiktokUrl} onChange={(e) => setTiktokUrl(e.target.value)} placeholder="https://tiktok.com/@..." className={inputClass} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("add_youtube")}</label>
                <input type="url" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/..." className={inputClass} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("add_twitter")}</label>
                <input type="url" value={twitterUrl} onChange={(e) => setTwitterUrl(e.target.value)} placeholder="https://x.com/..." className={inputClass} />
              </div>
            </div>
          </div>

          <ServerImageUpload
            images={serverImages}
            onImagesChange={setServerImages}
          />

          <Button type="submit" disabled={submitting || !user}
            className="w-full gradient-primary border-0 font-display text-base font-semibold tracking-wide text-primary-foreground glow-red gap-2" size="lg">
            <Plus className="h-4 w-4" />
            {submitting ? t("add_submitting") : t("add_submit")}
          </Button>
        </form>
      </main>
      <Footer />
    </div>
  );
};

export default AddServer;
