const SITE_URL = "https://mcservery.one";

/** Organizácia prevádzkujúca web — opakuje sa v grafe každej verejnej stránky. */
export const ORGANIZATION_JSON_LD: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "MCServery",
  url: SITE_URL,
  description: "Databáza Minecraft serverov.",
};

export interface PageJsonLdInput {
  name: string;
  description: string;
  /** Cesta začínajúca "/" — použije sa pre `url` a drobečkovú navigáciu. */
  path: string;
  /** Voliteľné drobečky ako dvojice [názov, cesta] okrem domovskej stránky. */
  breadcrumbs?: [string, string][];
}

/** WebPage entita pre verejnú stránku (okrem profilov serverov). */
export const buildWebPageJsonLd = ({
  name,
  description,
  path,
}: PageJsonLdInput): Record<string, unknown> => ({
  "@context": "https://schema.org",
  "@type": "WebPage",
  name,
  description,
  url: `${SITE_URL}${path === "/" ? "/" : path}`,
  inLanguage: "sk",
  isPartOf: {
    "@type": "WebSite",
    name: "MCServery",
    url: SITE_URL,
  },
  publisher: ORGANIZATION_JSON_LD["@type"]
    ? { "@type": "Organization", name: "MCServery", url: SITE_URL }
    : undefined,
});

export const buildBreadcrumbJsonLd = (
  breadcrumbs: [string, string][]
): Record<string, unknown> => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [["Domov", "/"], ...breadcrumbs].map(([name, path], i) => ({
    "@type": "ListItem",
    position: i + 1,
    name,
    item: `${SITE_URL}${path}`,
  })),
});

/** Kompletný graf pre verejnú stránku: WebPage + Organization (+ drobečky). */
export const buildPageJsonLdGraph = (input: PageJsonLdInput): Record<string, unknown>[] => [
  buildWebPageJsonLd(input),
  ORGANIZATION_JSON_LD,
  ...(input.breadcrumbs && input.breadcrumbs.length
    ? [buildBreadcrumbJsonLd(input.breadcrumbs)]
    : []),
];
