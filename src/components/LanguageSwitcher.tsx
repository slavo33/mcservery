import { useLanguage } from "@/i18n/LanguageContext";
import { localeNames, localeFlags, type Locale } from "@/i18n/translations";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LanguageSwitcher = () => {
  const { locale, setLocale } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="Language" className="flex h-10 min-w-10 items-center justify-center rounded-md px-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors" title="Language">
        <span className="text-base">{localeFlags[locale]}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
        {(Object.keys(localeNames) as Locale[]).map((l) => (
          <DropdownMenuItem
            key={l}
            onClick={() => setLocale(l)}
            className={locale === l ? "bg-secondary font-semibold" : ""}
          >
            {localeNames[l]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
