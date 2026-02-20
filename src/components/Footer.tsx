import { Gamepad2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto px-4 py-10">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Link to="/" className="flex items-center gap-2 mb-3">
              <Gamepad2 className="h-6 w-6 text-primary" />
              <span className="font-display text-lg font-bold tracking-wider text-foreground">
                MC<span className="text-gradient">Servery</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">{t("footer_desc")}</p>
          </div>
          <div>
            <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground mb-3">{t("footer_nav")}</h4>
            <nav className="flex flex-col gap-2">
              <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("nav_home")}</Link>
              <Link to="/servers" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("nav_servers")}</Link>
              <Link to="/add-server" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("nav_add_server")}</Link>
            </nav>
          </div>
          <div>
            <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground mb-3">{t("footer_legal")}</h4>
            <nav className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground">{t("footer_terms")}</span>
              <span className="text-sm text-muted-foreground">{t("footer_privacy")}</span>
            </nav>
          </div>
          <div>
            <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground mb-3">{t("footer_contact")}</h4>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
              <span className="text-sm text-muted-foreground font-medium">slavo33_lol</span>
            </div>
          </div>
        </div>
        <div className="mt-10 border-t border-border pt-6 text-center">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} {t("footer_copyright")}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
