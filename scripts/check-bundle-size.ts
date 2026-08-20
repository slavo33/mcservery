/**
 * Kontrola veľkosti buildu (gzip + brotli) proti prahom v bundle-size-budget.json.
 *
 * Použitie:
 *   bun run build && bunx tsx scripts/check-bundle-size.ts
 *
 * Výstup: tabuľka v konzole, .bundle-size/report.json, .bundle-size/report.md
 * a zápis do $GITHUB_STEP_SUMMARY (ak beží v GitHub Actions).
 * Exit code 1 pri prekročení prahu (v CI tak zachytíme nenápadný rast zdrojov).
 */
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync, appendFileSync, existsSync } from "fs";
import { join, resolve, extname, relative } from "path";
import { gzipSync, brotliCompressSync, constants } from "zlib";

const DIST = resolve(process.env.BUNDLE_DIST || "dist");
const BUDGET_FILE = resolve(process.env.BUNDLE_BUDGET || "bundle-size-budget.json");
const KB = 1024;

type Budget = {
  totals: Record<string, { gzip: number; brotli: number }>;
  largestSingleFile: Record<string, { gzip: number; brotli: number }>;
  warnAtPercent?: number;
};

type FileEntry = { file: string; type: string; raw: number; gzip: number; brotli: number };

if (!existsSync(DIST)) {
  console.error(`Chýba adresár ${DIST}. Najprv spusti build.`);
  process.exit(1);
}

const budget: Budget = JSON.parse(readFileSync(BUDGET_FILE, "utf8"));
const warnAt = budget.warnAtPercent ?? 90;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

function typeOf(file: string): string | null {
  const ext = extname(file).toLowerCase();
  if (ext === ".js" || ext === ".mjs" || ext === ".cjs") return "js";
  if (ext === ".css") return "css";
  return null;
}

const entries: FileEntry[] = [];
for (const full of walk(DIST)) {
  const type = typeOf(full);
  if (!type) continue;
  const buf = readFileSync(full);
  entries.push({
    file: relative(DIST, full),
    type,
    raw: buf.length,
    gzip: gzipSync(buf, { level: 9 }).length,
    brotli: brotliCompressSync(buf, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: buf.length },
    }).length,
  });
}

entries.sort((a, b) => b.gzip - a.gzip);

const sum = (type: string | null, key: "gzip" | "brotli") =>
  entries.filter((e) => (type ? e.type === type : true)).reduce((acc, e) => acc + e[key], 0);

const largest = (type: string, key: "gzip" | "brotli") =>
  entries.filter((e) => e.type === type).reduce((acc, e) => Math.max(acc, e[key]), 0);

type Check = { label: string; actual: number; limit: number; status: "ok" | "warn" | "fail" };
const checks: Check[] = [];

function check(label: string, actualBytes: number, limitKb: number) {
  const limit = limitKb * KB;
  const pct = limit ? (actualBytes / limit) * 100 : 0;
  checks.push({
    label,
    actual: actualBytes,
    limit,
    status: actualBytes > limit ? "fail" : pct >= warnAt ? "warn" : "ok",
  });
}

for (const [type, limits] of Object.entries(budget.totals)) {
  const scope = type === "all" ? null : type;
  check(`Celkom ${type.toUpperCase()} (gzip)`, sum(scope, "gzip"), limits.gzip);
  check(`Celkom ${type.toUpperCase()} (brotli)`, sum(scope, "brotli"), limits.brotli);
}
for (const [type, limits] of Object.entries(budget.largestSingleFile)) {
  check(`Najväčší ${type.toUpperCase()} súbor (gzip)`, largest(type, "gzip"), limits.gzip);
  check(`Najväčší ${type.toUpperCase()} súbor (brotli)`, largest(type, "brotli"), limits.brotli);
}

const kb = (n: number) => `${(n / KB).toFixed(1)} kB`;
const icon = (s: Check["status"]) => (s === "fail" ? "❌" : s === "warn" ? "⚠️" : "✅");

const lines: string[] = [];
lines.push("## Veľkosť buildu (gzip / brotli)");
lines.push("");
lines.push("| Kontrola | Aktuálne | Prah | Využitie | Stav |");
lines.push("| --- | --- | --- | --- | --- |");
for (const c of checks) {
  lines.push(
    `| ${c.label} | ${kb(c.actual)} | ${kb(c.limit)} | ${((c.actual / c.limit) * 100).toFixed(0)} % | ${icon(c.status)} |`,
  );
}
lines.push("");
lines.push("<details><summary>Najväčšie súbory</summary>");
lines.push("");
lines.push("| Súbor | Raw | gzip | brotli |");
lines.push("| --- | --- | --- | --- |");
for (const e of entries.slice(0, 15)) {
  lines.push(`| \`${e.file}\` | ${kb(e.raw)} | ${kb(e.gzip)} | ${kb(e.brotli)} |`);
}
lines.push("");
lines.push("</details>");

const markdown = lines.join("\n") + "\n";
process.stdout.write(markdown);

mkdirSync(resolve(".bundle-size"), { recursive: true });
writeFileSync(
  resolve(".bundle-size/report.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), files: entries, checks }, null, 2),
);
writeFileSync(resolve(".bundle-size/report.md"), markdown);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);

const failed = checks.filter((c) => c.status === "fail");
if (failed.length) {
  console.error(
    `\nPrekročené prahy veľkosti buildu:\n${failed
      .map((c) => ` - ${c.label}: ${kb(c.actual)} > ${kb(c.limit)}`)
      .join("\n")}\nUprav kód alebo vedome zvýš prah v bundle-size-budget.json.`,
  );
  process.exit(1);
}
console.log("Všetky prahy veľkosti buildu sú dodržané.");
