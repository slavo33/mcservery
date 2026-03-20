import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Globe, MessageSquare, Trash2, EyeOff, Eye, Flag, Pencil, Crown, Heart } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ServerImageUpload from "@/components/ServerImageUpload";
import StaffCommentSection from "@/components/StaffCommentSection";
import ReportDialog from "@/components/ReportDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { sanitizeHref } from "@/lib/urlValidation";
import { toast } from "sonner";

interface StaffPost {
  id: string;
  server_id: string;
  owner_id: string;
  position: string;
  description: string;
  requirements: string;
  server_ip: string;
  discord_url: string | null;
  website_url: string | null;
  images: string[];
  is_active: boolean;
  created_at: string;
  likes_count: number;
}

const StaffPostDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { t, locale } = useLanguage();
  const [post, setPost] = useState<StaffPost | null>(null);
  const [serverName, setServerName] = useState("");
  const [serverSlug, setServerSlug] = useState("");
  const [ownerNickname, setOwnerNickname] = useState("");
  const [ownerAvatar, setOwnerAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVip, setIsVip] = useState(false);
  const [likedByMe, setLikedByMe] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [editPosition, setEditPosition] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editRequirements, setEditRequirements] = useState("");
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const POSITION_OPTIONS = [
    "Builder", "Helper", "Moderátor", "Admin", "Developer",
    "Eventer", "Designer", "Content Creator", "Tester", "Support"
  ];

  useEffect(() => {
    const fetchPost = async () => {
      if (!id) return;
      const { data } = await supabase
        .from("staff_posts")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (!data) {
        setLoading(false);
        return;
      }

      setPost(data);
      setLikesCount((data as any).likes_count || 0);

      const [serverRes, profileRes] = await Promise.all([
        supabase.from("servers").select("name, slug, vip_expires_at").eq("id", data.server_id).maybeSingle(),
        supabase.from("profiles").select("nickname, avatar_url").eq("id", data.owner_id).maybeSingle(),
      ]);

      setServerName(serverRes.data?.name || "Unknown");
      setServerSlug(serverRes.data?.slug || "");
      setIsVip(serverRes.data?.vip_expires_at ? new Date(serverRes.data.vip_expires_at) > new Date() : false);
      setOwnerNickname(profileRes.data?.nickname || "Unknown");
      setOwnerAvatar(profileRes.data?.avatar_url || null);
      setLoading(false);
    };
    fetchPost();
  }, [id]);

  // Check if current user liked this post
  useEffect(() => {
    if (!user || !id) return;
    supabase.from("staff_post_likes").select("id").eq("staff_post_id", id).eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setLikedByMe(!!data));
  }, [user, id]);

  const toggleLike = async () => {
    if (!user || !post) {
      toast.error(t("staff_login_required"));
      return;
    }
    if (likedByMe) {
      await supabase.from("staff_post_likes").delete().eq("staff_post_id", post.id).eq("user_id", user.id);
      setLikedByMe(false);
      setLikesCount(prev => prev - 1);
    } else {
      await supabase.from("staff_post_likes").insert({ staff_post_id: post.id, user_id: user.id });
      setLikedByMe(true);
      setLikesCount(prev => prev + 1);
    }
  };

  const handleDelete = async () => {
    if (!post) return;
    const { error } = await supabase.from("staff_posts").delete().eq("id", post.id);
    if (!error) {
      toast.success(t("staff_deleted"));
      navigate("/staff");
    }
  };

  const toggleActive = async () => {
    if (!post) return;
    const { error } = await supabase
      .from("staff_posts")
      .update({ is_active: !post.is_active })
      .eq("id", post.id);
    if (!error) {
      toast.success(post.is_active ? t("staff_closed") : t("staff_reopened"));
      setPost({ ...post, is_active: !post.is_active });
    }
  };

  const openEdit = () => {
    if (!post) return;
    setEditPosition(POSITION_OPTIONS.includes(post.position) ? post.position : "custom");
    setEditDescription(post.description);
    setEditRequirements(post.requirements);
    setEditImages(post.images);
    setEditOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!post) return;
    setEditSubmitting(true);
    const { error } = await supabase
      .from("staff_posts")
      .update({
        position: editPosition,
        description: editDescription,
        requirements: editRequirements,
        images: editImages,
      })
      .eq("id", post.id);
    if (error) {
      toast.error(t("staff_error"));
    } else {
      toast.success(t("staff_success"));
      setPost({ ...post, position: editPosition, description: editDescription, requirements: editRequirements, images: editImages });
      setEditOpen(false);
    }
    setEditSubmitting(false);
  };

  const localeMap: Record<string, string> = {
    sk: "sk-SK", cs: "cs-CZ", en: "en-US", de: "de-DE", fr: "fr-FR",
    ru: "ru-RU", uk: "uk-UA", es: "es-ES", pt: "pt-PT", br: "pt-BR",
    zh: "zh-CN", ja: "ja-JP",
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(localeMap[locale] || "en-US", {
      day: "numeric", month: "long", year: "numeric",
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">{t("detail_not_found")}</p>
          <Link to="/staff" className="text-primary hover:underline mt-4 inline-block">{t("detail_back")}</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const isOwner = user?.id === post.owner_id;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Back link */}
        <Link to="/staff" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" />
          {t("detail_back")}
        </Link>

        {/* Hero image gallery */}
        {post.images.length > 0 && (
          <div className="mb-6 space-y-2">
            <div className="rounded-lg overflow-hidden aspect-video">
              <img src={post.images[0]} alt="" className="w-full h-full object-cover" />
            </div>
            {post.images.length > 1 && (
              <div className="grid grid-cols-3 gap-2">
                {post.images.slice(1).map((img, i) => (
                  <div key={i} className="rounded-md overflow-hidden aspect-video">
                    <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Post header */}
        <div className="mb-6 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-primary/15 text-primary border-primary/25 text-sm">
              {post.position}
            </Badge>
            {!post.is_active && (
              <Badge variant="secondary">{t("staff_closed")}</Badge>
            )}
          </div>

          <Link to={serverSlug ? `/server/${serverSlug}` : '#'} className="block text-2xl sm:text-3xl font-bold text-foreground hover:text-primary transition-colors">
            {serverName}
          </Link>
          <p className="text-sm text-muted-foreground font-mono">{post.server_ip}</p>

          {/* Author + date */}
          <div className="flex items-center gap-3 mt-4">
            <Link to={`/user/${post.owner_id}`} className="flex items-center gap-2 group">
              <div className="h-8 w-8 rounded-full bg-secondary border border-border overflow-hidden flex items-center justify-center group-hover:border-primary/50 transition-colors">
                {ownerAvatar ? (
                  <img src={ownerAvatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Users className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                {ownerNickname}
              </span>
            </Link>
            <span className="text-xs text-muted-foreground">{formatDate(post.created_at)}</span>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 mt-4">
            {(isOwner || isAdmin) && (
              <>
                <Button size="sm" variant="outline" onClick={openEdit} className="gap-1.5" title={t("edit_server") || "Upraviť"}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={toggleActive} className="gap-1.5">
                  {post.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {post.is_active ? t("staff_close") : t("staff_reopen")}
                </Button>
                <Button size="sm" variant="destructive" onClick={handleDelete} className="gap-1.5">
                  <Trash2 className="h-4 w-4" />
                  {t("staff_delete")}
                </Button>
              </>
            )}
            {user && (
              <ReportDialog
                targetId={post.id}
                reportType="staff_post"
                triggerClassName="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive transition-colors border border-border rounded-md px-3 py-1.5"
              />
            )}
          </div>
        </div>

        {/* Description */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-foreground mb-2">{t("staff_description")}</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{post.description}</p>
        </div>

        {/* Requirements */}
        {post.requirements && (
          <div className="mb-6 bg-secondary/50 rounded-lg p-4">
            <h2 className="text-lg font-bold text-foreground mb-2">{t("staff_requirements")}</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{post.requirements}</p>
          </div>
        )}

        {/* Social links */}
        {(post.discord_url || post.website_url) && (
          <div className="flex items-center gap-3 mb-8">
            {post.discord_url && (
              <a
                href={sanitizeHref(post.discord_url)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors border border-border rounded-md px-3 py-1.5"
              >
                <MessageSquare className="h-4 w-4" /> Discord
              </a>
            )}
            {post.website_url && (
              <a
                href={sanitizeHref(post.website_url)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors border border-border rounded-md px-3 py-1.5"
              >
                <Globe className="h-4 w-4" /> Web
              </a>
            )}
          </div>
        )}

        {/* Edit dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("edit_server") || "Upraviť inzerát"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>{t("staff_position")}</Label>
                <Select value={editPosition} onValueChange={setEditPosition}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {POSITION_OPTIONS.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("staff_description")}</Label>
                <Textarea className="mt-1" value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={4} maxLength={2000} />
              </div>
              <div>
                <Label>{t("staff_requirements")}</Label>
                <Textarea className="mt-1" value={editRequirements} onChange={e => setEditRequirements(e.target.value)} rows={3} maxLength={1000} />
              </div>
              <ServerImageUpload images={editImages} onImagesChange={setEditImages} maxImages={3} />
              <Button onClick={handleEditSubmit} disabled={editSubmitting} className="w-full gradient-primary border-0">
                {editSubmitting ? t("staff_submitting") : (t("save_changes") || "Uložiť")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Comments */}
        <div className="border-t border-border pt-6">
          <StaffCommentSection staffPostId={post.id} />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default StaffPostDetail;
