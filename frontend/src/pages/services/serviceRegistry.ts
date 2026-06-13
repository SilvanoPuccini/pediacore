import {
  Baby,
  Stethoscope,
  Video,
  HeartHandshake,
  Apple,
  Moon,
  Leaf,
  Activity,
} from "lucide-react";

export interface ServiceMeta {
  slug: string;
  title: string;
  icon: React.ElementType;
  /** Accent text/icon color */
  color: string;
  /** Accent background (with alpha) */
  bg: string;
  /** Decorative blob – primary */
  blobColor1: string;
  /** Decorative blob – secondary */
  blobColor2: string;
}

/**
 * Ordered list of all services.
 * Related-services logic uses this order (circular: next 3 after current).
 *
 * Color palette — 8 hues spaced across the full wheel:
 *   teal · orange · violet · amber · emerald · blue · fuchsia · red
 */
export const SERVICE_REGISTRY: ServiceMeta[] = [
  {
    slug: "control-nino-sano",
    title: "Control de niño sano",
    icon: Baby,
    color: "#0D9488",
    bg: "rgba(13,148,136,0.15)",
    blobColor1: "#14B8A6",
    blobColor2: "#5EEAD4",
  },
  {
    slug: "control-enfermedad",
    title: "Control por enfermedad",
    icon: Stethoscope,
    color: "#EA580C",
    bg: "rgba(234,88,12,0.15)",
    blobColor1: "#FB923C",
    blobColor2: "#FDBA74",
  },
  {
    slug: "telemedicina",
    title: "Telemedicina",
    icon: Video,
    color: "#7C3AED",
    bg: "rgba(124,58,237,0.15)",
    blobColor1: "#A78BFA",
    blobColor2: "#C4B5FD",
  },
  {
    slug: "asesoria-lactancia",
    title: "Asesoría de lactancia",
    icon: HeartHandshake,
    color: "#D97706",
    bg: "rgba(217,119,6,0.18)",
    blobColor1: "#FBBF24",
    blobColor2: "#FDE68A",
  },
  {
    slug: "alimentacion-infantil",
    title: "Alimentación infantil",
    icon: Apple,
    color: "#059669",
    bg: "rgba(5,150,105,0.15)",
    blobColor1: "#34D399",
    blobColor2: "#6EE7B7",
  },
  {
    slug: "sueno-desarrollo",
    title: "Sueño y desarrollo",
    icon: Moon,
    color: "#2563EB",
    bg: "rgba(37,99,235,0.15)",
    blobColor1: "#60A5FA",
    blobColor2: "#93C5FD",
  },
  {
    slug: "medicina-integrativa",
    title: "Medicina integrativa",
    icon: Leaf,
    color: "#A21CAF",
    bg: "rgba(192,38,211,0.12)",
    blobColor1: "#E879F9",
    blobColor2: "#F0ABFC",
  },
  {
    slug: "rcp-infantil",
    title: "RCP infantil",
    icon: Activity,
    color: "#DC2626",
    bg: "rgba(220,38,38,0.15)",
    blobColor1: "#F87171",
    blobColor2: "#FCA5A5",
  },
];

/**
 * Returns `count` related services by picking the next ones
 * in the circular list after the current slug.
 */
export function getRelatedServices(
  currentSlug: string,
  count = 3,
): ServiceMeta[] {
  const idx = SERVICE_REGISTRY.findIndex((s) => s.slug === currentSlug);
  if (idx === -1) return SERVICE_REGISTRY.slice(0, count);
  const result: ServiceMeta[] = [];
  for (let i = 1; result.length < count; i++) {
    result.push(SERVICE_REGISTRY[(idx + i) % SERVICE_REGISTRY.length]);
  }
  return result;
}
