import { formatVersion } from "@/components/VersionBadge";
import { ORGANIZATION_JSON_LD, buildWebPageJsonLd } from "@/lib/pageJsonLd";

export interface ServerJsonLdInput {
  name: string;
  description: string;
  version?: string | null;
  likesCount?: number | null;
  /** Edície servera z profilu, napr. ["Java", "Bedrock"]. */
  platform?: string[] | null;
  /** Zvolený loader/software, napr. "Paper", "Spigot", "Purpur". */
  software?: string | null;
  /** Kanonická URL profilu servera. */
  url?: string | null;
  /** Hlavný obrázok profilu (absolútna URL). */
  image?: string | null;
  /** IP adresa servera — pomáha vyhľadávačom pochopiť, o aký server ide. */
  ip?: string | null;
  /** Kapacita servera. */
  maxPlayers?: number | null;
  /** Tagy / minihry ako kľúčové slová. */
  keywords?: string[] | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}


/**
 * Softvérová verzia v JSON-LD musí byť vždy v rovnakom tvare ako odznak: `vX.Y` (prípadne `vX.Y.Z`).
 * Vracia null pre prázdnu, nečíselnú alebo neúplnú hodnotu (napr. samotné "26").
 */
export const toSoftwareVersion = (version?: string | null): string | null => {
  const label = formatVersion(version);
  if (!label) return null;
  return /^v\d+(\.\d+){1,3}$/.test(label) ? label : null;
};

/** True, ak JSON-LD `softwareVersion` zodpovedá zadanej verzii servera. */
export const isSoftwareVersionConsistent = (
  jsonLd: Record<string, unknown>,
  version?: string | null
): boolean => {
  const expectedVersion = toSoftwareVersion(version);
  const keywords = jsonLd.keywords;
  const versionKeywords = Array.isArray(keywords)
    ? keywords.filter((keyword): keyword is string => typeof keyword === "string" && /^v\\d+(\\.\\d+){1,3}$/.test(keyword))
    : [];

  return expectedVersion
    ? versionKeywords.includes(expectedVersion)
    : versionKeywords.length === 0;
};

/** Normalizované edície (Java/Bedrock) presne podľa nastavení profilu servera. */
export const toEditions = (platform?: string[] | null): string[] => {
  const seen = new Set<string>();
  return (platform ?? [])
    .map((p) => (p || "").trim())
    .filter(Boolean)
    .map((p) => {
      const lower = p.toLowerCase();
      if (lower === "java") return "Java";
      if (lower === "bedrock") return "Bedrock";
      return p;
    })
    .filter((p) => (seen.has(p) ? false : (seen.add(p), true)));
};

/** `operatingSystem` odráža edície, na ktorých sa dá hrať (Minecraft Java / Bedrock). */
export const toOperatingSystem = (platform?: string[] | null): string => {
  const editions = toEditions(platform);
  const loader = toLoader(software);
  const keywordList = [
    ...editions.map((edition) => `Minecraft ${edition} Edition`),
    loader,
    toSoftwareVersion(version),
    ...(keywords ?? []),
  ].map((keyword) => (keyword ?? "").trim()).filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    description,
    url: url || undefined,
    image: image || undefined,
    inLanguage: "sk",
    datePublished: createdAt || undefined,
    dateModified: updatedAt || createdAt || undefined,
    publisher: {
      "@type": "Organization",
      name: "MCServery",
      url: "https://mcservery.one",
    },
    keywords: keywordList.length > 0 ? [...new Set(keywordList)] : undefined,
  };
};

/** Drobečková navigácia Domov → Servery → profil, aby Google zobrazil cestu vo výsledkoch. */
export const buildServerBreadcrumbJsonLd = (
  name: string,
  path: string
): Record<string, unknown> => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Domov", item: "https://mcservery.one/" },
    { "@type": "ListItem", position: 2, name: "Servery", item: "https://mcservery.one/servers" },
    { "@type": "ListItem", position: 3, name, item: `https://mcservery.one${path}` },
  ],
});



const SITE_URL = "https://mcservery.one";

export interface ServerMetaInput {
  name: string;
  ip: string;
  description?: string | null;
  version?: string | null;
  slug?: string | null;
  image?: string | null;
  likesCount?: number | null;
  platform?: string[] | null;
  software?: string | null;
  maxPlayers?: number | null;
  tags?: string[] | null;
  minigames?: string[] | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}


/** Jednotný zdroj title/description/JSON-LD pre profil servera (formulár aj profil). */
export const buildServerMeta = (server: ServerMetaInput) => {
  const versionLabel = toSoftwareVersion(server.version);
  const versionSuffix = versionLabel ? ` Verzia ${versionLabel}.` : "";
  const baseDesc = (server.description || `${server.name} — Minecraft server ${server.ip}.`)
    .replace(/\s+/g, " ")
    .trim();
  const description = `${baseDesc.slice(0, Math.max(0, 155 - versionSuffix.length)).trim()}${versionSuffix}`;
  const title = versionLabel
    ? `${server.name} ${versionLabel} — Minecraft server | MCServery`
    : `${server.name} — Minecraft server | MCServery`;
  const path = `/server/${server.slug ?? ""}`;
  const url = `${SITE_URL}${path}`;
  const jsonLd = buildServerJsonLd({
    name: server.name,
    description,
    version: server.version,
    likesCount: server.likesCount,
    platform: server.platform,
    software: server.software,
    url,
    image: server.image,
    ip: server.ip,
    maxPlayers: server.maxPlayers,
    keywords: [...(server.tags ?? []), ...(server.minigames ?? [])],
    createdAt: server.createdAt,
    updatedAt: server.updatedAt,
  });
  return {
    title,
    description,
    path,
    url,
    versionLabel,
    jsonLd,
    breadcrumbJsonLd: buildServerBreadcrumbJsonLd(server.name, path),
    /** Kompletná sada structured data pre profil servera. */
    jsonLdGraph: [
      jsonLd,
      buildServerBreadcrumbJsonLd(server.name, path),
      buildWebPageJsonLd({ name: title, description, path }),
      ORGANIZATION_JSON_LD,
    ],
  };
};

const setTag = (selector: string, create: () => HTMLElement, attr: string, value: string) => {
  document.head.querySelectorAll(selector).forEach((el) => {
    if (!el.hasAttribute("data-rh")) el.remove();
  });
  let el = document.head.querySelector<HTMLElement>(`${selector}[data-rh]`);
  if (!el) {
    el = create();
    el.setAttribute("data-rh", "true");
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
};

/**
 * Okamžite prepíše <title> a všetky meta tagy pre sociálne siete — bez čakania
 * na nové načítanie stránky (volané hneď po uložení editácie servera).
 */
export const applyServerHeadMeta = (server: ServerMetaInput) => {
  if (typeof document === "undefined") return;
  const meta = buildServerMeta(server);
  const image = server.image || undefined;

  document.title = meta.title;

  const metaTag = (key: "name" | "property", key2: string, content: string) =>
    setTag(
      `meta[${key}="${key2}"]`,
      () => {
        const el = document.createElement("meta");
        el.setAttribute(key, key2);
        return el;
      },
      "content",
      content
    );

  metaTag("name", "description", meta.description);
  metaTag("property", "og:title", meta.title);
  metaTag("property", "og:description", meta.description);
  metaTag("property", "og:type", "article");
  metaTag("property", "og:url", meta.url);
  metaTag("name", "twitter:card", "summary_large_image");
  metaTag("name", "twitter:title", meta.title);
  metaTag("name", "twitter:description", meta.description);
  if (image) {
    metaTag("property", "og:image", image);
    metaTag("name", "twitter:image", image);
  }

  setTag(
    'link[rel="canonical"]',
    () => {
      const el = document.createElement("link");
      el.setAttribute("rel", "canonical");
      return el;
    },
    "href",
    meta.url
  );

  document.head
    .querySelectorAll('script[type="application/ld+json"]')
    .forEach((el) => el.remove());
  meta.jsonLdGraph.forEach((entry) => {
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.setAttribute("data-rh", "true");
    ld.textContent = JSON.stringify(entry);
    document.head.appendChild(ld);
  });

  return meta;
};
