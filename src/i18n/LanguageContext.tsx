import { createContext, useContext, useState, type ReactNode } from "react";
import { translations, type Locale } from "./translations";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}


const LanguageContext = createContext<LanguageContextType | null>(null);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem("mc_locale");
    return (saved as Locale) || "sk";
  });

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("mc_locale", l);
  };

  const t = (key: string): string => {
    return (translations[locale] as any)?.[key] || (translations.sk as any)?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

const fallback: LanguageContextType = {
  locale: "sk",
  setLocale: () => {},
  t: (key: string) => (translations.sk as any)?.[key] || key,
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  return ctx ?? fallback;
};
