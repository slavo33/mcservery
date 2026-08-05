import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

/**
 * Statická CI validácia sitemapy:
 * žiadna URL v sitemap.xml nesmie viesť na stránku, ktorá renderuje `noindex`
 * (napr. /auth, /admin, /profile, /console, /vip-success, /404, /*\/edit).
 */

const root = resolve(__dirname, "../../..");

function readSitemapLocs(): string[] {
  const file = resolve(root, "public/sitemap.xml");
  if (!existsSync(file)) return [];
  const xml = readFileSync(file, "utf-8");
  if (xml.includes("<sitemapindex")) {
    const chunks = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    return chunks.flatMap((c) => {
      const path = resolve(root, "public", c.replace(/^https?:\/\/[^/]+\//, ""));
      if (!existsSync(path)) return [];
      return [...readFileSync(path, "utf-8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    });
  }
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

function toPath(loc: string): string {
  return loc.replace(/^https?:\/\/[^/]+/, "") || "/";
}

/** Mapa route pattern -> súbor stránky, načítaná priamo z App.tsx. */
function routeMap(): Array<{ pattern: string; file: string }> {
  const app = readFileSync(resolve(root, "src/App.tsx"), "utf-8");
  const imports = new Map<string, string>();
  // statické importy: import Index from "./pages/Index"
  for (const m of app.matchAll(/import\s+(\w+)\s+from\s+"(?:@\/|\.\/)(pages\/[^"]+)"/g)) {
    imports.set(m[1], "src/" + m[2] + ".tsx");
  }
  // lazy importy: const Servers = lazy(() => import("./pages/Servers"))
  for (const m of app.matchAll(/const\s+(\w+)\s*=\s*lazy\(\(\)\s*=>\s*import\("(?:@\/|\.\/)(pages\/[^"]+)"\)\)/g)) {
    imports.set(m[1], "src/" + m[2] + ".tsx");
  }

  const routes: Array<{ pattern: string; file: string }> = [];
  for (const m of app.matchAll(/<Route\s+path="([^"]+)"\s+element=\{<(\w+)/g)) {
    const file = imports.get(m[2]);
    if (file) routes.push({ pattern: m[1], file });
  }
  return routes;
}

function matchRoute(path: string, routes: ReturnType<typeof routeMap>) {
  const exact = routes.find((r) => r.pattern === path);
  if (exact) return exact;
  return routes.find((r) => {
    if (r.pattern === "*") return false;
    const rx = new RegExp("^" + r.pattern.replace(/:[^/]+/g, "[^/]+") + "$");
    return rx.test(path);
  });
}

const locs = readSitemapLocs();
const routes = routeMap();

describe("sitemap.xml indexovateľnosť", () => {
  it("sitemap obsahuje aspoň jednu URL", () => {
    expect(locs.length).toBeGreaterThan(0);
  });

  it("všetky <loc> sú absolútne HTTPS URL bez duplicít", () => {
    for (const loc of locs) expect(loc).toMatch(/^https:\/\//);
    expect(new Set(locs).size).toBe(locs.length);
  });

  it("žiadna URL zo sitemapy nevedie na stránku s noindex", () => {
    const offenders: string[] = [];
    for (const loc of locs) {
      const path = toPath(loc);
      const route = matchRoute(path, routes);
      expect(route, `route pre ${path} neexistuje v App.tsx`).toBeTruthy();
      const src = readFileSync(resolve(root, route!.file), "utf-8");
      // Stránka je neindexovateľná len ak KAŽDÝ jej <SEO ...> má noindex
      // (podmienené `noindex={...}` sa počíta ako indexovateľný variant).
      const seoTags = [...src.matchAll(/<SEO\b[\s\S]*?\/>/g)].map((m) => m[0]);
      const hasIndexableSeo = seoTags.some((t) => !/\bnoindex\b(?!=)/.test(t));
      if (seoTags.length > 0 && !hasIndexableSeo) offenders.push(`${path} -> ${route!.file}`);

    }
    expect(offenders, `noindex stránky v sitemape: ${offenders.join(", ")}`).toEqual([]);
  });

  it("súkromné a duplicitné routy nie sú v sitemape", () => {
    const forbidden = ["/auth", "/admin", "/profile", "/console", "/vip-success", "/404"];
    const paths = locs.map(toPath);
    for (const f of forbidden) expect(paths).not.toContain(f);
    expect(paths.filter((p) => p.endsWith("/edit"))).toEqual([]);
  });
});
