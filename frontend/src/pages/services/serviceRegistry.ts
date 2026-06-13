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
    color: "#F9A8D4",
    bg: "rgba(249,168,212,0.25)",
    blobColor1: "#FBCFE8",
    blobColor2: "#FCE7F3",
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
    color: "#6EE7B7",
    bg: "rgba(110,231,183,0.25)",
    blobColor1: "#A7F3D0",
    blobColor2: "#D1FAE5",
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
    color: "#FDBA74",
    bg: "rgba(253,186,116,0.25)",
    blobColor1: "#FED7AA",
    blobColor2: "#FFEDD5",
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
