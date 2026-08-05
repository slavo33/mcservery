import { formatVersion } from "@/components/VersionBadge";

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
): boolean => jsonLd.softwareVersion === (toSoftwareVersion(version) ?? undefined);

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
  return editions.length > 0
    ? editions.map((e) => `Minecraft ${e} Edition`).join(", ")
    : "Minecraft";
};

/** Loader/software servera (Paper, Spigot, Purpur, …) — prázdne hodnoty sa vynechajú. */
export const toLoader = (software?: string | null): string | undefined => {
  const value = (software || "").trim();
  if (!value || value.toLowerCase() === "žiadny") return undefined;
  return value;
};

export const buildServerJsonLd = ({
  name,
  description,
  version,
  likesCount,
  platform,
  software,
}: ServerJsonLdInput): Record<string, unknown> => {
  const editions = toEditions(platform);
  const loader = toLoader(software);
  const properties = [
    editions.length > 0
      ? { "@type": "PropertyValue", name: "Edition", value: editions.join(", ") }
      : null,
    loader ? { "@type": "PropertyValue", name: "Server software", value: loader } : null,
  ].filter(Boolean) as Record<string, string>[];
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name,
    description,
    applicationCategory: "GameApplication",
    applicationSubCategory: editions.length > 0 ? `Minecraft ${editions.join(" / ")}` : undefined,
    operatingSystem: toOperatingSystem(platform),
    softwareVersion: toSoftwareVersion(version) ?? undefined,
    runtimePlatform: loader,
    additionalProperty: properties.length > 0 ? properties : undefined,

    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    aggregateRating:
      likesCount && likesCount > 0
        ? { "@type": "AggregateRating", ratingValue: "5", ratingCount: String(likesCount) }
        : undefined,
  };
};


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
  return {
    title,
    description,
    path,
    url: `${SITE_URL}${path}`,
    versionLabel,
    jsonLd: buildServerJsonLd({
      name: server.name,
      description,
      version: server.version,
      likesCount: server.likesCount,
      platform: server.platform,
      software: server.software,
    }),

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
  const ld = document.createElement("script");
  ld.type = "application/ld+json";
  ld.setAttribute("data-rh", "true");
  ld.textContent = JSON.stringify(meta.jsonLd);
  document.head.appendChild(ld);

  return meta;
};
