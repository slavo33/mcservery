import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success(t("auth_login_success"));
        navigate("/");
      }
    } else {
      if (!nickname.trim()) {
        toast.error(t("auth_nickname_required"));
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { nickname: nickname.trim() },
        },
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success(t("auth_register_success"));
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md gradient-card rounded-lg border border-border shadow-card p-8">
          <h1 className="font-display text-3xl font-bold text-foreground text-center mb-2">
            {isLogin ? t("auth_login_title") : t("auth_register_title")}
          </h1>
          <p className="text-sm text-muted-foreground text-center mb-6">
            {isLogin ? t("auth_login_subtitle") : t("auth_register_subtitle")}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">{t("auth_nickname")}</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="SteveMinecraft"
                  className="w-full rounded-md border border-border bg-secondary/50 py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  required={!isLogin}
                  maxLength={30}
                />
              </div>
            )}
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">{t("auth_email")}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="player@minecraft.com"
                className="w-full rounded-md border border-border bg-secondary/50 py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                required
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">{t("auth_password")}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-md border border-border bg-secondary/50 py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                required
                minLength={6}
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full gradient-primary border-0 font-display text-base font-semibold tracking-wide text-primary-foreground glow-red"
              size="lg"
            >
              {loading ? t("loading") : isLogin ? t("auth_submit_login") : t("auth_submit_register")}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            {isLogin ? t("auth_no_account") : t("auth_has_account")}{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline font-medium"
            >
              {isLogin ? t("auth_switch_register") : t("auth_switch_login")}
            </button>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Auth;
