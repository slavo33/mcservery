import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Users, Plus, Trash2, Eye, EyeOff, RefreshCw, ExternalLink, Globe, MessageSquare, Crown, Heart } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import ServerImageUpload from "@/components/ServerImageUpload";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";
import { sanitizeHref } from "@/lib/urlValidation";

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
  server_name?: string;
  owner_nickname?: string;
  owner_avatar?: string | null;
  is_vip?: boolean;
  liked_by_me?: boolean;
}

const POSITION_OPTIONS = [
  "Builder", "Helper", "Moderátor", "Admin", "Developer",
  "Eventer", "Designer", "Content Creator", "Tester", "Support"
];

const StaffRecruitment = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [posts, setPosts] = useState<StaffPost[]>([]);
  const [myServers, setMyServers] = useState<{ id: string; name: string; ip: string; discord_url: string | null; website_url: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showMyPosts, setShowMyPosts] = useState(false);
  const [filterPosition, setFilterPosition] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "most_liked" | "vip_first">("newest");
  const [filterVip, setFilterVip] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedServer, setSelectedServer] = useState("");
  const [position, setPosition] = useState("");
  const [customPosition, setCustomPosition] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [images, setImages] = useState<string[]>([]);

  const fetchPosts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("staff_posts")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      const serverIds = [...new Set(data.map(p => p.server_id))];
      const ownerIds = [...new Set(data.map(p => p.owner_id))];
      const postIds = data.map(p => p.id);

      const serversRes = await supabase.from("servers").select("id, name, vip_expires_at").in("id", serverIds);
      const profilesRes = await supabase.from("profiles").select("id, nickname, avatar_url").in("id", ownerIds);
      let myLikesRes: { data: any[] | null } = { data: null };
      if (user) {
        myLikesRes = await supabase.from("staff_post_likes").select("staff_post_id").eq("user_id", user.id).in("staff_post_id", postIds);
      }

      const serverMap = new Map(serversRes.data?.map((s: any) => [s.id, { name: s.name, is_vip: s.vip_expires_at ? new Date(s.vip_expires_at) > new Date() : false }]) || []);
      const profileMap = new Map(profilesRes.data?.map((p: any) => [p.id, p]) || []);
      const myLikedIds = new Set(myLikesRes?.data?.map((l: any) => l.staff_post_id) || []);

      setPosts(data.map(p => ({
        ...p,
        likes_count: (p as any).likes_count || 0,
        server_name: serverMap.get(p.server_id)?.name || "Unknown",
        is_vip: serverMap.get(p.server_id)?.is_vip || false,
        owner_nickname: profileMap.get(p.owner_id)?.nickname || "Unknown",
        owner_avatar: profileMap.get(p.owner_id)?.avatar_url,
        liked_by_me: myLikedIds.has(p.id),
      })));
    } else {
      setPosts([]);
    }
    setLoading(false);
  };

  const fetchMyServers = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("servers")
      .select("id, name, ip, discord_url, website_url")
      .eq("owner_id", user.id);
    setMyServers(data || []);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    if (user) fetchMyServers();
  }, [user]);

  const handleSubmit = async () => {
    if (!user) return;
    const finalPosition = position === "custom" ? customPosition : position;
    if (!selectedServer || !finalPosition || !description) {
      toast.error("Vyplňte všetky povinné polia");
      return;
    }

    const server = myServers.find(s => s.id === selectedServer);
    if (!server) return;

    setSubmitting(true);
    const { error } = await supabase.from("staff_posts").insert({
      server_id: selectedServer,
      owner_id: user.id,
      position: finalPosition,
      description,
      requirements,
      server_ip: server.ip,
      discord_url: server.discord_url,
      website_url: server.website_url,
      images,
    });

    if (error) {
      toast.error(t("staff_error"));
    } else {
      toast.success(t("staff_success"));
      setDialogOpen(false);
      resetForm();
      fetchPosts();
    }
    setSubmitting(false);
  };

  const resetForm = () => {
    setSelectedServer("");
    setPosition("");
    setCustomPosition("");
    setDescription("");
    setRequirements("");
    setImages([]);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("staff_posts").delete().eq("id", id);
    if (!error) {
      toast.success(t("staff_deleted"));
      fetchPosts();
    }
  };

  const toggleLike = async (e: React.MouseEvent, postId: string, currentlyLiked: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error(t("staff_login_required"));
      return;
    }
    if (currentlyLiked) {
      await supabase.from("staff_post_likes").delete().eq("staff_post_id", postId).eq("user_id", user.id);
    } else {
      await supabase.from("staff_post_likes").insert({ staff_post_id: postId, user_id: user.id });
    }
    // Optimistic update
    setPosts(prev => prev.map(p => p.id === postId ? {
      ...p,
      liked_by_me: !currentlyLiked,
      likes_count: p.likes_count + (currentlyLiked ? -1 : 1),
    } : p));
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    const { error } = await supabase
      .from("staff_posts")
      .update({ is_active: !currentActive })
      .eq("id", id);
    if (!error) {
      toast.success(currentActive ? t("staff_closed") : t("staff_reopened"));
      fetchPosts();
    }
  };

  const positionCounts = posts.reduce((acc, p) => {
    acc[p.position] = (acc[p.position] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const availablePositions = [...new Set([...POSITION_OPTIONS, ...posts.map(p => p.position)])].sort();

  const q = searchQuery.toLowerCase().trim();
  const displayedPosts = posts
    .filter(p => !showMyPosts || !user || p.owner_id === user.id)
    .filter(p => filterPosition === "all" || p.position === filterPosition)
    .filter(p => !filterVip || p.is_vip)
    .filter(p => !q || (p.server_name?.toLowerCase().includes(q) || p.server_ip.toLowerCase().includes(q)))
    .sort((a, b) => {
      // VIP always first when sorting by vip_first
      if (sortOrder === "vip_first") {
        if (a.is_vip && !b.is_vip) return -1;
        if (!a.is_vip && b.is_vip) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortOrder === "most_liked") {
        return (b.server_likes_count || 0) - (a.server_likes_count || 0);
      }
      return sortOrder === "newest"
        ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        : new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Title */}
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            {t("staff_title_1")}{" "}
            <span className="text-gradient">{t("staff_title_2")}</span>
          </h1>
          <p className="mt-2 text-muted-foreground">{t("staff_subtitle")}</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <Input
            placeholder={t("filter_search_placeholder")}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as typeof sortOrder)}>
            <SelectTrigger className="sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t("staff_sort_newest")}</SelectItem>
              <SelectItem value="oldest">{t("staff_sort_oldest")}</SelectItem>
              <SelectItem value="most_liked">{t("staff_sort_most_liked")}</SelectItem>
              <SelectItem value="vip_first">{t("staff_sort_vip_first")}</SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={() => setFilterVip(!filterVip)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 ${filterVip ? "bg-yellow-500/20 text-yellow-600 border border-yellow-500/30" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
          >
            <Crown className="h-3 w-3" /> VIP
          </button>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {/* Position filter chips */}
          {availablePositions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 w-full mb-2">
              <button
                onClick={() => setFilterPosition("all")}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterPosition === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
              >
                {t("filter_all")} ({posts.length})
              </button>
              {availablePositions.map(pos => (
                <button
                  key={pos}
                  onClick={() => setFilterPosition(pos)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterPosition === pos ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
                >
                  {pos} ({positionCounts[pos] || 0})
                </button>
              ))}
            </div>
          )}
          {user && myServers.length > 0 && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary border-0 gap-2">
                  <Plus className="h-4 w-4" />
                  {t("staff_create")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t("staff_create_title")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  {/* Server select */}
                  <div>
                    <Label>{t("staff_server")}</Label>
                    <Select value={selectedServer} onValueChange={setSelectedServer}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={t("vip_select_server")} />
                      </SelectTrigger>
                      <SelectContent>
                        {myServers.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name} ({s.ip})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Position */}
                  <div>
                    <Label>{t("staff_position")}</Label>
                    <Select value={position} onValueChange={setPosition}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={t("staff_position_placeholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {POSITION_OPTIONS.map(p => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                        <SelectItem value="custom">Iná pozícia...</SelectItem>
                      </SelectContent>
                    </Select>
                    {position === "custom" && (
                      <Input
                        className="mt-2"
                        placeholder={t("staff_position_placeholder")}
                        value={customPosition}
                        onChange={e => setCustomPosition(e.target.value)}
                        maxLength={50}
                      />
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <Label>{t("staff_description")}</Label>
                    <Textarea
                      className="mt-1"
                      placeholder={t("staff_description_placeholder")}
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      rows={4}
                      maxLength={2000}
                    />
                  </div>

                  {/* Requirements */}
                  <div>
                    <Label>{t("staff_requirements")}</Label>
                    <Textarea
                      className="mt-1"
                      placeholder={t("staff_requirements_placeholder")}
                      value={requirements}
                      onChange={e => setRequirements(e.target.value)}
                      rows={3}
                      maxLength={1000}
                    />
                  </div>

                  {/* Images */}
                  <ServerImageUpload
                    images={images}
                    onImagesChange={setImages}
                    maxImages={3}
                  />

                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full gradient-primary border-0"
                  >
                    {submitting ? t("staff_submitting") : t("staff_submit")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {user && myServers.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("staff_no_servers")}</p>
          )}

          {!user && (
            <Link to="/auth">
              <Button variant="outline">{t("staff_login_required")}</Button>
            </Link>
          )}

          {user && (
            <Button
              variant={showMyPosts ? "default" : "outline"}
              size="sm"
              onClick={() => setShowMyPosts(!showMyPosts)}
            >
              {t("staff_my_posts")}
            </Button>
          )}
        </div>

        {/* Posts grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : displayedPosts.length === 0 ? (
          <div className="text-center py-16">
            <Users className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">{t("staff_none")}</p>
            <p className="text-sm text-muted-foreground/60 mt-1">{t("staff_none_hint")}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {displayedPosts.map(post => (
              <Link key={post.id} to={`/staff/${post.id}`} className="block">
              <Card className={`overflow-hidden transition-colors cursor-pointer ${post.is_vip ? "border-yellow-500/40 hover:border-yellow-500/60 ring-1 ring-yellow-500/10" : "border-border/60 hover:border-primary/30"}`}>
                {/* Image banner */}
                {post.images.length > 0 && (
                  <div className="aspect-[2.5/1] overflow-hidden">
                    <img
                      src={post.images[0]}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}

                <CardContent className="p-4 space-y-3">
                  {/* Position badge + server */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge className="bg-primary/15 text-primary border-primary/25">
                        {post.position}
                      </Badge>
                      {post.is_vip && (
                        <Badge className="bg-yellow-500/15 text-yellow-600 border-yellow-500/25 gap-1">
                          <Crown className="h-3 w-3" /> VIP
                        </Badge>
                      )}
                    </div>
                    <p className="text-lg font-bold text-foreground leading-tight">
                      {post.server_name}
                    </p>
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-muted-foreground font-mono">{post.server_ip}</p>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Heart className="h-3 w-3" /> {post.server_likes_count || 0}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-4">{post.description}</p>

                  {/* Requirements */}
                  {post.requirements && (
                    <div className="bg-secondary/50 rounded-md p-2.5">
                      <p className="text-xs font-semibold text-foreground mb-1">{t("staff_requirements")}</p>
                      <p className="text-xs text-muted-foreground whitespace-pre-line">{post.requirements}</p>
                    </div>
                  )}

                  {/* Social links */}
                  <div className="flex items-center gap-2 flex-wrap" onClick={e => e.preventDefault()}>
                    {post.discord_url && (
                      <a
                        href={sanitizeHref(post.discord_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <MessageSquare className="h-3.5 w-3.5" /> Discord
                      </a>
                    )}
                    {post.website_url && (
                      <a
                        href={sanitizeHref(post.website_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Globe className="h-3.5 w-3.5" /> Web
                      </a>
                    )}
                  </div>

                  {/* Footer: author + actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-secondary border border-border overflow-hidden flex items-center justify-center">
                        {post.owner_avatar ? (
                          <img src={post.owner_avatar} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Users className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{post.owner_nickname}</span>
                      <span className="text-xs text-muted-foreground/50">·</span>
                      <span className="text-xs text-muted-foreground/50">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {user?.id === post.owner_id && (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleActive(post.id, post.is_active); }}
                        >
                          {post.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(post.id); }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default StaffRecruitment;
