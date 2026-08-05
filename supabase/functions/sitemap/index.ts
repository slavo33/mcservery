// Živá sitemapa – generuje sa pri každom požiadavku priamo z databázy,
// takže <lastmod> odráža úpravu profilu okamžite (bez čakania na build).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const BASE_URL = "https://mcservery.one";

type Entry = {
  path: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
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

function render(entries: Entry[]) {
  const urls = entries.map((e) =>
    [
      "  <url>",
      `    <loc>${xmlEscape(BASE_URL + e.path)}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      "  </url>",
    ].filter(Boolean).join("\n")
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
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
      supabase.from("servers").select("slug,updated_at").not("slug", "is", null).limit(45000),
      supabase.from("staff_posts").select("slug,updated_at").eq("is_active", true)
        .not("slug", "is", null).limit(45000),
    ]);

    const serverEntries: Entry[] = (servers ?? []).map((s) => ({
      path: `/server/${s.slug}`,
      changefreq: "weekly",
      priority: "0.8",
      lastmod: toW3C(s.updated_at),
    }));
    const staffEntries: Entry[] = (posts ?? []).map((p) => ({
      path: `/staff/${p.slug}`,
      changefreq: "weekly",
      priority: "0.6",
      lastmod: toW3C(p.updated_at),
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

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        // Krátka cache – zmena profilu sa prejaví do minúty.
        "Cache-Control": "public, max-age=60, s-maxage=60",
      },
    });
  } catch (e) {
    console.error("sitemap error", e);
    return new Response("sitemap generation failed", {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  }
});
