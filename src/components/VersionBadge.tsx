import { Tag } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface VersionBadgeProps {
  version?: string | null;
  className?: string;
  /** Ak je true, kliknutie na odznak otvorí zoznam serverov vyfiltrovaný podľa tejto verzie. */
  linkToFilter?: boolean;
}

/**
 * Jednotné zobrazenie verzie servera.
 * Normalizuje vstup (biele znaky, prípadné "v"/"V" na začiatku),
 * takže po editácii vyzerá odznak vždy rovnako.
 */
export const formatVersion = (version?: string | null): string | null => {
  const raw = (version ?? "").trim().replace(/^v/i, "").trim();
  // Zobrazujeme len rozumné číselné verzie (napr. 26.2, 1.21.4) — nikdy prázdnu či nezmyselnú hodnotu.
  if (!/^\d+(\.\d+){0,3}$/.test(raw)) return null;
  return `v${raw}`;
};

const VersionBadge = ({ version, className, linkToFilter = false }: VersionBadgeProps) => {
  const label = formatVersion(version);
  if (!label) return null;

  const classes = cn(
    "inline-flex items-center gap-1 rounded-md border font-medium",
    "whitespace-nowrap text-nowrap tabular-nums font-display tracking-tight leading-none",
    "px-1.5 py-0.5 text-xs sm:px-2.5 sm:py-1 sm:text-sm",
    "bg-primary/90 text-primary-foreground border-primary/50",
    "min-w-0 shrink-0",
    linkToFilter &&
      "cursor-pointer transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    className
  );

  const content = (
    <>
      <Tag className="h-3 w-3 shrink-0 opacity-70" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </>
  );

  if (linkToFilter) {
    const plain = label.replace(/^v/, "");
    return (
      <Link
        key={label}
        to={`/servers?version=${encodeURIComponent(plain)}`}
        title={`Zobraziť servery s verziou ${label}`}
        aria-label={`Filtrovať servery podľa verzie ${label}`}
        className={classes}
      >
        {content}
      </Link>
    );
  }

  return (
    <span key={label} title={label} aria-label={`Verzia ${label}`} className={classes}>
      {content}
    </span>
  );
};

export default VersionBadge;
