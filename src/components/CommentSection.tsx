import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Send, User, Trash2 } from "lucide-react";
import CommentReactions from "./CommentReactions";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: { nickname: string; avatar_url: string | null } | null;
}

interface CommentSectionProps {
  serverId: string;
}

const CommentSection = ({ serverId }: CommentSectionProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from("comments")
      .select("id, content, created_at, user_id, profiles(nickname, avatar_url)")
      .eq("server_id", serverId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setComments(data as unknown as Comment[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchComments();
  }, [serverId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Musíš sa prihlásiť na komentovanie");
      return;
    }
    if (!newComment.trim()) return;

    setSubmitting(true);
    const { error } = await supabase.from("comments").insert({
      server_id: serverId,
      user_id: user.id,
      content: newComment.trim(),
    });

    if (error) {
      toast.error("Chyba pri pridávaní komentára");
    } else {
      setNewComment("");
      await fetchComments();
    }
    setSubmitting(false);
  };

  const handleDelete = async (commentId: string) => {
    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (!error) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      toast.success("Komentár vymazaný");
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("sk-SK", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-4">
      <h3 className="font-display text-xl font-bold text-foreground">
        Komentáre ({comments.length})
      </h3>

      {/* New comment form */}
      {user ? (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Napíš komentár..."
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
        <p className="text-sm text-muted-foreground">Prihlás sa pre komentovanie</p>
      )}

      {/* Comments list */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Načítavam...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Žiadne komentáre. Buď prvý!</p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-md border border-border bg-secondary/30 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-7 w-7 rounded-full bg-secondary border border-border overflow-hidden flex items-center justify-center shrink-0">
                    {comment.profiles?.avatar_url ? (
                      <img src={comment.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {comment.profiles?.nickname || "Hráč"}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDate(comment.created_at)}</span>
                </div>
                {user?.id === comment.user_id && (
                  <button onClick={() => handleDelete(comment.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <p className="text-sm text-foreground/90 ml-9">{comment.content}</p>
              <div className="ml-9 mt-2">
                <CommentReactions commentId={comment.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentSection;
