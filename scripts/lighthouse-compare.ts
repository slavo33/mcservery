/**
 * Porovnanie Lighthouse reportov medzi jobmi (mobile vs. desktop).
 *
 * Vstup: adresáre s JSON reportmi z LHCI filesystem uploadu, štandardne
 *   .lighthouseci/reports/mobile a .lighthouseci/reports/desktop
 * (dajú sa prepísať cez LH_MOBILE_DIR / LH_DESKTOP_DIR).
 *
 * Výstup: markdown tabuľka na stdout a do $GITHUB_STEP_SUMMARY (ak existuje),
 * plus zlúčený JSON v .lighthouseci/comparison.json.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync, appendFileSync, mkdirSync } from "fs";
import { join, resolve } from "path";

type Metrics = {
  performance: number | null;
  lcp: number | null;
  cls: number | null;
  fcp: number | null;
  tbt: number | null;
  si: number | null;
};

const MOBILE_DIR = process.env.LH_MOBILE_DIR || ".lighthouseci/reports/mobile";
const DESKTOP_DIR = process.env.LH_DESKTOP_DIR || ".lighthouseci/reports/desktop";

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function median(values: number[]): number | null {
  const list = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!list.length) return null;
  const mid = Math.floor(list.length / 2);
  return list.length % 2 ? list[mid] : (list[mid - 1] + list[mid]) / 2;
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname || "/";
  } catch {
    return url;
  }
}

function collect(dir: string): Map<string, Metrics> {
  const out = new Map<string, Metrics[]>();
  const abs = resolve(dir);
  if (!existsSync(abs)) return new Map();

  for (const file of readdirSync(abs)) {
    if (!file.endsWith(".json") || file === "manifest.json" || file === "assertion-results.json") continue;
    let report: {
      audits?: Record<string, { numericValue?: unknown } | undefined>;
      finalUrl?: string;
      finalDisplayedUrl?: string;
      requestedUrl?: string;
      categories?: { performance?: { score?: unknown } };
    };
    try {
      report = JSON.parse(readFileSync(join(abs, file), "utf8"));
    } catch {
      continue;
    }
    if (!report?.audits || !report?.finalUrl && !report?.finalDisplayedUrl) continue;
    const key = pathOf(report.finalDisplayedUrl || report.finalUrl || report.requestedUrl || file);
    const a = report.audits;
    const entry: Metrics = {
      performance: num(report.categories?.performance?.score),
      lcp: num(a["largest-contentful-paint"]?.numericValue),
      cls: num(a["cumulative-layout-shift"]?.numericValue),
      fcp: num(a["first-contentful-paint"]?.numericValue),
      tbt: num(a["total-blocking-time"]?.numericValue),
      si: num(a["speed-index"]?.numericValue),
    };
    out.set(key, [...(out.get(key) || []), entry]);
  }

  const medians = new Map<string, Metrics>();
  for (const [key, runs] of out) {
    medians.set(key, {
      performance: median(runs.map((r) => r.performance ?? NaN)),
      lcp: median(runs.map((r) => r.lcp ?? NaN)),
      cls: median(runs.map((r) => r.cls ?? NaN)),
      fcp: median(runs.map((r) => r.fcp ?? NaN)),
      tbt: median(runs.map((r) => r.tbt ?? NaN)),
      si: median(runs.map((r) => r.si ?? NaN)),
    });
  }
  return medians;
}

function ms(v: number | null): string {
  return v === null ? "—" : `${Math.round(v)} ms`;
}
function score(v: number | null): string {
  return v === null ? "—" : `${Math.round(v * 100)}`;
}
function cls(v: number | null): string {
  return v === null ? "—" : v.toFixed(3);
}

const mobile = collect(MOBILE_DIR);
const desktop = collect(DESKTOP_DIR);
const paths = [...new Set([...mobile.keys(), ...desktop.keys()])].sort();

const lines: string[] = [];
lines.push("## Lighthouse porovnanie: mobile vs. desktop");
lines.push("");
if (!paths.length) {
  lines.push("Nenašli sa žiadne JSON reporty na porovnanie.");
} else {
  lines.push("Hodnoty sú mediány z behov. Throttling: mobil 1.6 Mbps / 150 ms RTT / CPU 4×, desktop 10 Mbps / 40 ms RTT / CPU 1×.");
  lines.push("");
  lines.push("| Stránka | Perf (M/D) | LCP (M/D) | CLS (M/D) | FCP (M/D) | TBT (M/D) | Speed Index (M/D) |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- |");
  for (const p of paths) {
    const m = mobile.get(p);
    const d = desktop.get(p);
    lines.push(
      `| \`${p}\` | ${score(m?.performance ?? null)} / ${score(d?.performance ?? null)} | ${ms(m?.lcp ?? null)} / ${ms(
        d?.lcp ?? null,
      )} | ${cls(m?.cls ?? null)} / ${cls(d?.cls ?? null)} | ${ms(m?.fcp ?? null)} / ${ms(d?.fcp ?? null)} | ${ms(
        m?.tbt ?? null,
      )} / ${ms(d?.tbt ?? null)} | ${ms(m?.si ?? null)} / ${ms(d?.si ?? null)} |`,
    );
  }
}

const markdown = lines.join("\n") + "\n";
process.stdout.write(markdown);

mkdirSync(resolve(".lighthouseci"), { recursive: true });
writeFileSync(
  resolve(".lighthouseci/comparison.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      pages: paths.map((p) => ({ path: p, mobile: mobile.get(p) ?? null, desktop: desktop.get(p) ?? null })),
    },
    null,
    2,
  ),
);
writeFileSync(resolve(".lighthouseci/comparison.md"), markdown);

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
}
