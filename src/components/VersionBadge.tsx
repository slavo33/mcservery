import { Tag } from "lucide-react";
import { cn } from "@/lib/utils";

interface VersionBadgeProps {
  version?: string | null;
  className?: string;
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

const VersionBadge = ({ version, className }: VersionBadgeProps) => {
  const label = formatVersion(version);
  if (!label) return null;

  return (
    <span
      key={label}
      title={label}
      aria-label={`Verzia ${label}`}
      className={cn(
        "badge-tag gap-1 whitespace-nowrap tabular-nums font-display tracking-tight",
        "px-2.5 py-1 text-xs sm:text-sm max-w-full",
        className
      )}
    >
      <Tag className="h-3 w-3 shrink-0 opacity-70" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </span>
  );
};

export default VersionBadge;
