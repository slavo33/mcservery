import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

const SITE_URL = "https://mcservery.one";
const SITE_NAME = "MCServery";
const DEFAULT_IMAGE =
  "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/71064a61-2468-495a-8a10-e4fed12c9c7b/id-preview-7249055f--1d6ba15c-e22f-48ef-9ec4-e516ec56002e.lovable.app-1774020714330.png";

interface SEOProps {
  /** Full page title. Keep under 60 chars. */
  title: string;
  /** Meta description, 50-160 chars. */
  description: string;
  /** Path beginning with "/" — used for canonical and og:url. */
  path: string;
  image?: string;
  type?: "website" | "article";
  /** Extra JSON-LD structured data object(s). */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  noindex?: boolean;
}

const SEO = ({ title, description, path, image, type = "website", jsonLd, noindex }: SEOProps) => {
  const url = `${SITE_URL}${path}`;
  const img = image || DEFAULT_IMAGE;
  const ldArray = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={img} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={img} />

      {ldArray.map((ld, i) => (
        <script type="application/ld+json" key={i}>
          {JSON.stringify(ld)}
        </script>
      ))}
    </Helmet>
  );
};

export default SEO;
