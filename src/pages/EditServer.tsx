import { logError } from "@/lib/logger";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { softwareOptions, versions, minigameOptions, proxyOptions } from "@/lib/mockData";
import { useState, useEffect, useRef } from "react";
import { Save, Key, Copy, Check } from "lucide-react";
import ServerImageUpload from "@/components/ServerImageUpload";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate, useParams } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";

const EditServer = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [serverId, setServerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
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
   const [voteApiKey, setVoteApiKey] = useState<string | null>(null);
   const [apiKeyCopied, setApiKeyCopied] = useState(false);
   const [votifierIp, setVotifierIp] = useState("");
   const [votifierPort, setVotifierPort] = useState("");
   const [votifierPublicKey, setVotifierPublicKey] = useState("");

  const hasFetched = useRef(false);

  useEffect(() => {
    if (!slug || hasFetched.current) return;
    const fetchServer = async () => {
      const { data } = await supabase.from("servers").select("*").eq("slug", slug).single();
      if (!data) {
        toast.error(t("edit_not_found"));
        navigate("/servers");
        return;
      }
      if (user && data.owner_id !== user.id) {
        toast.error(t("edit_no_permission"));
        navigate(`/server/${slug}`);
        return;
      }
      hasFetched.current = true;
      setServerId(data.id);
      setName(data.name);
      setIp(data.ip);
      setDescription(data.description || "");
      setVersion(data.version);
      setSoftware(data.software);
      setProxy(data.proxy || "");
      setSelectedPlatform((data.platform || []).map((p: string) => p === "java" ? "Java" : "Bedrock"));
      setSelectedMinigames(data.minigames || []);
      setServerImages(data.images || []);
      setIsWarez(data.is_warez);
      setHasWhitelist(data.has_whitelist);
      setDiscordUrl(data.discord_url || "");
      setWebsiteUrl(data.website_url || "");
      setInstagramUrl(data.instagram_url || "");
      setTiktokUrl(data.tiktok_url || "");
      setYoutubeUrl(data.youtube_url || "");
      setTwitterUrl(data.twitter_url || "");

      // Fetch vote API key and votifier config from server_secrets (owner-only access)
      const { data: secrets } = await supabase
        .from("server_secrets" as any)
        .select("vote_api_key, votifier_ip, votifier_port, votifier_public_key")
        .eq("server_id", data.id)
        .maybeSingle() as { data: { vote_api_key: string | null; votifier_ip: string | null; votifier_port: number | null; votifier_public_key: string | null } | null };
      setVoteApiKey(secrets?.vote_api_key || null);
      setVotifierIp(secrets?.votifier_ip || "");
      setVotifierPort(secrets?.votifier_port?.toString() || "");
      setVotifierPublicKey(secrets?.votifier_public_key || "");
      
      setLoading(false);
    };
    fetchServer();
  }, [slug, user]);

  const togglePlatform = (p: string) =>
    setSelectedPlatform((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );

  const toggleMinigame = (m: string) =>
    setSelectedMinigames((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );

  // Strip PEM headers and whitespace, store only raw base64
  const normalizeVotifierPublicKey = (value: string) => {
    const cleaned = value.replace(/\r/g, "").replace(/^\uFEFF/, "").trim();
    if (!cleaned) return "";
    const withRealNewLines = cleaned.replace(/\\n/g, "\n");
    // Strip any PEM headers/footers
    const stripped = withRealNewLines
      .replace(/-----BEGIN (?:RSA )?PUBLIC KEY-----/g, "")
      .replace(/-----END (?:RSA )?PUBLIC KEY-----/g, "")
      .replace(/\s+/g, "");
    return stripped;
  };

  const isValidBase64Key = (value: string) =>
    /^[A-Za-z0-9+/=]+$/.test(value) && value.length >= 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !serverId) return;
    if (!name.trim() || !ip.trim()) {
      toast.error(t("edit_fill_required"));
      return;
    }

    // Votifier validation
    if (votifierIp.trim() && /:\d+/.test(votifierIp.trim())) {
      toast.error(t("edit_votifier_ip_no_port"));
      return;
    }
    if (votifierPort) {
      const port = parseInt(votifierPort, 10);
      if (isNaN(port) || port < 1 || port > 65535) {
        toast.error(t("edit_votifier_port_invalid"));
        return;
      }
    }
    const cleanedKey = normalizeVotifierPublicKey(votifierPublicKey);
    if (cleanedKey && !isValidBase64Key(cleanedKey)) {
      toast.error(t("edit_votifier_key_invalid"));
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("servers").update({
      name: name.trim(),
      ip: ip.trim(),
      description: description.trim(),
      version: version || "1.20.4",
      software: software || "Paper",
      proxy: proxy || null,
      platform: selectedPlatform.map((p) => p.toLowerCase()),
      minigames: selectedMinigames,
      tags: selectedMinigames.slice(0, 5),
      images: serverImages,
      is_warez: isWarez,
      has_whitelist: hasWhitelist,
      discord_url: discordUrl.trim() || null,
      website_url: websiteUrl.trim() || null,
      instagram_url: instagramUrl.trim() || null,
      tiktok_url: tiktokUrl.trim() || null,
      youtube_url: youtubeUrl.trim() || null,
      twitter_url: twitterUrl.trim() || null,
    } as any).eq("id", serverId);

    if (error) {
      logError("Server update error:", error);
      toast.error(t("edit_save_error"));
    } else {
      // Save votifier config to server_secrets
      const cleanedVotifierKey = normalizeVotifierPublicKey(votifierPublicKey);
      await supabase
        .from("server_secrets" as any)
        .update({
          votifier_ip: votifierIp.trim() || null,
          votifier_port: votifierPort ? parseInt(votifierPort, 10) : null,
          votifier_public_key: cleanedVotifierKey || null,
        } as any)
        .eq("server_id", serverId);

      toast.success(t("edit_save_success"));
      navigate(`/server/${slug}`);
    }
    setSubmitting(false);
  };

  const inputClass = "w-full rounded-md border border-border bg-secondary/50 py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30";

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">{t("loading")}</p></main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-10 max-w-2xl">
        <h1 className="font-display text-4xl font-bold text-foreground mb-2">
          {t("edit_title_1")} <span className="text-gradient">{t("edit_title_2")}</span>
        </h1>
        <p className="text-muted-foreground mb-8">{t("edit_subtitle")}</p>

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
            serverId={serverId || undefined}
          />

          {/* Votifier / NuVotifier Configuration */}
          <div className="rounded-md border border-border bg-secondary/30 p-4 space-y-4">
            <div>
              <p className="text-sm font-semibold text-foreground">{t("edit_votifier_title")}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("edit_votifier_desc")}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("edit_votifier_ip")}</label>
                <input
                  type="text"
                  value={votifierIp}
                  onChange={(e) => setVotifierIp(e.target.value)}
                  placeholder={t("edit_votifier_ip_placeholder")}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("edit_votifier_port")}</label>
                <input
                  type="number"
                  value={votifierPort}
                  onChange={(e) => setVotifierPort(e.target.value)}
                  placeholder={t("edit_votifier_port_placeholder")}
                  className={inputClass}
                  min={1}
                  max={65535}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("edit_votifier_key")}</label>
              <textarea
                rows={4}
                value={votifierPublicKey}
                onChange={(e) => setVotifierPublicKey(e.target.value)}
                placeholder={t("edit_votifier_key_placeholder")}
                className={`${inputClass} resize-none font-mono text-xs`}
              />
            </div>
          </div>

          {voteApiKey && (
            <div className="rounded-md border border-border bg-secondary/30 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">{t("edit_vote_api_key")}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("edit_vote_api_desc")}
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-background border border-border px-3 py-2 text-xs font-mono text-foreground select-all break-all">
                  {voteApiKey}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(voteApiKey);
                    setApiKeyCopied(true);
                    toast.success(t("edit_vote_api_copied"));
                    setTimeout(() => setApiKeyCopied(false), 2000);
                  }}
                  className="shrink-0"
                >
                  {apiKeyCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("edit_vote_api_endpoint")}: <code className="text-primary">{"GET /functions/v1/get-pending-votes?api_key="}{voteApiKey}</code>
              </p>
            </div>
          )}

          <Button type="submit" disabled={submitting}
            className="w-full gradient-primary border-0 font-display text-base font-semibold tracking-wide text-primary-foreground glow-red gap-2" size="lg">
            <Save className="h-4 w-4" />
            {submitting ? t("edit_saving") : t("edit_save")}
          </Button>
        </form>
      </main>
      <Footer />
    </div>
  );
};

export default EditServer;
