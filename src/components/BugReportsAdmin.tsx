import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";
import { Bug, CheckCircle, XCircle, Trash2, Image, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BugReport {
  id: string;
  reporter_id: string;
  title: string;
  description: string;
  screenshot_url: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
  reporterNickname?: string;
  reporterAvatar?: string | null;
}

const BugReportsAdmin = () => {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"open" | "resolved" | "dismissed" | "all">("open");

  const localeMap: Record<string, string> = {
    sk: "sk-SK", cs: "cs-CZ", en: "en-US", de: "de-DE", fr: "fr-FR",
    ru: "ru-RU", uk: "uk-UA", es: "es-ES", pt: "pt-PT", br: "pt-BR",
    zh: "zh-CN", ja: "ja-JP",
  };

  useEffect(() => {
    fetchReports();
  }, [filter]);

  const fetchReports = async () => {
    setLoading(true);
    let query = supabase.from("bug_reports").select("*").order("created_at", { ascending: false });
    if (filter !== "all") {
      query = query.eq("status", filter);
    }
    const { data } = await query;
    if (!data) { setLoading(false); return; }

    const reportsList: BugReport[] = data;
    const reporterIds = [...new Set(reportsList.map(r => r.reporter_id))];

    const { data: profiles } = await supabase.from("profiles").select("id, nickname, avatar_url").in("id", reporterIds);
    const profileMap = new Map<string, { nickname: string; avatar_url: string | null }>();
    if (profiles) profiles.forEach((p) => profileMap.set(p.id, { nickname: p.nickname, avatar_url: p.avatar_url }));

    setReports(reportsList.map(r => ({
      ...r,
      reporterNickname: profileMap.get(r.reporter_id)?.nickname || "?",
      reporterAvatar: profileMap.get(r.reporter_id)?.avatar_url || null,
    })));
    setLoading(false);
  };

  const handleResolve = async (id: string) => {
    await supabase.from("bug_reports").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("id", id);
    toast.success(t("bug_admin_resolved"));
    fetchReports();
  };

  const handleDismiss = async (id: string) => {
    await supabase.from("bug_reports").update({ status: "dismissed", resolved_at: new Date().toISOString() }).eq("id", id);
    toast.success(t("bug_admin_dismissed"));
    fetchReports();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("bug_reports").delete().eq("id", id);
    toast.success(t("bug_admin_deleted"));
    fetchReports();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(localeMap[locale] || "en-US", {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div className="mt-10">
      <div className="flex items-center gap-3 mb-4">
        <Bug className="h-6 w-6 text-primary" />
        <h2 className="font-display text-2xl font-bold text-foreground">{t("bug_admin_title")}</h2>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {(["open", "resolved", "dismissed", "all"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === f
                ? "gradient-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {f === "open" ? t("bug_status_open") :
             f === "resolved" ? t("admin_status_resolved") :
             f === "dismissed" ? t("admin_status_dismissed") : t("filter_all")}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">{t("loading")}</p>
      ) : reports.length === 0 ? (
        <div className="text-center py-10">
          <Bug className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">{t("bug_admin_empty")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map(report => (
            <div key={report.id} className="rounded-lg border border-border bg-secondary/20 p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-foreground text-sm">{report.title}</h3>
                  <p className="text-xs text-muted-foreground">{formatDate(report.created_at)}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                  report.status === "open" ? "bg-yellow-500/20 text-yellow-400" :
                  report.status === "resolved" ? "bg-green-500/20 text-green-400" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {report.status === "open" ? t("bug_status_open") :
                   report.status === "resolved" ? t("admin_status_resolved") : t("admin_status_dismissed")}
                </span>
              </div>

              <Link
                to={`/user/${report.reporter_id}`}
                className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <div className="h-5 w-5 rounded-full bg-secondary border border-border overflow-hidden flex items-center justify-center">
                  {report.reporterAvatar ? (
                    <img src={report.reporterAvatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                <span>{report.reporterNickname}</span>
              </Link>

              <p className="text-sm text-foreground/90 bg-secondary/50 rounded p-2">
                {report.description}
              </p>

              {report.screenshot_url && (
                <a href={report.screenshot_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                  <Image className="h-3.5 w-3.5" />
                  {t("bug_admin_view_screenshot")}
                </a>
              )}

              {report.status === "open" && (
                <div className="flex gap-2 flex-wrap pt-1">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleResolve(report.id)}>
                    <CheckCircle className="h-3.5 w-3.5" /> {t("bug_admin_resolve")}
                  </Button>
                  <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => handleDismiss(report.id)}>
                    <XCircle className="h-3.5 w-3.5" /> {t("admin_dismiss")}
                  </Button>
                  <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => handleDelete(report.id)}>
                    <Trash2 className="h-3.5 w-3.5" /> {t("bug_admin_delete")}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BugReportsAdmin;
