// Po `vite build` predgeneruje statické HTML pre profily serverov (dist/server/<slug>/index.html)
// s presnými Open Graph / Twitter / JSON-LD metadátami vrátane verzie (napr. v26.2).
// Crawleri (Facebook, Twitter/X, LinkedIn, Discord) nespúšťajú JS, takže vidia až tieto tagy.

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";

const BASE_URL = "https://mcservery.one";
const DIST = resolve("dist");
// Strop, aby publish nikdy neprekročil limity výstupu.
const MAX_PAGES = Number(process.env.PRERENDER_MAX_PAGES ?? 5000);

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

/** Rovnaká normalizácia ako VersionBadge/JSON-LD: `vX.Y` alebo null. */
export function formatVersion(version?: string | null): string | null {
  const raw = (version ?? "").trim().replace(/^v/i, "").trim();
  if (!/^\d+(\.\d+){1,3}$/.test(raw)) return null;
  return `v${raw}`;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

interface ServerRow {
  slug: string | null;
  name: string;
  ip: string;
  description: string | null;
  version: string | null;
  images: string[] | null;
  likes_count: number | null;
  updated_at?: string | null;
}

async function fetchServers(): Promise<ServerRow[]> {
  const url = readEnv("VITE_SUPABASE_URL");
  const key = readEnv("VITE_SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) {
    console.warn("prerender: chýbajú Supabase env premenné, preskakujem");
    return [];
  }
  const res = await fetch(
    `${url}/rest/v1/servers?select=slug,name,ip,description,version,images,likes_count,updated_at&slug=not.is.null&limit=${MAX_PAGES}`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  );
  if (!res.ok) {
    console.warn("prerender: načítanie serverov zlyhalo", res.status);
    return [];
  }
  return (await res.json()) as ServerRow[];
}

function buildHead(server: ServerRow) {
  const versionLabel = formatVersion(server.version);
  const versionSuffix = versionLabel ? ` Verzia ${versionLabel}.` : "";
  const baseDesc = (server.description || `${server.name} — Minecraft server ${server.ip}.`)
    .replace(/\s+/g, " ")
    .trim();
  const description = `${baseDesc.slice(0, Math.max(0, 155 - versionSuffix.length)).trim()}${versionSuffix}`;
  const title = versionLabel
    ? `${server.name} ${versionLabel} — Minecraft server | MCServery`
    : `${server.name} — Minecraft server | MCServery`;
  const canonical = `${BASE_URL}/server/${server.slug}`;
  const image = server.images && server.images.length > 0 ? server.images[0] : undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: server.name,
    description,
    url: canonical,
    ...(image ? { image } : {}),
    inLanguage: "sk",
    ...(server.updated_at ? { dateModified: server.updated_at } : {}),
    publisher: {
      "@type": "Organization",
      name: "MCServery",
      url: BASE_URL,
    },
  };

  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${esc(canonical)}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:url" content="${esc(canonical)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    image ? `<meta property="og:image" content="${esc(image)}" />` : null,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    image ? `<meta name="twitter:image" content="${esc(image)}" />` : null,
    `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
  ]
    .filter(Boolean)
    .join("\n    ");
}

/** Z template HTML odstráni sitewide meta, ktoré nahrádzame per-stránku. */
function stripSitewideMeta(html: string): string {
  return html
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\s+name="description"[^>]*>/gi, "")
    .replace(/<link\s+rel="canonical"[^>]*>/gi, "")
    .replace(/<meta\s+property="og:(url|title|description|type|image)"[^>]*>/gi, "")
    .replace(/<meta\s+name="twitter:(card|title|description|image)"[^>]*>/gi, "")
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/gi, "");
}


/** SEO metadáta kategórií — musia zostať synchronizované s CategoryPage.tsx. */
const CATEGORY_PAGES = {
  survival: {
    title: "Minecraft Survival servery",
    description: "Nájdi Minecraft Survival servery na MCServery. Porovnaj slovenské a české servery, verzie Minecraftu, Java a Bedrock a vyber si svet na hranie.",
  },
  skyblock: {
    title: "Minecraft SkyBlock servery",
    description: "Objav Minecraft SkyBlock servery. Začni na malom ostrove, rozvíjaj svoju ekonomiku a porovnaj herné možnosti slovenských a českých serverov.",
  },
  bedwars: {
    title: "Minecraft BedWars servery",
    description: "Nájdi Minecraft BedWars servery a zahraj si tímové PvP. Porovnaj dostupné servery, podporované verzie a Java alebo Bedrock edíciu.",
  },
  skywars: {
    title: "Minecraft SkyWars servery",
    description: "Prezri si Minecraft SkyWars servery. Súťaž v PvP na ostrovoch, zbieraj výbavu a nájdi server kompatibilný s tvojou verziou Minecraftu.",
  },
  pvp: {
    title: "Minecraft PvP servery",
    description: "Nájdi Minecraft PvP servery pre duely, KitPvP a súťažné súboje. Porovnaj herné režimy, verzie a dostupné edície na MCServery.",
  },
  smp: {
    title: "Minecraft SMP servery",
    description: "Objav Minecraft SMP servery pre spoločné survival hranie. Nájdi komunitný svet, pozri si podporované verzie a vyber si server pre seba a kamarátov.",
  },
} as const;

function buildCategoryHead(slug: keyof typeof CATEGORY_PAGES) {
  const category = CATEGORY_PAGES[slug];
  const path = `/minecraft-servery/${slug}`;
  const canonical = `${BASE_URL}${path}`;
  const graph = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: category.title,
      description: category.description,
      url: canonical,
      inLanguage: "sk",
      isPartOf: { "@type": "WebSite", name: "MCServery", url: BASE_URL },
      publisher: { "@type": "Organization", name: "MCServery", url: BASE_URL },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Domov", item: `${BASE_URL}/` },
        { "@type": "ListItem", position: 2, name: "Servery", item: `${BASE_URL}/servers` },
        { "@type": "ListItem", position: 3, name: category.title, item: canonical },
      ],
    },
  ];
  return [
    `<title>${esc(`${category.title} | MCServery`)}</title>`,
    `<meta name="description" content="${esc(category.description)}" />`,
    `<link rel="canonical" href="${esc(canonical)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${esc(canonical)}" />`,
    `<meta property="og:title" content="${esc(`${category.title} | MCServery`)}" />`,
    `<meta property="og:description" content="${esc(category.description)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(`${category.title} | MCServery`)}" />`,
    `<meta name="twitter:description" content="${esc(category.description)}" />`,
    ...graph.map((item) => `<script type="application/ld+json">${JSON.stringify(item)}</script>`),
  ].join("\\n    ");
}

async function main() {
  const templatePath = resolve(DIST, "index.html");
  if (!existsSync(templatePath)) {
    console.warn("prerender: dist/index.html neexistuje — spusti najprv build");
    return;
  }
  const template = readFileSync(templatePath, "utf8");
  const servers = (await fetchServers()).filter((s) => s.slug).slice(0, MAX_PAGES);

  let written = 0;
  for (const server of servers) {
    const html = stripSitewideMeta(template).replace("</head>", `  ${buildHead(server)}\n  </head>`);
    const out = resolve(DIST, "server", server.slug!, "index.html");
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, html);
    written++;
  }
  console.log(`prerender: vygenerovaných ${written} profilov serverov`);

  let categoriesWritten = 0;
  for (const slug of Object.keys(CATEGORY_PAGES) as (keyof typeof CATEGORY_PAGES)[]) {
    const html = stripSitewideMeta(template).replace("</head>", `  ${buildCategoryHead(slug)}\\n  </head>`);
    const out = resolve(DIST, "minecraft-servery", slug, "index.html");
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, html);
    categoriesWritten++;
  }
  console.log(`prerender: vygenerovaných ${categoriesWritten} SEO kategórií`);
}

main();
