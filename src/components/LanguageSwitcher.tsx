import { useLanguage } from "@/i18n/LanguageContext";
import { localeNames, type Locale } from "@/i18n/translations";
import { Globe } from "lucide-react";
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
      <DropdownMenuTrigger className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors" title="Language">
        <Globe className="h-4 w-4" />
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
