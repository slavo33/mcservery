import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ServerCard from "@/components/ServerCard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Camera, User, Heart, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import type { MinecraftServer } from "@/lib/mockData";

const Profile = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { t } = useLanguage();
  const [nickname, setNickname] = useState(profile?.nickname || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"settings" | "favorites">("settings");
  const [likedServers, setLikedServers] = useState<(MinecraftServer & { dbId: string; is_warez: boolean; has_whitelist: boolean })[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (tab !== "favorites" || !user) return;
    const fetchLiked = async () => {
      setLoadingFavorites(true);
      const { data: likes } = await supabase
        .from("server_likes")
        .select("server_id")
        .eq("user_id", user.id);

      if (likes && likes.length > 0) {
        const ids = likes.map((l) => l.server_id);
        const { data: servers } = await supabase
          .from("servers")
          .select("*")
          .in("id", ids);

        if (servers) {
          setLikedServers(
            servers.map((s: any) => ({
              id: s.id,
              dbId: s.id,
              name: s.name,
              description: s.description,
              ip: s.ip,
              image: "",
              players: { online: 0, max: s.max_players },
              version: s.version,
              platform: s.platform as ("java" | "bedrock")[],
              proxy: s.proxy || undefined,
              software: s.software,
              minigames: s.minigames,
              likes: s.likes_count,
              tags: s.tags,
              isOnline: true,
              is_warez: s.is_warez,
              has_whitelist: s.has_whitelist,
            }))
          );
        }
      } else {
        setLikedServers([]);
      }
      setLoadingFavorites(false);
    };
    fetchLiked();
  }, [tab, user]);

  if (!user) {
    navigate("/auth");
    return null;
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("profile_avatar_too_large"));
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast.error(t("profile_avatar_error") + ": " + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);

    if (updateError) {
      toast.error(t("profile_save_error"));
    } else {
      toast.success(t("profile_avatar_success"));
      await refreshProfile();
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!nickname.trim()) {
      toast.error(t("profile_nickname_empty"));
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ nickname: nickname.trim(), bio: bio.trim() })
      .eq("id", user.id);

    if (error) {
      toast.error(t("profile_save_error"));
    } else {
      toast.success(t("profile_save_success"));
      await refreshProfile();
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-10 max-w-lg">
        <h1 className="font-display text-4xl font-bold text-foreground mb-8">
          {t("profile_title_1")} <span className="text-gradient">{t("profile_title_2")}</span>
        </h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab("settings")}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === "settings"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/50 text-muted-foreground hover:text-foreground border border-border"
            }`}
          >
            <Settings className="h-4 w-4" />
            {t("profile_tab_settings")}
          </button>
          <button
            onClick={() => setTab("favorites")}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === "favorites"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/50 text-muted-foreground hover:text-foreground border border-border"
            }`}
          >
            <Heart className="h-4 w-4" />
            {t("profile_tab_favorites")}
          </button>
        </div>

        {tab === "settings" && (
          <div className="gradient-card rounded-lg border border-border shadow-card p-6 space-y-6">
            {/* Avatar */}
            <div className="flex flex-col items-center">
              <div className="relative group">
                <div className="h-24 w-24 rounded-full bg-secondary border-2 border-border overflow-hidden flex items-center justify-center">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
                <label className="absolute inset-0 rounded-full flex items-center justify-center bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="h-6 w-6 text-foreground" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {uploading ? t("profile_uploading") : t("profile_avatar_hint")}
              </p>
            </div>

            {/* Nickname */}
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">{t("profile_nickname")}</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={30}
                className="w-full rounded-md border border-border bg-secondary/50 py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">{t("profile_bio")}</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={200}
                rows={3}
                placeholder={t("profile_bio_placeholder")}
                className="w-full rounded-md border border-border bg-secondary/50 py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
              />
            </div>

            {/* Email */}
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">{t("profile_email")}</label>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full gradient-primary border-0 font-display text-base font-semibold tracking-wide text-primary-foreground"
              size="lg"
            >
              {saving ? t("profile_saving") : t("profile_save")}
            </Button>
          </div>
        )}

        {tab === "favorites" && (
          <div>
            {loadingFavorites ? (
              <p className="text-muted-foreground text-sm">{t("loading")}</p>
            ) : likedServers.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2">
                {likedServers.map((server) => (
                  <ServerCard key={server.id} server={server} dbMode dbId={server.dbId} />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">{t("profile_favorites_empty")}</p>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
