import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const REACTION_EMOJIS = [
  { type: "heart", emoji: "❤️" },
  { type: "thumbs_up", emoji: "👍" },
  { type: "thumbs_down", emoji: "👎" },
  { type: "laugh", emoji: "😂" },
  { type: "fire", emoji: "🔥" },
  { type: "sad", emoji: "😢" },
] as const;

type ReactionType = (typeof REACTION_EMOJIS)[number]["type"];

interface CommentReactionsProps {
  commentId: string;
}

const CommentReactions = ({ commentId }: CommentReactionsProps) => {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<Record<ReactionType, { count: number; userReacted: boolean }>>({
    heart: { count: 0, userReacted: false },
    thumbs_up: { count: 0, userReacted: false },
    thumbs_down: { count: 0, userReacted: false },
    laugh: { count: 0, userReacted: false },
    fire: { count: 0, userReacted: false },
    sad: { count: 0, userReacted: false },
  });

  const fetchReactions = async () => {
    const { data } = await supabase
      .from("reactions")
      .select("reaction, user_id")
      .eq("comment_id", commentId);

    if (data) {
      const counts: Record<string, { count: number; userReacted: boolean }> = {};
      REACTION_EMOJIS.forEach(({ type }) => {
        counts[type] = { count: 0, userReacted: false };
      });
      data.forEach((r: { reaction: string; user_id: string }) => {
        if (counts[r.reaction]) {
          counts[r.reaction].count++;
          if (user && r.user_id === user.id) {
            counts[r.reaction].userReacted = true;
          }
        }
      });
      setReactions(counts as typeof reactions);
    }
  };

  useEffect(() => {
    fetchReactions();
  }, [commentId, user]);

  const toggleReaction = async (type: ReactionType) => {
    if (!user) {
      toast.error("Prihlás sa pre reakcie");
      return;
    }

    const current = reactions[type];
    if (current.userReacted) {
      await supabase
        .from("reactions")
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", user.id)
        .eq("reaction", type);
    } else {
      await supabase.from("reactions").insert({
        comment_id: commentId,
        user_id: user.id,
        reaction: type,
      });
    }
    await fetchReactions();
  };

  return (
    <div className="flex flex-wrap gap-1">
      {REACTION_EMOJIS.map(({ type, emoji }) => {
        const r = reactions[type];
        return (
          <button
            key={type}
            onClick={() => toggleReaction(type)}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-all ${
              r.userReacted
                ? "bg-primary/20 border border-primary/40 text-primary"
                : "bg-secondary/50 border border-border text-muted-foreground hover:border-primary/30"
            }`}
          >
            <span>{emoji}</span>
            {r.count > 0 && <span>{r.count}</span>}
          </button>
        );
      })}
    </div>
  );
};

export default CommentReactions;
