import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Gamepad2, User, LogOut, Shield, Crown } from "lucide-react";
import BugReportDialog from "@/components/BugReportDialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, profile, signOut, isAdmin } = useAuth();
  const { t } = useLanguage();

  const navItems = [
    { label: t("nav_home"), to: "/" },
    { label: t("nav_servers"), to: "/servers" },
    { label: t("nav_add_server"), to: "/add-server" },
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
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${item.isVip ? "text-amber-400 hover:bg-amber-500/10 flex items-center gap-1.5 font-bold" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
            >
              {item.isVip && <Crown className="h-4 w-4" />}
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
                className={`rounded-md px-4 py-3 text-sm font-medium transition-colors ${item.isVip ? "text-amber-400 hover:bg-amber-500/10 flex items-center gap-1.5 font-bold" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
              >
                {item.isVip && <Crown className="h-4 w-4" />}
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
                <BugReportDialog />
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
