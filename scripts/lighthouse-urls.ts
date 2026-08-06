// Zostaví zoznam URL pre Lighthouse CI.
//
// Okrem statických stránok pridá aj:
//  - /add-server (dlhý formulár, veľa vstupov -> riziko CLS)
//  - detail servera s NAJDLHŠÍM popisom + najviac médiami (worst-case LCP/CLS)
//
// Výstup: .lighthouseci/urls.json (pole ciest, napr. ["/", "/add-server", ...])

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { resolve } from "path";

const STATIC_PATHS = ["/", "/servers", "/staff", "/add-server"];
const OUT_DIR = resolve(".lighthouseci");
const OUT_FILE = resolve(OUT_DIR, "urls.json");

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

/** Rovnaká logika slugu ako v generate-sitemap.ts (doménová časť IP adresy). */
function slugify(ip: string, id: string): string {
  const domain = (ip || "").split(":")[0].toLowerCase();
  const base = domain
    .replace(/[^a-z0-9.-]/g, "")
    .replace(/\./g, "-")
    .replace(/^-+|-+$/g, "");
  return base || id;
}

/** Záložný zdroj — detaily serverov zo sitemapy, ak DB nie je dostupná. */
function pathsFromSitemap(limit: number): string[] {
  const file = resolve("public/sitemap.xml");
  if (!existsSync(file)) return [];
  const xml = readFileSync(file, "utf8");
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  return locs
    .map((u) => {
      try {
        return new URL(u).pathname;
      } catch {
        return "";
      }
    })
    .filter((p) => /^\/server\/[^/]+$/.test(p))
    .slice(0, limit);
}

async function serverPathsFromDb(limit: number): Promise<string[]> {
  const url = readEnv("VITE_SUPABASE_URL");
  const key = readEnv("VITE_SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) return [];
  try {
    const res = await fetch(
      `${url}/rest/v1/servers?select=id,ip,description,images&limit=500`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    if (!res.ok) return [];
    const rows = (await res.json()) as Array<{
      id: string;
      ip: string;
      description?: string | null;
      images?: unknown[] | null;
    }>;
    return rows
      .map((r) => ({
        path: `/server/${slugify(r.ip, r.id)}`,
        // Váha worst-case: dĺžka popisu + počet médií (obrázky posúvajú layout).
        weight: (r.description?.length ?? 0) + (r.images?.length ?? 0) * 500,
      }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, limit)
      .map((r) => r.path);
  } catch {
    return [];
  }
}

async function main() {
  const limit = Number(process.env.LH_SERVER_URLS ?? 2);
  let detailPaths = await serverPathsFromDb(limit);
  if (detailPaths.length === 0) detailPaths = pathsFromSitemap(limit);

  const paths = [...STATIC_PATHS, ...detailPaths];
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(paths, null, 2) + "\n");
  console.log(`Lighthouse URL (${paths.length}):`);
  for (const p of paths) console.log(`  ${p}`);
  if (detailPaths.length === 0) {
    console.warn(
      "VAROVANIE: nepodarilo sa nájsť detail servera — rozpočet sa overí len na statických stránkach.",
    );
  }
}

main();
