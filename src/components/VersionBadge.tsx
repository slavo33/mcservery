import { useRef, useState } from "react";
import { Tag } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getVersionCompatibilitySummary } from "@/lib/versionCompatibility";

interface VersionBadgeProps {
  version?: string | null;
  className?: string;
  /** Ak je true, kliknutie na odznak otvorí zoznam serverov vyfiltrovaný podľa tejto verzie. */
  linkToFilter?: boolean;
  /** Vypne tooltip (napr. v hustých zoznamoch). */
  showTooltip?: boolean;
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

const VersionBadge = ({
  version,
  className,
  linkToFilter = false,
  showTooltip = true,
}: VersionBadgeProps) => {
  const [open, setOpen] = useState(false);
  // Na dotykových zariadeniach otvorí tooltip prvý ťuk, odkaz nasleduje až pri druhom.
  const touchedRef = useRef(false);
  const shownRef = useRef(false);

  const label = formatVersion(version);
  if (!label) return null;

  const plain = label.replace(/^v/, "");
  const summary = getVersionCompatibilitySummary(plain);

  const descriptionId = `version-badge-desc-${plain.replace(/\./g, "-")}`;

  const classes = cn(
    "inline-flex items-center gap-1 rounded-md border font-medium",
    "whitespace-nowrap text-nowrap tabular-nums font-display tracking-tight leading-none",
    "px-1.5 py-0.5 text-xs sm:px-2.5 sm:py-1 sm:text-sm",
    // Sémantické tokeny → kontrast drží v svetlej aj tmavej schéme
    "bg-primary/90 text-primary-foreground border-primary/50",
    // Vyšší kontrast pre používateľov s prefers-contrast a Windows High Contrast
    "contrast-more:bg-primary contrast-more:border-primary-foreground",
    "forced-colors:bg-[ButtonFace] forced-colors:text-[ButtonText] forced-colors:border-[ButtonText]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
    linkToFilter &&
      "cursor-pointer transition-colors hover:bg-primary hover:text-primary-foreground",
    showTooltip && !linkToFilter && "cursor-help",
    className
  );

  const content = (
    <>
      <Tag className="h-3 w-3 shrink-0 opacity-70" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </>
  );

  const badge = linkToFilter ? (
    <Link
      key={label}
      to={`/servers?version=${encodeURIComponent(plain)}`}
      aria-label={`Filtrovať servery podľa verzie ${label}`}
      aria-describedby={showTooltip ? descriptionId : undefined}
      className={classes}
      onTouchStart={() => {
        touchedRef.current = true;
      }}
      onClick={(e) => {
        // Prvý ťuk na mobile len ukáže tooltip s popisom kompatibility.
        if (showTooltip && touchedRef.current && !shownRef.current) {
          shownRef.current = true;
          e.preventDefault();
          setOpen(true);
        }
      }}
    >
      {content}
    </Link>
  ) : (
    <span
      key={label}
      aria-label={`Verzia ${label}`}
      aria-describedby={showTooltip ? descriptionId : undefined}
      aria-expanded={showTooltip ? open : undefined}
      className={classes}
      role={showTooltip ? "button" : undefined}
      tabIndex={showTooltip ? 0 : undefined}
      onClick={showTooltip ? () => setOpen((v) => !v) : undefined}
      onKeyDown={
        showTooltip
          ? (e) => {
              if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
                e.preventDefault();
                setOpen((v) => !v);
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }
          : undefined
      }
    >
      {content}
    </span>
  );


  if (!showTooltip) return badge;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        {/* Popis pre čítačky obrazovky je dostupný aj keď je tooltip zavretý. */}
        <span id={descriptionId} className="sr-only">
          {summary}
        </span>
        <TooltipContent
          side="top"
          sideOffset={6}
          role="tooltip"
          className="max-w-[16rem] text-xs leading-snug"
          onPointerDownOutside={() => setOpen(false)}
        >
          <p className="font-semibold">Minecraft {label}</p>
          <p className="text-muted-foreground mt-0.5">{summary}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default VersionBadge;
