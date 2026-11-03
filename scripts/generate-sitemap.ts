// Generates public/sitemap.xml before dev and build.
// Pulls dynamic server + staff-post slugs from the database so crawlers
// can discover every public detail page. Runs via predev/prebuild hooks.

import { writeFileSync, readFileSync, existsSync, readdirSync, unlinkSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://mcservery.one";
// Bezpečnostný strop pre počet URL v sitemape (limit protokolu je 50 000).
const MAX_URLS = Number(process.env.SITEMAP_MAX_URLS ?? 45000);
// Po prekročení tohto počtu sa sitemap rozdelí na chunky + sitemap index.
const URLS_PER_FILE = Number(process.env.SITEMAP_URLS_PER_FILE ?? 5000);

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

interface SitemapImage {
  loc: string;
  title?: string;
  caption?: string;
}

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
  lastmod?: string;
  /** Obrázky profilu (image sitemap extension) — pomáhajú indexácii fotiek serverov. */
  images?: SitemapImage[];
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Do image sitemapy patria len absolútne http(s) URL; max 1000 obrázkov na stránku. */
function toSitemapImages(
  urls: unknown,
  title: string,
  caption?: string
): SitemapImage[] | undefined {
  const list = Array.isArray(urls) ? urls : [];
  const images = list
    .filter((u): u is string => typeof u === "string" && /^https?:\/\//i.test(u.trim()))
    .map((u) => u.trim())
    .filter((u, i, arr) => arr.indexOf(u) === i)
    .slice(0, 1000)
    .map((loc, i) => ({
      loc,
      title: i === 0 ? title : `${title} — screenshot ${i + 1}`,
      caption,
    }));
  return images.length > 0 ? images : undefined;
}

const staticEntries: SitemapEntry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/servers", changefreq: "daily", priority: "0.9" },
  { path: "/minecraft-servery/survival", changefreq: "weekly", priority: "0.8" },
  { path: "/minecraft-servery/skyblock", changefreq: "weekly", priority: "0.8" },
  { path: "/minecraft-servery/bedwars", changefreq: "weekly", priority: "0.8" },
  { path: "/minecraft-servery/skywars", changefreq: "weekly", priority: "0.8" },
  { path: "/minecraft-servery/pvp", changefreq: "weekly", priority: "0.8" },
  { path: "/minecraft-servery/smp", changefreq: "weekly", priority: "0.8" },
  { path: "/staff", changefreq: "daily", priority: "0.7" },
  { path: "/vip", changefreq: "monthly", priority: "0.6" },
  { path: "/add-server", changefreq: "monthly", priority: "0.6" },
  // /auth je noindex (prihlasovacia stránka) — do sitemapy nepatrí.
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
      `${url}/rest/v1/servers?select=slug,name,updated_at,images&slug=not.is.null&limit=45000`,
      { headers }
    );
    if (serversRes.ok) {
      const servers = (await serversRes.json()) as {
        slug: string;
        name?: string;
        updated_at?: string;
        images?: string[];
      }[];
      for (const s of servers) {
        if (s.slug)
          entries.push({
            path: `/server/${s.slug}`,
            changefreq: "weekly",
            priority: "0.8",
            lastmod: toW3C(s.updated_at),
            images: toSitemapImages(
              s.images,
              s.name || s.slug,
              `Minecraft server ${s.name || s.slug} na MCServery`
            ),
          });
      }
    }
  } catch (e) {
    console.warn("sitemap: failed to fetch servers", e);
  }

  try {
    const staffRes = await fetch(
      `${url}/rest/v1/staff_posts?select=slug,position,updated_at,images&is_active=eq.true&slug=not.is.null&limit=45000`,
      { headers }
    );
    if (staffRes.ok) {
      const posts = (await staffRes.json()) as {
        slug: string;
        position?: string;
        updated_at?: string;
        images?: string[];
      }[];
      for (const p of posts) {
        if (p.slug)
          entries.push({
            path: `/staff/${p.slug}`,
            changefreq: "weekly",
            priority: "0.6",
            lastmod: toW3C(p.updated_at),
            images: toSitemapImages(
              p.images,
              p.position ? `Nábor: ${p.position}` : p.slug,
              "Nábor do A-teamu na MCServery"
            ),
          });
      }
    }
  } catch (e) {
    console.warn("sitemap: failed to fetch staff posts", e);
  }

  try {
    // Verejné profily používateľov (/user/:id) — indexovateľné len s prezývkou.
    const profilesRes = await fetch(
      `${url}/rest/v1/profiles?select=id,nickname,updated_at&nickname=not.is.null&limit=45000`,
      { headers }
    );
    if (profilesRes.ok) {
      const profiles = (await profilesRes.json()) as {
        id: string;
        nickname?: string;
        updated_at?: string;
      }[];
      for (const pr of profiles) {
        if (pr.id && pr.nickname?.trim())
          entries.push({
            path: `/user/${pr.id}`,
            changefreq: "weekly",
            priority: "0.5",
            lastmod: toW3C(pr.updated_at),
          });
      }
    }
  } catch (e) {
    console.warn("sitemap: failed to fetch profiles", e);
  }

  return entries;
}

function renderImages(images?: SitemapImage[]): string[] {
  return (images ?? []).flatMap((img) =>
    [
      `    <image:image>`,
      `      <image:loc>${xmlEscape(img.loc)}</image:loc>`,
      img.title ? `      <image:title>${xmlEscape(img.title)}</image:title>` : null,
      img.caption ? `      <image:caption>${xmlEscape(img.caption)}</image:caption>` : null,
      `    </image:image>`,
    ].filter(Boolean) as string[]
  );
}

function generateSitemap(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      ...renderImages(e.images),
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n")
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`,
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
    const imageCount = entries.reduce((n, e) => n + (e.images?.length ?? 0), 0);
    console.log(`sitemap.xml written (${entries.length} entries, ${imageCount} images)`);
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

