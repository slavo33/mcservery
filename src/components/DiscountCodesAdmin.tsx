import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";
import { Tag, Plus, Ban, Infinity, Hash, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DiscountCode {
  id: string;
  code: string;
  percent_off: number;
  max_uses: number | null;
  is_active: boolean;
  created_at: string;
  usage_count?: number;
}

const DiscountCodesAdmin = () => {
  const { t, locale } = useLanguage();
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState("");
  const [percentOff, setPercentOff] = useState(15);
  const [usageType, setUsageType] = useState<"single" | "unlimited">("single");
  const [creating, setCreating] = useState(false);

  const localeMap: Record<string, string> = {
    sk: "sk-SK", cs: "cs-CZ", en: "en-US", de: "de-DE", fr: "fr-FR",
    ru: "ru-RU", uk: "uk-UA", es: "es-ES", pt: "pt-PT", br: "pt-BR",
    zh: "zh-CN", ja: "ja-JP",
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(localeMap[locale] || "en-US", {
      day: "numeric", month: "short", year: "numeric",
    });

  const fetchCodes = async () => {
    setLoading(true);
    const { data: codesData } = await supabase
      .from("discount_codes")
      .select("*")
      .order("created_at", { ascending: false });

    if (!codesData) { setLoading(false); return; }

    // Fetch usage counts
    const codeIds = codesData.map(c => c.id);
    const { data: usageData } = await supabase
      .from("discount_code_usage")
      .select("discount_code_id")
      .in("discount_code_id", codeIds);

    const usageMap = new Map<string, number>();
    if (usageData) {
      usageData.forEach((u: any) => {
        usageMap.set(u.discount_code_id, (usageMap.get(u.discount_code_id) || 0) + 1);
      });
    }

    setCodes(codesData.map(c => ({
      ...c,
      usage_count: usageMap.get(c.id) || 0,
    })));
    setLoading(false);
  };

  useEffect(() => { fetchCodes(); }, []);

  const handleCreate = async () => {
    const code = newCode.trim().toUpperCase();
    if (!code) { toast.error(t("dc_code_required")); return; }
    if (percentOff < 1 || percentOff > 100) { toast.error(t("dc_percent_invalid")); return; }

    setCreating(true);
    const { error } = await supabase.from("discount_codes").insert({
      code,
      percent_off: percentOff,
      max_uses: usageType === "single" ? 1 : null,
      is_active: true,
    });

    if (error) {
      toast.error(error.message.includes("duplicate") ? t("dc_duplicate") : t("dc_create_error"));
    } else {
      toast.success(t("dc_created"));
      setNewCode("");
      fetchCodes();
    }
    setCreating(false);
  };

  const handleDeactivate = async (id: string) => {
    const { error } = await supabase
      .from("discount_codes")
      .update({ is_active: false })
      .eq("id", id);
    if (error) { toast.error(t("dc_deactivate_error")); return; }
    toast.success(t("dc_deactivated"));
    fetchCodes();
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(t("dc_copied"));
  };

  return (
    <div className="mt-10">
      <div className="flex items-center gap-2 mb-4">
        <Tag className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold text-foreground">{t("dc_title")}</h2>
      </div>

      {/* Create new code */}
      <div className="rounded-lg border border-border bg-secondary/20 p-4 mb-6">
        <h3 className="text-sm font-semibold text-foreground mb-3">{t("dc_create_new")}</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            value={newCode}
            onChange={(e) => setNewCode(e.target.value.toUpperCase())}
            placeholder={t("dc_code_placeholder")}
            className="font-mono uppercase tracking-wider flex-1"
            maxLength={20}
          />
          <Input
            type="number"
            value={percentOff}
            onChange={(e) => setPercentOff(Number(e.target.value))}
            min={1}
            max={100}
            className="w-24"
            placeholder="%"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setUsageType("single")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                usageType === "single"
                  ? "gradient-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <Hash className="h-3.5 w-3.5" /> {t("dc_single_use")}
            </button>
            <button
              onClick={() => setUsageType("unlimited")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                usageType === "unlimited"
                  ? "gradient-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <Infinity className="h-3.5 w-3.5" /> {t("dc_unlimited")}
            </button>
          </div>
          <Button onClick={handleCreate} disabled={creating} className="gap-1.5">
            <Plus className="h-4 w-4" /> {t("dc_create")}
          </Button>
        </div>
      </div>

      {/* Codes list */}
      {loading ? (
        <p className="text-muted-foreground">{t("loading")}</p>
      ) : codes.length === 0 ? (
        <div className="text-center py-10">
          <Tag className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-muted-foreground">{t("dc_no_codes")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {codes.map(code => (
            <div
              key={code.id}
              className={`rounded-lg border p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between ${
                code.is_active
                  ? "border-border bg-secondary/20"
                  : "border-border/50 bg-secondary/10 opacity-60"
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <button
                  onClick={() => handleCopy(code.code)}
                  className="font-mono text-lg font-bold text-foreground tracking-wider hover:text-primary transition-colors flex items-center gap-1.5"
                  title={t("dc_copy")}
                >
                  {code.code}
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <span className="text-sm font-semibold text-primary">-{code.percent_off}%</span>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>
                  {t("dc_uses")}: <span className="text-foreground font-medium">{code.usage_count}</span>
                  {code.max_uses !== null && <span>/{code.max_uses}</span>}
                  {code.max_uses === null && <span> ({t("dc_unlimited_short")})</span>}
                </span>
                <span>{formatDate(code.created_at)}</span>
                {code.is_active ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">{t("dc_active")}</span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{t("dc_inactive")}</span>
                )}
              </div>

              {code.is_active && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleDeactivate(code.id)}
                >
                  <Ban className="h-3.5 w-3.5" /> {t("dc_deactivate")}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DiscountCodesAdmin;
