import { formatVersion } from "@/components/VersionBadge";

export interface ServerJsonLdInput {
  name: string;
  description: string;
  version?: string | null;
  likesCount?: number | null;
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

export const buildServerJsonLd = ({
  name,
  description,
  version,
  likesCount,
}: ServerJsonLdInput): Record<string, unknown> => ({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name,
  description,
  applicationCategory: "GameApplication",
  operatingSystem: "Minecraft",
  softwareVersion: toSoftwareVersion(version) ?? undefined,
  offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
  aggregateRating:
    likesCount && likesCount > 0
      ? { "@type": "AggregateRating", ratingValue: "5", ratingCount: String(likesCount) }
      : undefined,
});
