import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";
import { Send, User, Trash2, Flag } from "lucide-react";
import { Link } from "react-router-dom";
import ReportDialog from "./ReportDialog";
import StaffCommentReactions from "./StaffCommentReactions";

interface Profile {
  nickname: string;
  avatar_url: string | null;
}

interface StaffComment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profile?: Profile | null;
}

const StaffCommentSection = ({ staffPostId }: { staffPostId: string }) => {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const [comments, setComments] = useState<StaffComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = async () => {
    const { data } = await supabase
      .from("staff_comments")
      .select("id, content, created_at, user_id")
      .eq("staff_post_id", staffPostId)
      .order("created_at", { ascending: false });

    if (!data) { setLoading(false); return; }

    const userIds = [...new Set(data.map(c => c.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, nickname, avatar_url")
      .in("id", userIds);

    const profileMap = new Map<string, Profile>();
    profiles?.forEach(p => profileMap.set(p.id, { nickname: p.nickname, avatar_url: p.avatar_url }));

    setComments(data.map(c => ({
      ...c,
      profile: profileMap.get(c.user_id) || null,
    })));
    setLoading(false);
  };

  useEffect(() => { fetchComments(); }, [staffPostId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error(t("comments_login_required")); return; }
    if (!newComment.trim()) return;

    setSubmitting(true);
    const { error } = await supabase.from("staff_comments").insert({
      staff_post_id: staffPostId,
      user_id: user.id,
      content: newComment.trim(),
    });

    if (error) {
      toast.error(t("comments_error"));
    } else {
      setNewComment("");
      await fetchComments();
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("staff_comments").delete().eq("id", id);
    if (!error) {
      setComments(prev => prev.filter(c => c.id !== id));
      toast.success(t("comments_deleted"));
    }
  };

  const localeMap: Record<string, string> = {
    sk: "sk-SK", cs: "cs-CZ", en: "en-US", de: "de-DE", fr: "fr-FR",
    ru: "ru-RU", uk: "uk-UA", es: "es-ES", pt: "pt-PT", br: "pt-BR",
    zh: "zh-CN", ja: "ja-JP",
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(localeMap[locale] || "en-US", {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="font-display text-xl font-bold text-foreground">
        {t("comments_title")} ({comments.length})
      </h3>

      {user ? (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder={t("comments_placeholder")}
            maxLength={500}
            className="flex-1 rounded-md border border-border bg-secondary/50 py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
          <button
            type="submit"
            disabled={submitting || !newComment.trim()}
            className="rounded-md gradient-primary px-4 py-2.5 text-primary-foreground transition-opacity disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">{t("comments_login_hint")}</p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("comments_none")}</p>
      ) : (
        <div className="space-y-3">
          {comments.map(comment => (
            <div key={comment.id} className="rounded-md border border-border bg-secondary/30 p-3">
              <div className="flex items-start justify-between gap-2">
                <Link to={`/user/${comment.user_id}`} className="flex items-center gap-2 mb-1 group">
                  <div className="h-7 w-7 rounded-full bg-secondary border border-border overflow-hidden flex items-center justify-center shrink-0 group-hover:border-primary/50 transition-colors">
                    {comment.profile?.avatar_url ? (
                      <img src={comment.profile.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {comment.profile?.nickname || t("comments_player")}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDate(comment.created_at)}</span>
                </Link>
                {user?.id === comment.user_id && (
                  <button onClick={() => handleDelete(comment.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                {user && user.id !== comment.user_id && (
                  <ReportDialog targetId={comment.id} reportType="comment" triggerClassName="text-muted-foreground hover:text-destructive transition-colors p-0.5" />
                )}
              </div>
              <p className="text-sm text-foreground/90 ml-9">{comment.content}</p>
              <div className="ml-9 mt-2">
                <StaffCommentReactions staffCommentId={comment.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StaffCommentSection;
