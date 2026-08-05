// Živá sitemapa – generuje sa pri každom požiadavku priamo z databázy,
// takže <lastmod> odráža úpravu profilu okamžite (bez čakania na build).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const BASE_URL = "https://mcservery.one";

type SitemapImage = { loc: string; title?: string; caption?: string };

type Entry = {
  path: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
  /** Obrázky profilu (image sitemap extension). */
  images?: SitemapImage[];
};

const STATIC_ENTRIES: Entry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/servers", changefreq: "daily", priority: "0.9" },
  { path: "/staff", changefreq: "daily", priority: "0.7" },
  { path: "/vip", changefreq: "monthly", priority: "0.6" },
  { path: "/add-server", changefreq: "monthly", priority: "0.6" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
];

function toW3C(value?: string | null): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().replace(/\.\d{3}Z$/, "+00:00");
}

function newest(entries: Entry[]): string | undefined {
  const times = entries.map((e) => e.lastmod).filter(Boolean).sort() as string[];
  return times.length ? times[times.length - 1] : undefined;
}

function xmlEscape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Len absolútne http(s) URL, bez duplicít, max 1000 na stránku. */
function toImages(urls: unknown, title: string, caption?: string): SitemapImage[] | undefined {
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

function renderImages(images?: SitemapImage[]): string[] {
  return (images ?? []).flatMap((img) =>
    [
      "    <image:image>",
      `      <image:loc>${xmlEscape(img.loc)}</image:loc>`,
      img.title ? `      <image:title>${xmlEscape(img.title)}</image:title>` : null,
      img.caption ? `      <image:caption>${xmlEscape(img.caption)}</image:caption>` : null,
      "    </image:image>",
    ].filter(Boolean) as string[]
  );
}

function render(entries: Entry[]) {
  const urls = entries.map((e) =>
    [
      "  <url>",
      `    <loc>${xmlEscape(BASE_URL + e.path)}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      ...renderImages(e.images),
      "  </url>",
    ].filter(Boolean).join("\n")
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...urls,
    "</urlset>",
  ].join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );

    const [{ data: servers }, { data: posts }] = await Promise.all([
      supabase.from("servers").select("slug,name,updated_at,images").not("slug", "is", null).limit(45000),
      supabase.from("staff_posts").select("slug,position,updated_at,images").eq("is_active", true)
        .not("slug", "is", null).limit(45000),
    ]);

    const serverEntries: Entry[] = (servers ?? []).map((s) => ({
      path: `/server/${s.slug}`,
      changefreq: "weekly",
      priority: "0.8",
      lastmod: toW3C(s.updated_at),
      images: toImages(
        s.images,
        s.name || s.slug,
        `Minecraft server ${s.name || s.slug} na MCServery`,
      ),
    }));
    const staffEntries: Entry[] = (posts ?? []).map((p) => ({
      path: `/staff/${p.slug}`,
      changefreq: "weekly",
      priority: "0.6",
      lastmod: toW3C(p.updated_at),
      images: toImages(
        p.images,
        p.position ? `Nábor: ${p.position}` : p.slug,
        "Nábor do A-teamu na MCServery",
      ),
    }));

    const newestServer = newest(serverEntries);
    const newestStaff = newest(staffEntries);
    const newestAny = newest([...serverEntries, ...staffEntries]);

    const statics = STATIC_ENTRIES.map((e) => {
      if (e.path === "/servers" && newestServer) return { ...e, lastmod: newestServer };
      if (e.path === "/staff" && newestStaff) return { ...e, lastmod: newestStaff };
      if (e.path === "/" && newestAny) return { ...e, lastmod: newestAny };
      return e;
    });

    const xml = render([...statics, ...serverEntries, ...staffEntries]);

    // Hlavičky staviame cez Headers, aby nevznikla duplicitná Content-Type
    // (corsHeaders môže obsahovať vlastnú hodnotu v inom zápise).
    const headers = new Headers(corsHeaders);
    headers.set("Content-Type", "application/xml; charset=utf-8");
    // Krátka cache – zmena profilu sa prejaví do minúty, žiadny pre-cache.
    headers.set("Cache-Control", "public, max-age=60, s-maxage=60, must-revalidate");
    // Validátory pre podmienené požiadavky crawlerov.
    const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(xml));
    const etag = `"${Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("")}"`;
    headers.set("ETag", etag);
    const lastmod = newestAny ? new Date(newestAny) : new Date();
    headers.set("Last-Modified", lastmod.toUTCString());

    if (req.headers.get("if-none-match") === etag) {
      return new Response(null, { status: 304, headers });
    }

    return new Response(req.method === "HEAD" ? null : xml, { headers });
  } catch (e) {
    console.error("sitemap error", e);
    const headers = new Headers(corsHeaders);
    headers.set("Content-Type", "text/plain; charset=utf-8");
    headers.set("Cache-Control", "no-store");
    return new Response("sitemap generation failed", { status: 500, headers });
  }
});

