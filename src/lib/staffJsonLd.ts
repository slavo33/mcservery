import { ORGANIZATION_JSON_LD, buildBreadcrumbJsonLd } from "@/lib/pageJsonLd";

const SITE_URL = "https://mcservery.one";

export interface StaffPostJsonLdInput {
  /** Názov pozície, napr. "Helper". */
  position: string;
  /** Popis inzerátu (už orezaný na rozumnú dĺžku). */
  description: string;
  /** Slug inzerátu — cesta /staff/<slug>. */
  slug: string;
  /** Názov servera, pre ktorý sa naberá. */
  serverName?: string | null;
  /** Kanonická cesta profilu servera, napr. "/server/mcservery-one". */
  serverPath?: string | null;
  /** ISO dátum vytvorenia inzerátu. */
  createdAt: string;
  /** Absolútna URL hlavného obrázka inzerátu. */
  image?: string | null;
  /** Požiadavky na uchádzača. */
  requirements?: string | null;
}

/** Inzerát je aktívny 6 mesiacov od zverejnenia — Google vyžaduje `validThrough`. */
export const staffValidThrough = (createdAt: string): string => {
  const d = new Date(createdAt);
  const base = Number.isNaN(d.getTime()) ? new Date() : d;
  const end = new Date(base);
  end.setMonth(end.getMonth() + 6);
  return end.toISOString();
};

/** JobPosting entita pre detail náborového inzerátu. */
export const buildStaffPostJsonLd = ({
  position,
  description,
  slug,
  serverName,
  createdAt,
  image,
  requirements,
}: StaffPostJsonLdInput): Record<string, unknown> => {
  const org = serverName?.trim() || "MCServery";
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: position,
    name: `${position}${serverName ? ` — ${serverName}` : ""}`,
    description,
    datePosted: createdAt,
    validThrough: staffValidThrough(createdAt),
    employmentType: "VOLUNTEER",
    jobLocationType: "TELECOMMUTE",
    directApply: false,
    url: `${SITE_URL}/staff/${slug}`,
    industry: "Minecraft server",
    applicantLocationRequirements: { "@type": "Country", name: "Slovakia" },
    hiringOrganization: {
      "@type": "Organization",
      name: org,
      url: SITE_URL,
    },
    inLanguage: "sk",
  };
  if (image) node.image = image;
  if (requirements?.trim()) node.qualifications = requirements.trim().slice(0, 500);
  return node;
};

/** Kompletný graf pre /staff/<slug>: JobPosting + Organization + drobečky. */
export const buildStaffPostJsonLdGraph = (
  input: StaffPostJsonLdInput
): Record<string, unknown>[] => [
  buildStaffPostJsonLd(input),
  ORGANIZATION_JSON_LD,
  buildBreadcrumbJsonLd([
    ["Nábor staff", "/staff"],
    [
      `${input.position}${input.serverName ? ` — ${input.serverName}` : ""}`,
      `/staff/${input.slug}`,
    ],
  ]),
];
