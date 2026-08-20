import { useId } from "react";
import { Search } from "lucide-react";
import { versions, platforms, softwareOptions, minigameOptions } from "@/lib/mockData";
import { useLanguage } from "@/i18n/LanguageContext";

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
}

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
}: ServerFiltersProps) => {
  const { t } = useLanguage();
  const uid = useId();

  const searchId = `${uid}-search`;
  const platformLabelId = `${uid}-platform`;
  const versionLabelId = `${uid}-version`;
  const softwareLabelId = `${uid}-software`;
  const minigameLabelId = `${uid}-minigame`;

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

      {/* Filter rows */}
      <div className="flex flex-wrap gap-6">
        {/* Platform */}
        <div data-filter-group="platform" role="group" aria-labelledby={platformLabelId}>
          <span id={platformLabelId} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">{t("filter_platform")}</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              aria-pressed={selectedPlatform === ""}
              onClick={() => onPlatformChange("")}
              className={`filter-chip ${selectedPlatform === "" ? "active" : ""}`}
            >
              {t("filter_all")}
            </button>
            {platforms.map((p) => (
              <button
                key={p}
                type="button"
                data-filter-value={p}
                aria-pressed={selectedPlatform === p}
                onClick={() => onPlatformChange(p === selectedPlatform ? "" : p)}
                className={`filter-chip ${selectedPlatform === p ? "active" : ""}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Version */}
        <div data-filter-group="version" role="group" aria-labelledby={versionLabelId}>
          <span id={versionLabelId} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">{t("filter_version")}</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              aria-pressed={selectedVersion === ""}
              onClick={() => onVersionChange("")}
              className={`filter-chip ${selectedVersion === "" ? "active" : ""}`}
            >
              {t("filter_all")}
            </button>
            {versions.map((v) => (
              <button
                key={v}
                type="button"
                data-filter-value={v}
                aria-pressed={selectedVersion === v}
                onClick={() => onVersionChange(v === selectedVersion ? "" : v)}
                className={`filter-chip ${selectedVersion === v ? "active" : ""}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>


        {/* Software / loader */}
        <div data-filter-group="software" role="group" aria-labelledby={softwareLabelId}>
          <span id={softwareLabelId} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">{t("filter_software")}</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              aria-pressed={selectedSoftware === ""}
              onClick={() => onSoftwareChange("")}
              className={`filter-chip ${selectedSoftware === "" ? "active" : ""}`}
            >
              {t("filter_all")}
            </button>
            {softwareOptions.map((s) => (
              <button
                key={s}
                type="button"
                data-filter-value={s}
                aria-pressed={selectedSoftware === s}
                onClick={() => onSoftwareChange(s === selectedSoftware ? "" : s)}
                className={`filter-chip ${selectedSoftware === s ? "active" : ""}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Minigames */}
        {onMinigameChange && (
          <div data-filter-group="minigame" role="group" aria-labelledby={minigameLabelId}>
            <span id={minigameLabelId} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">{t("detail_minigames")}</span>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
              <button
                type="button"
                aria-pressed={selectedMinigame === ""}
                onClick={() => onMinigameChange("")}
                className={`filter-chip ${selectedMinigame === "" ? "active" : ""}`}
              >
                {t("filter_all")}
              </button>
              {minigameOptions.map((m) => (
                <button
                  key={m}
                  type="button"
                  data-filter-value={m}
                  aria-pressed={selectedMinigame === m}
                  onClick={() => onMinigameChange(m === selectedMinigame ? "" : m)}
                  className={`filter-chip ${selectedMinigame === m ? "active" : ""}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

    </section>
  );
};

export default ServerFilters;
