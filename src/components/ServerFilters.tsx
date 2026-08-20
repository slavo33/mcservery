import { useEffect, useId, useState } from "react";
import { Search, SlidersHorizontal, RotateCcw, Check } from "lucide-react";
import { versions, platforms, softwareOptions, minigameOptions } from "@/lib/mockData";
import { useLanguage } from "@/i18n/LanguageContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

interface ServerFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  selectedPlatform: string;
  onPlatformChange: (v: string) => void;
  selectedVersion: string;
  onVersionChange: (v: string) => void;
  selectedSoftware: string;
  onSoftwareChange: (v: string) => void;
  selectedMinigame?: string;
  onMinigameChange?: (v: string) => void;
  /** Dávkové aplikovanie všetkých filtrov naraz (mobilný drawer) */
  onFiltersApply?: (v: { platform: string; version: string; software: string; minigame: string }) => void;
}

interface Draft {
  platform: string;
  version: string;
  software: string;
  minigame: string;
}

const EMPTY_DRAFT: Draft = { platform: "", version: "", software: "", minigame: "" };

interface ChipGroupProps {
  group: string;
  label: string;
  labelId: string;
  options: readonly string[];
  value: string;
  allLabel: string;
  scroll?: boolean;
  onChange: (v: string) => void;
}

const ChipGroup = ({ group, label, labelId, options, value, allLabel, scroll, onChange }: ChipGroupProps) => (
  <div data-filter-group={group} role="group" aria-labelledby={labelId}>
    <span id={labelId} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
      {label}
    </span>
    <div className={`flex flex-wrap gap-1.5${scroll ? " max-h-40 overflow-y-auto pr-1" : ""}`}>
      <button
        type="button"
        aria-pressed={value === ""}
        onClick={() => onChange("")}
        className={`filter-chip ${value === "" ? "active" : ""}`}
      >
        {allLabel}
      </button>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          data-filter-value={o}
          aria-pressed={value === o}
          onClick={() => onChange(o === value ? "" : o)}
          className={`filter-chip ${value === o ? "active" : ""}`}
        >
          {o}
        </button>
      ))}
    </div>
  </div>
);

const ServerFilters = ({
  search,
  onSearchChange,
  selectedPlatform,
  onPlatformChange,
  selectedVersion,
  onVersionChange,
  selectedSoftware,
  onSoftwareChange,
  selectedMinigame = "",
  onMinigameChange,
  onFiltersApply,
}: ServerFiltersProps) => {
  const { t } = useLanguage();
  const uid = useId();
  const isMobile = useIsMobile();

  const searchId = `${uid}-search`;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  // Pri otvorení drawer prevezme aktuálne aplikované filtre.
  useEffect(() => {
    if (drawerOpen)
      setDraft({
        platform: selectedPlatform,
        version: selectedVersion,
        software: selectedSoftware,
        minigame: selectedMinigame,
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerOpen]);

  const activeCount =
    (selectedPlatform ? 1 : 0) + (selectedVersion ? 1 : 0) + (selectedSoftware ? 1 : 0) + (selectedMinigame ? 1 : 0);

  const applyDraft = () => {
    if (onFiltersApply) {
      onFiltersApply({ ...draft });
    } else {
      onPlatformChange(draft.platform);
      onVersionChange(draft.version);
      onSoftwareChange(draft.software);
      onMinigameChange?.(draft.minigame);
    }
    setDrawerOpen(false);
  };

  const resetDraft = () => setDraft(EMPTY_DRAFT);

  const groups = (
    values: Draft,
    onChange: (patch: Partial<Draft>) => void,
    idScope: string,
    wrapperClass: string,
  ) => (
    <div className={wrapperClass}>
      <ChipGroup
        group="platform"
        label={t("filter_platform")}
        labelId={`${idScope}-platform`}
        options={platforms}
        value={values.platform}
        allLabel={t("filter_all")}
        onChange={(v) => onChange({ platform: v })}
      />
      <ChipGroup
        group="version"
        label={t("filter_version")}
        labelId={`${idScope}-version`}
        options={versions}
        value={values.version}
        allLabel={t("filter_all")}
        onChange={(v) => onChange({ version: v })}
      />
      <ChipGroup
        group="software"
        label={t("filter_software")}
        labelId={`${idScope}-software`}
        options={softwareOptions}
        value={values.software}
        allLabel={t("filter_all")}
        onChange={(v) => onChange({ software: v })}
      />
      {onMinigameChange && (
        <ChipGroup
          group="minigame"
          label={t("detail_minigames")}
          labelId={`${idScope}-minigame`}
          options={minigameOptions}
          value={values.minigame}
          allLabel={t("filter_all")}
          scroll
          onChange={(v) => onChange({ minigame: v })}
        />
      )}
    </div>
  );

  return (
    <section
      aria-label={t("filter_search_placeholder")}
      className="gradient-card rounded-lg border border-border p-4 md:p-6 shadow-card mb-8"
      data-server-filters=""
    >
      {/* Search */}
      <div className="relative mb-4">
        <label htmlFor={searchId} className="sr-only">
          {t("filter_search_placeholder")}
        </label>
        <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          id={searchId}
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("filter_search_placeholder")}
          className="w-full rounded-md border border-border bg-secondary/50 py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 transition-colors"
        />
      </div>

      {/* Mobil: spúšťač drawera */}
      {isMobile && (
      <button
        type="button"
        data-filter-drawer-trigger=""
        aria-expanded={drawerOpen}
        aria-haspopup="dialog"
        onClick={() => setDrawerOpen(true)}
        className="md:hidden w-full min-h-11 flex items-center justify-center gap-2 rounded-md border border-border bg-secondary/50 px-4 text-sm text-foreground transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
        {t("filters_open")}
        {activeCount > 0 && (
          <span
            data-filter-active-count={activeCount}
            className="ml-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary"
          >
            {activeCount}
          </span>
        )}
      </button>
      )}

      {/* Desktop: filtre priamo v paneli */}
      {!isMobile && groups(
        { platform: selectedPlatform, version: selectedVersion, software: selectedSoftware, minigame: selectedMinigame },
        (patch) => {
          if (patch.platform !== undefined) onPlatformChange(patch.platform);
          if (patch.version !== undefined) onVersionChange(patch.version);
          if (patch.software !== undefined) onSoftwareChange(patch.software);
          if (patch.minigame !== undefined) onMinigameChange?.(patch.minigame);
        },
        `${uid}-d`,
        "flex flex-wrap gap-6",
      )}

      {/* Mobil: drawer s filtrami */}
      {isMobile && (
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="bottom" className="md:hidden max-h-[85vh] overflow-y-auto" data-filter-drawer="">
          <SheetHeader className="text-left">
            <SheetTitle className="font-display">{t("filters_open")}</SheetTitle>
          </SheetHeader>
          {groups(
            draft,
            (patch) => setDraft((d) => ({ ...d, ...patch })),
            `${uid}-m`,
            "flex flex-col gap-5 py-4",
          )}
          <div className="sticky bottom-0 flex gap-2 bg-background pt-3">
            <button
              type="button"
              data-filter-reset=""
              onClick={resetDraft}
              className="min-h-11 flex-1 flex items-center justify-center gap-2 rounded-md border border-border px-4 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {t("filters_reset")}
            </button>
            <button
              type="button"
              data-filter-apply=""
              onClick={applyDraft}
              className="min-h-11 flex-1 flex items-center justify-center gap-2 rounded-md border border-primary bg-primary/10 px-4 text-sm font-bold text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              {t("filters_apply")}
            </button>
          </div>
        </SheetContent>
      </Sheet>
      )}
    </section>
  );
};

export default ServerFilters;
