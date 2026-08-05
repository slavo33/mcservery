// Generates public/sitemap.xml before dev and build.
// Pulls dynamic server + staff-post slugs from the database so crawlers
// can discover every public detail page. Runs via predev/prebuild hooks.

import { writeFileSync, readFileSync, existsSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://mcservery.one";
// Bezpečnostný strop pre počet URL v sitemape (limit protokolu je 50 000).
const MAX_URLS = Number(process.env.SITEMAP_MAX_URLS ?? 45000);

// Read Supabase creds from .env (publishable anon key — safe for read-only public data).
function readEnv(key: string): string | undefined {
  if (process.env[key]) return process.env[key];
  try {
    const envPath = resolve(".env");
    if (!existsSync(envPath)) return undefined;
    const line = readFileSync(envPath, "utf8")
      .split("\n")
      .find((l) => l.startsWith(`${key}=`));
    return line?.slice(key.length + 1).trim().replace(/^"|"$/g, "");
  } catch {
    return undefined;
  }
}

/**
 * Prevedie timestamp z DB na W3C dátum (ISO 8601) pre <lastmod>.
 * Používame len skutočné údaje o poslednej zmene profilu — nikdy nie čas buildu.
 */
function toW3C(value?: string | null): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().replace(/\.\d{3}Z$/, "+00:00");
}

/** Najnovší lastmod zo skupiny profilov — použije sa pre výpisové stránky. */
function newestLastmod(entries: SitemapEntry[]): string | undefined {
  const times = entries
    .map((e) => e.lastmod)
    .filter((v): v is string => Boolean(v))
    .sort();
  return times.length ? times[times.length - 1] : undefined;
}

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
  lastmod?: string;
}

const staticEntries: SitemapEntry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/servers", changefreq: "daily", priority: "0.9" },
  { path: "/staff", changefreq: "daily", priority: "0.7" },
  { path: "/vip", changefreq: "monthly", priority: "0.6" },
  { path: "/add-server", changefreq: "monthly", priority: "0.6" },
  { path: "/auth", changefreq: "monthly", priority: "0.4" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
];

async function fetchDynamicEntries(): Promise<SitemapEntry[]> {
  const url = readEnv("VITE_SUPABASE_URL");
  const key = readEnv("VITE_SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) {
    console.warn("sitemap: Supabase env missing, skipping dynamic routes");
    return [];
  }

  const entries: SitemapEntry[] = [];
  const headers = { apikey: key, Authorization: `Bearer ${key}` };

  try {
    const serversRes = await fetch(
      `${url}/rest/v1/servers?select=slug,updated_at&slug=not.is.null&limit=45000`,
      { headers }
    );
    if (serversRes.ok) {
      const servers = (await serversRes.json()) as { slug: string; updated_at?: string }[];
      for (const s of servers) {
        if (s.slug)
          entries.push({
            path: `/server/${s.slug}`,
            changefreq: "weekly",
            priority: "0.8",
            lastmod: toW3C(s.updated_at),
          });
      }
    }
  } catch (e) {
    console.warn("sitemap: failed to fetch servers", e);
  }

  try {
    const staffRes = await fetch(
      `${url}/rest/v1/staff_posts?select=slug,updated_at&is_active=eq.true&slug=not.is.null&limit=45000`,
      { headers }
    );
    if (staffRes.ok) {
      const posts = (await staffRes.json()) as { slug: string; updated_at?: string }[];
      for (const p of posts) {
        if (p.slug)
          entries.push({
            path: `/staff/${p.slug}`,
            changefreq: "weekly",
            priority: "0.6",
            lastmod: toW3C(p.updated_at),
          });
      }
    }
  } catch (e) {
    console.warn("sitemap: failed to fetch staff posts", e);
  }

  return entries;
}

function generateSitemap(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n")
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

function generateSitemapIndex(files: { name: string; lastmod?: string }[]) {
  const items = files.map((f) =>
    [
      `  <sitemap>`,
      `    <loc>${BASE_URL}/${f.name}</loc>`,
      f.lastmod ? `    <lastmod>${f.lastmod}</lastmod>` : null,
      `  </sitemap>`,
    ]
      .filter(Boolean)
      .join("\n")
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...items,
    `</sitemapindex>`,
  ].join("\n");
}

/** Odstráni chunky z predchádzajúceho behu, aby nezostali zastarané URL. */
function cleanupOldChunks(keep: string[]) {
  for (const file of readdirSync(resolve("public"))) {
    if (/^sitemap-\d+\.xml$/.test(file) && !keep.includes(file)) {
      unlinkSync(resolve("public", file));
    }
  }
}

async function main() {
  const dynamic = await fetchDynamicEntries();

  // Výpisové stránky dedia lastmod z najnovšie aktualizovaného profilu,
  // ktorý na nich figuruje (žiadne fallbacky na čas buildu).
  const serverEntries = dynamic.filter((e) => e.path.startsWith("/server/"));
  const staffEntries = dynamic.filter((e) => e.path.startsWith("/staff/"));
  const newestServer = newestLastmod(serverEntries);
  const newestStaff = newestLastmod(staffEntries);
  const newestAny = newestLastmod([...serverEntries, ...staffEntries]);

  const statics = staticEntries.map((e) => {
    if (e.path === "/servers" && newestServer) return { ...e, lastmod: newestServer };
    if (e.path === "/staff" && newestStaff) return { ...e, lastmod: newestStaff };
    if (e.path === "/" && newestAny) return { ...e, lastmod: newestAny };
    return e;
  });

  const all = [...statics, ...dynamic];
  const entries = all.slice(0, MAX_URLS);
  if (all.length > entries.length) {
    console.warn(`sitemap: orezané na ${MAX_URLS} URL (celkom ${all.length})`);
  }

  if (entries.length <= URLS_PER_FILE) {
    // Malý web: jeden urlset priamo v sitemap.xml.
    cleanupOldChunks([]);
    writeFileSync(resolve("public/sitemap.xml"), generateSitemap(entries));
    console.log(`sitemap.xml written (${entries.length} entries)`);
    return;
  }

  // Väčší web: rozdelíme na chunky a sitemap.xml sa stane indexom.
  const chunks: SitemapEntry[][] = [];
  for (let i = 0; i < entries.length; i += URLS_PER_FILE) {
    chunks.push(entries.slice(i, i + URLS_PER_FILE));
  }

  const files = chunks.map((chunk, i) => {
    const name = `sitemap-${i + 1}.xml`;
    writeFileSync(resolve("public", name), generateSitemap(chunk));
    return { name, lastmod: newestLastmod(chunk) };
  });

  cleanupOldChunks(files.map((f) => f.name));
  writeFileSync(resolve("public/sitemap.xml"), generateSitemapIndex(files));
  console.log(
    `sitemap.xml index written (${files.length} súborov, ${entries.length} entries)`
  );
}

main();

