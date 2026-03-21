import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Gamepad2, User, LogOut, Shield, Crown, Users, Terminal } from "lucide-react";
import BugReportDialog from "@/components/BugReportDialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { supabase } from "@/integrations/supabase/client";

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, profile, signOut, isAdmin } = useAuth();
  const { t } = useLanguage();
  const [hasVipServer, setHasVipServer] = useState(false);

  useEffect(() => {
    if (!user || isAdmin) return;
    supabase
      .from("servers")
      .select("id, vip_expires_at")
      .eq("owner_id", user.id)
      .then(({ data }) => {
        const hasVip = data?.some((s) => s.vip_expires_at && new Date(s.vip_expires_at) > new Date()) ?? false;
        setHasVipServer(hasVip);
      });
  }, [user, isAdmin]);

  const showConsole = isAdmin || hasVipServer;

  const navItems = [
    { label: t("nav_home"), to: "/" },
    { label: t("nav_servers"), to: "/servers" },
    { label: t("nav_add_server"), to: "/add-server" },
    { label: t("nav_staff"), to: "/staff", icon: Users },
    { label: t("nav_vip"), to: "/vip", isVip: true },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 group">
          <Gamepad2 className="h-7 w-7 text-primary transition-transform duration-300 group-hover:rotate-12" />
          <span className="font-display text-xl font-bold tracking-wider text-foreground">
            MC<span className="text-gradient">Servery</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item: any) => (
            <Link
              key={item.to}
              to={item.to}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${item.isVip ? "text-amber-400 hover:bg-amber-500/10 font-bold" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
            >
              {item.isVip && <Crown className="h-4 w-4" />}
              {item.icon && <item.icon className="h-4 w-4" />}
              {item.label}
            </Link>
          ))}
          <LanguageSwitcher />
          {user ? (
            <div className="ml-2 flex items-center gap-2">
              {isAdmin && (
                <Link to="/admin" className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-primary hover:bg-secondary transition-colors">
                  <Shield className="h-4 w-4" />
                  <span>{t("nav_admin_panel")}</span>
                </Link>
              )}
              {showConsole && (
                <Link to="/console" className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-amber-400 hover:bg-amber-500/10 transition-colors font-medium">
                  <Terminal className="h-4 w-4" />
                  <span>Console</span>
                </Link>
              )}
              <Link to="/profile" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                <div className="h-6 w-6 rounded-full bg-secondary border border-border overflow-hidden flex items-center justify-center">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                <span>{profile?.nickname || t("nav_profile")}</span>
              </Link>
              <BugReportDialog />
              <button
                onClick={signOut}
                className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                title={t("nav_logout")}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link to="/auth">
              <Button className="ml-4 gradient-primary border-0 font-display text-sm font-semibold tracking-wide text-primary-foreground">
                {t("nav_login")}
              </Button>
            </Link>
          )}
        </nav>

        {/* Mobile: language + toggle */}
        <div className="flex items-center gap-1 md:hidden">
          <LanguageSwitcher />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-foreground"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="border-t border-border bg-background px-4 pb-4 md:hidden animate-slide-up">
          <nav className="flex flex-col gap-1 pt-2">
            {navItems.map((item: any) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`rounded-md px-4 py-3 text-sm font-medium transition-colors flex items-center gap-1.5 ${item.isVip ? "text-amber-400 hover:bg-amber-500/10 font-bold" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
              >
                {item.isVip && <Crown className="h-4 w-4" />}
                {item.icon && <item.icon className="h-4 w-4" />}
                {item.label}
              </Link>
            ))}
            {user ? (
              <>
                {isAdmin && (
                  <Link to="/admin" onClick={() => setMobileOpen(false)} className="rounded-md px-4 py-3 text-sm font-medium text-primary hover:bg-secondary flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    {t("nav_admin_panel")}
                  </Link>
                )}
                {showConsole && (
                  <Link to="/console" onClick={() => setMobileOpen(false)} className="rounded-md px-4 py-3 text-sm font-medium text-amber-400 hover:bg-amber-500/10 flex items-center gap-2">
                    <Terminal className="h-4 w-4" />
                    Console
                  </Link>
                )}
                <BugReportDialog mobile />
                <Link to="/profile" onClick={() => setMobileOpen(false)} className="rounded-md px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
                  {t("nav_profile")}
                </Link>
                <button
                  onClick={() => { signOut(); setMobileOpen(false); }}
                  className="rounded-md px-4 py-3 text-left text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  {t("nav_logout")}
                </button>
              </>
            ) : (
              <Link to="/auth" onClick={() => setMobileOpen(false)}>
                <Button className="mt-2 w-full gradient-primary border-0 font-display text-sm font-semibold tracking-wide text-primary-foreground">
                  {t("nav_login")}
                </Button>
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
