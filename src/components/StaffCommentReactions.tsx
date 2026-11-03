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

const StaffCommentReactions = ({ staffCommentId }: { staffCommentId: string }) => {
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
      .from("staff_reactions")
      .select("reaction, user_id")
      .eq("staff_comment_id", staffCommentId);

    if (data) {
      const counts: Record<string, { count: number; userReacted: boolean }> = {};
      REACTION_EMOJIS.forEach(({ type }) => {
        counts[type] = { count: 0, userReacted: false };
      });
      data.forEach((r) => {
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

  useEffect(() => { fetchReactions(); }, [staffCommentId, user]);

  const toggleReaction = async (type: ReactionType) => {
    if (!user) {
      toast.error("Prihlás sa pre reakcie");
      return;
    }

    const current = reactions[type];
    if (current.userReacted) {
      await supabase.from("staff_reactions")
        .delete()
        .eq("staff_comment_id", staffCommentId)
        .eq("user_id", user.id)
        .eq("reaction", type);
    } else {
      await supabase.from("staff_reactions").insert({
        staff_comment_id: staffCommentId,
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

export default StaffCommentReactions;
