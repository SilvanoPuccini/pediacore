import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article";
}

const BASE_TITLE = "Dra. Estefi · Pediatría en Pucón y Villarrica";
const BASE_DESCRIPTION =
  "Pediatría cercana en Pucón y Villarrica. Atención presencial u online desde recién nacidos hasta los 18 años.";
const BASE_URL = "https://estefipediatra.com";
const DEFAULT_IMAGE = "https://estefipediatra.com/images/logo.png";

export default function SEOHead({
  title,
  description = BASE_DESCRIPTION,
  image = DEFAULT_IMAGE,
  url = BASE_URL,
  type = "website",
}: SEOHeadProps) {
  const fullTitle = title ? `${title} · Dra. Estefi` : BASE_TITLE;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:locale" content="es_CL" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Canonical */}
      <link rel="canonical" href={url} />
    </Helmet>
  );
}
