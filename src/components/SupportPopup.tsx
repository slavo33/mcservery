import { useState, useEffect } from "react";
import { X, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";

const STORAGE_KEY = "mcservery_support_popup_dismissed";

const SupportPopup = () => {
  const [visible, setVisible] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      const timer = setTimeout(() => setVisible(true), 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "1");
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={dismiss} />
      <div className="relative w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-2xl animate-in zoom-in-95 duration-300">
        <button
          onClick={dismiss}
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center text-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Heart className="h-7 w-7 text-primary" />
          </div>

          <div>
            <h3 className="font-display text-xl font-bold text-foreground mb-1">
              {t("support_popup_title")}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("support_popup_desc")}
            </p>
          </div>

          <div className="flex w-full flex-col gap-2">
            <a href="https://ko-fi.com/slavo33" target="_blank" rel="noopener noreferrer" className="w-full">
              <Button className="w-full gradient-primary border-0 font-display font-semibold tracking-wide text-primary-foreground">
                ☕ {t("support_popup_btn")}
              </Button>
            </a>
            <button
              onClick={dismiss}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              {t("support_popup_close")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportPopup;
