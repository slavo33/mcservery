import { useState, useEffect } from "react";
import { X, Heart } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const STORAGE_KEY = "mcservery_support_popup_dismissed";

const SupportPopup = () => {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {expanded && (
        <div className="w-72 rounded-xl border border-border bg-background p-4 shadow-xl animate-in slide-in-from-bottom-2 fade-in duration-200">
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-display text-sm font-bold text-foreground">
              {t("support_popup_title")}
            </h4>
            <button
              onClick={dismiss}
              className="rounded-md p-0.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            {t("support_popup_desc")}
          </p>
          <a
            href="https://ko-fi.com/slavo33"
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-1.5 rounded-lg gradient-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            ☕ {t("support_popup_btn")}
          </a>
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="flex h-12 w-12 items-center justify-center rounded-full gradient-primary shadow-lg text-primary-foreground transition-transform hover:scale-110 active:scale-95"
        title={t("support_popup_title")}
      >
        <Heart className="h-5 w-5" fill="currentColor" />
      </button>
    </div>
  );
};

export default SupportPopup;
