import { Search } from "lucide-react";
import { versions, platforms, softwareOptions } from "@/lib/mockData";

interface ServerFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  selectedPlatform: string;
  onPlatformChange: (v: string) => void;
  selectedVersion: string;
  onVersionChange: (v: string) => void;
  selectedSoftware: string;
  onSoftwareChange: (v: string) => void;
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
}: ServerFiltersProps) => {
  return (
    <div className="gradient-card rounded-lg border border-border p-4 md:p-6 shadow-card mb-8">
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Hľadaj server podľa názvu alebo IP..."
          className="w-full rounded-md border border-border bg-secondary/50 py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
        />
      </div>

      {/* Filter rows */}
      <div className="flex flex-wrap gap-6">
        {/* Platform */}
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Platforma</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => onPlatformChange("")}
              className={`filter-chip ${selectedPlatform === "" ? "active" : ""}`}
            >
              Všetky
            </button>
            {platforms.map((p) => (
              <button
                key={p}
                onClick={() => onPlatformChange(p === selectedPlatform ? "" : p)}
                className={`filter-chip ${selectedPlatform === p ? "active" : ""}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Version */}
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Verzia</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => onVersionChange("")}
              className={`filter-chip ${selectedVersion === "" ? "active" : ""}`}
            >
              Všetky
            </button>
            {versions.map((v) => (
              <button
                key={v}
                onClick={() => onVersionChange(v === selectedVersion ? "" : v)}
                className={`filter-chip ${selectedVersion === v ? "active" : ""}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Software */}
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Software</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => onSoftwareChange("")}
              className={`filter-chip ${selectedSoftware === "" ? "active" : ""}`}
            >
              Všetky
            </button>
            {softwareOptions.map((s) => (
              <button
                key={s}
                onClick={() => onSoftwareChange(s === selectedSoftware ? "" : s)}
                className={`filter-chip ${selectedSoftware === s ? "active" : ""}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServerFilters;
