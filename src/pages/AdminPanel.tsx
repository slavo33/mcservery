import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { Shield, Eye, Trash2, XCircle, MessageSquare, Server, Users } from "lucide-react";
import DiscountCodesAdmin from "@/components/DiscountCodesAdmin";
import VipPurchasesAdmin from "@/components/VipPurchasesAdmin";
import VipManagementAdmin from "@/components/VipManagementAdmin";
import BugReportsAdmin from "@/components/BugReportsAdmin";
import StaffPostVipAdmin from "@/components/StaffPostVipAdmin";
import { Button } from "@/components/ui/button";

interface Report {
  id: string;
  reporter_id: string;
  report_type: "server" | "comment" | "staff_post";
  target_id: string;
  reason: string;
  status: "pending" | "resolved" | "dismissed";
  created_at: string;
  reporterNickname?: string;
  targetName?: string;
  targetSlug?: string;
  targetLink?: string;
}

const AdminPanel = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { t, locale } = useLanguage();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "resolved" | "dismissed" | "all">("pending");

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate("/");
    }
  }, [user, isAdmin, authLoading]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchReports();
  }, [isAdmin, filter]);

  const fetchReports = async () => {
    setLoading(true);
    let query = supabase.from("reports" as any).select("*").order("created_at", { ascending: false });
    if (filter !== "all") {
      query = query.eq("status", filter);
    }
    const { data } = await query;
    if (!data) { setLoading(false); return; }

    const reportsList = data as any as Report[];

    // Fetch reporter nicknames
    const reporterIds = [...new Set(reportsList.map(r => r.reporter_id))];
    const { data: profiles } = await supabase.from("profiles").select("id, nickname").in("id", reporterIds);
    const profileMap = new Map<string, string>();
    if (profiles) profiles.forEach((p: any) => profileMap.set(p.id, p.nickname));

    // Fetch server names for server reports
    const serverIds = reportsList.filter(r => r.report_type === "server").map(r => r.target_id);
    const serverMap = new Map<string, string>();
    const slugMap = new Map<string, string>();
    if (serverIds.length > 0) {
      const { data: servers } = await supabase.from("servers").select("id, name, slug").in("id", serverIds);
      if (servers) servers.forEach(s => { serverMap.set(s.id, s.name); slugMap.set(s.id, s.slug); });
    }

    // Fetch comment content for comment reports (check both comments and staff_comments)
    const commentIds = reportsList.filter(r => r.report_type === "comment").map(r => r.target_id);
    const commentMap = new Map<string, string>();
    const commentLinkMap = new Map<string, string>();
    if (commentIds.length > 0) {
      const { data: comments } = await supabase.from("comments").select("id, content, server_id").in("id", commentIds);
      if (comments) {
        for (const c of comments) {
          commentMap.set(c.id, c.content);
          // Get server slug for linking
          const { data: srv } = await supabase.from("servers").select("slug").eq("id", c.server_id).maybeSingle();
          if (srv) commentLinkMap.set(c.id, `/server/${srv.slug}`);
        }
      }

      // Check staff_comments for IDs not found in comments
      const missingIds = commentIds.filter(id => !commentMap.has(id));
      if (missingIds.length > 0) {
        const { data: staffComments } = await supabase.from("staff_comments").select("id, content, staff_post_id").in("id", missingIds);
        if (staffComments) {
          for (const sc of staffComments) {
            commentMap.set(sc.id, sc.content);
            commentLinkMap.set(sc.id, `/staff/${sc.staff_post_id}`);
          }
        }
      }
    }

    // Fetch staff post info for staff_post reports
    const staffPostIds = reportsList.filter(r => r.report_type === "staff_post").map(r => r.target_id);
    const staffPostMap = new Map<string, string>();
    if (staffPostIds.length > 0) {
      const { data: staffPosts } = await supabase.from("staff_posts").select("id, position, server_ip").in("id", staffPostIds);
      if (staffPosts) staffPosts.forEach(sp => staffPostMap.set(sp.id, `${sp.position} — ${sp.server_ip}`));
    }

    setReports(reportsList.map(r => ({
      ...r,
      reporterNickname: profileMap.get(r.reporter_id) || "?",
      targetName: r.report_type === "server"
        ? serverMap.get(r.target_id) || t("detail_not_found")
        : r.report_type === "staff_post"
        ? staffPostMap.get(r.target_id) || t("detail_not_found")
        : commentMap.get(r.target_id) || t("comments_deleted"),
      targetSlug: r.report_type === "server" ? slugMap?.get(r.target_id) : undefined,
      targetLink: r.report_type === "server"
        ? `/server/${slugMap?.get(r.target_id) || r.target_id}`
        : r.report_type === "staff_post"
        ? `/staff/${r.target_id}`
        : commentLinkMap.get(r.target_id),
    })));
    setLoading(false);
  };

  const handleDeleteServer = async (report: Report) => {
    if (!confirm(t("detail_delete_confirm"))) return;
    const { error } = await supabase.from("servers").delete().eq("id", report.target_id);
    if (error) {
      toast.error(t("detail_delete_error"));
      return;
    }
    await supabase.from("reports" as any).update({ status: "resolved", resolved_by: user!.id, resolved_at: new Date().toISOString() } as any).eq("id", report.id);
    toast.success(t("admin_server_deleted"));
    fetchReports();
  };

  const handleDeleteComment = async (report: Report) => {
    // Try deleting from comments first, then staff_comments
    const { error } = await supabase.from("comments").delete().eq("id", report.target_id);
    if (error) {
      // Try staff_comments
      const { error: err2 } = await supabase.from("staff_comments").delete().eq("id", report.target_id);
      if (err2) {
        toast.error(t("comments_error"));
        return;
      }
    }
    await supabase.from("reports" as any).update({ status: "resolved", resolved_by: user!.id, resolved_at: new Date().toISOString() } as any).eq("id", report.id);
    toast.success(t("admin_comment_deleted"));
    fetchReports();
  };

  const handleDeleteStaffPost = async (report: Report) => {
    if (!confirm(t("detail_delete_confirm"))) return;
    const { error } = await supabase.from("staff_posts").delete().eq("id", report.target_id);
    if (error) {
      toast.error(t("staff_error"));
      return;
    }
    await supabase.from("reports" as any).update({ status: "resolved", resolved_by: user!.id, resolved_at: new Date().toISOString() } as any).eq("id", report.id);
    toast.success(t("staff_deleted"));
    fetchReports();
  };

  const handleDismiss = async (report: Report) => {
    await supabase.from("reports" as any).update({ status: "dismissed", resolved_by: user!.id, resolved_at: new Date().toISOString() } as any).eq("id", report.id);
    toast.success(t("admin_dismissed"));
    fetchReports();
  };

  const localeMap: Record<string, string> = {
    sk: "sk-SK", cs: "cs-CZ", en: "en-US", de: "de-DE", fr: "fr-FR",
    ru: "ru-RU", uk: "uk-UA", es: "es-ES", pt: "pt-PT", br: "pt-BR",
    zh: "zh-CN", ja: "ja-JP",
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(localeMap[locale] || "en-US", {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  const getReportTypeLabel = (type: string) => {
    if (type === "server") return t("admin_report_type_server");
    if (type === "staff_post") return t("nav_staff");
    return t("admin_report_type_comment");
  };

  const getReportTypeIcon = (type: string) => {
    if (type === "server") return <Server className="h-4 w-4 text-primary" />;
    if (type === "staff_post") return <Users className="h-4 w-4 text-primary" />;
    return <MessageSquare className="h-4 w-4 text-primary" />;
  };

  if (authLoading) {
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
      <main className="flex-1 container mx-auto px-4 py-10 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              {t("admin_title_1")} <span className="text-gradient">{t("admin_title_2")}</span>
            </h1>
            <p className="text-sm text-muted-foreground">{t("admin_subtitle")}</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(["pending", "resolved", "dismissed", "all"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                filter === f
                  ? "gradient-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "pending" ? t("admin_status_pending") :
               f === "resolved" ? t("admin_status_resolved") :
               f === "dismissed" ? t("admin_status_dismissed") : t("filter_all")}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-muted-foreground">{t("loading")}</p>
        ) : reports.length === 0 ? (
          <div className="text-center py-16">
            <Shield className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">{t("admin_no_reports")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map(report => (
              <div key={report.id} className="rounded-lg border border-border bg-secondary/20 p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    {getReportTypeIcon(report.report_type)}
                    <span className="text-sm font-semibold text-foreground">
                      {getReportTypeLabel(report.report_type)}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDate(report.created_at)}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    report.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                    report.status === "resolved" ? "bg-green-500/20 text-green-400" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {report.status === "pending" ? t("admin_status_pending") :
                     report.status === "resolved" ? t("admin_status_resolved") : t("admin_status_dismissed")}
                  </span>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {t("admin_reported_by")}: <span className="text-foreground">{report.reporterNickname}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mb-1">
                    Cieľ: <span className="text-foreground">{report.targetName}</span>
                  </p>
                  <p className="text-sm text-foreground/90 bg-secondary/50 rounded p-2 mt-2">
                    {t("admin_reason")}: {report.reason}
                  </p>
                </div>

                {report.status === "pending" && (
                  <div className="flex gap-2 flex-wrap pt-1">
                    {report.targetLink && (
                      <Link to={report.targetLink}>
                        <Button variant="outline" size="sm" className="gap-1.5">
                          <Eye className="h-3.5 w-3.5" /> {t("admin_view_server")}
                        </Button>
                      </Link>
                    )}
                    {report.report_type === "server" && (
                      <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => handleDeleteServer(report)}>
                        <Trash2 className="h-3.5 w-3.5" /> {t("admin_delete_server")}
                      </Button>
                    )}
                    {report.report_type === "comment" && (
                      <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => handleDeleteComment(report)}>
                        <Trash2 className="h-3.5 w-3.5" /> {t("admin_delete_comment")}
                      </Button>
                    )}
                    {report.report_type === "staff_post" && (
                      <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => handleDeleteStaffPost(report)}>
                        <Trash2 className="h-3.5 w-3.5" /> {t("staff_delete")}
                      </Button>
                    )}
                    <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => handleDismiss(report)}>
                      <XCircle className="h-3.5 w-3.5" /> {t("admin_dismiss")}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <VipManagementAdmin />
        <VipPurchasesAdmin />
        <DiscountCodesAdmin />
        <BugReportsAdmin />
      </main>
      <Footer />
    </div>
  );
};

export default AdminPanel;
