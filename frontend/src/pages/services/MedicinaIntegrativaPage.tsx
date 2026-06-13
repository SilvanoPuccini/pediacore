import {
  Leaf,
  Microscope,
  Pill,
  FlaskConical,
  Clock,
  MapPin,
  Users,
} from "lucide-react";
import ServiceDetailPage from "./ServiceDetailPage";
import type { ServiceDetailPageProps } from "./ServiceDetailPage";

const ACCENT_BG = "rgba(249,115,22,0.18)";
const ACCENT_COLOR = "#EA580C";

const data: ServiceDetailPageProps = {
  title: "Medicina",
  titleAccent: "integrativa",
  description:
    "Enfoque funcional e integrativo que complementa la pediatría tradicional. Evaluamos al niño como un todo: alimentación, sueño, ambiente y micronutrientes.",
  metaDescription:
    "Consulta de medicina integrativa pediátrica con la Dra. Estefanía Ortigosa. Enfoque funcional, micronutrientes, salud digestiva y plan personalizado.",
  slug: "medicina-integrativa",
  heroIcon: Leaf,
  heroIconBg: ACCENT_BG,
  heroIconColor: ACCENT_COLOR,
  blobColor1: "#FB923C",
  blobColor2: "#FDBA74",
  ctaLabel: "Reservar consulta",

  quickFacts: [
    {
      icon: Clock,
      label: "45 minutos",
      sub: "Duración de la consulta",
      bg: ACCENT_BG,
      color: ACCENT_COLOR,
    },
    {
      icon: MapPin,
      label: "Presencial",
      sub: "Pucón & Villarrica",
      bg: ACCENT_BG,
      color: ACCENT_COLOR,
    },
    {
      icon: Users,
      label: "0 a 18 años",
      sub: "Todas las edades",
      bg: ACCENT_BG,
      color: ACCENT_COLOR,
    },
  ],

  imageGradient:
    "linear-gradient(135deg, rgba(249,115,22,0.30) 0%, rgba(253,186,116,0.20) 100%)",
  imageLabel: "foto · medicina integrativa",
  priceLabel: "Valor consulta",
  price: "$40.000",
  priceSub: "Presencial",

  includesTitle: "Miramos al niño completo, no solo el síntoma.",
  includesDescription:
    "Combinamos la evidencia de la pediatría clásica con herramientas de medicina funcional para abordar la causa de fondo y no solo lo visible.",
  includes: [
    {
      icon: Microscope,
      iconBg: ACCENT_BG,
      iconColor: ACCENT_COLOR,
      title: "Evaluación funcional",
      description:
        "Análisis integral del niño: alimentación, sueño, tóxicos ambientales y antecedentes familiares.",
    },
    {
      icon: Pill,
      iconBg: ACCENT_BG,
      iconColor: ACCENT_COLOR,
      title: "Micronutrientes",
      description:
        "Suplementación basada en evidencia: hierro, zinc, vitamina D, omega-3 según la necesidad real.",
    },
    {
      icon: FlaskConical,
      iconBg: ACCENT_BG,
      iconColor: ACCENT_COLOR,
      title: "Salud digestiva",
      description:
        "Evaluación del eje intestino-cerebro, probióticos y manejo de intolerancias.",
    },
    {
      icon: Leaf,
      iconBg: ACCENT_BG,
      iconColor: ACCENT_COLOR,
      title: "Plan integrativo",
      description:
        "Indicaciones que combinan lo convencional con lo complementario, adaptadas a tu familia.",
    },
  ],

  steps: [
    {
      title: "Historia completa",
      description:
        "Revisamos antecedentes, alimentación, ambiente, sueño y todo lo que rodea al niño.",
    },
    {
      title: "Evaluación funcional",
      description:
        "Examen físico con mirada integrativa: piel, digestión, energía, neurodesarrollo.",
    },
    {
      title: "Análisis y estudios",
      description:
        "Pedimos exámenes específicos si corresponde: micronutrientes, perfil metabólico, etc.",
    },
    {
      title: "Plan personalizado",
      description:
        "Indicaciones claras que combinan lo mejor de ambos mundos, con seguimiento.",
    },
  ],

  sidePanelEyebrow: "Motivos frecuentes",
  sidePanelTitle: "¿Cuándo consultar?",
  sidePanelDescription:
    "Algunos motivos por los que las familias eligen este enfoque:",
  sidePanelRows: [
    { label: "Infecciones recurrentes", value: "Inmunidad y prevención" },
    { label: "Alergias e intolerancias", value: "Evaluación funcional" },
    { label: "Problemas digestivos", value: "Eje intestino-cerebro" },
    { label: "Cansancio o irritabilidad", value: "Micronutrientes" },
    { label: "Segunda opinión", value: "Mirada integrativa" },
  ],
  sidePanelCallout:
    "La medicina integrativa NO reemplaza la pediatría convencional. La complementa con herramientas adicionales basadas en evidencia.",

  prepEyebrow: "Para tu consulta",
  prepTitle: "Qué llevar",
  checklist: [
    { bold: "Carnet de control", text: "y de vacunas del niño" },
    {
      bold: "Exámenes previos",
      text: "de sangre, digestivos o imágenes si los tiene",
    },
    {
      bold: "Lista de suplementos",
      text: "que ya esté tomando, si los hay",
    },
    {
      bold: "Tus dudas anotadas",
      text: "sobre alimentación, ambiente o suplementación",
    },
  ],

  faqs: [
    {
      question: "¿Qué diferencia tiene con una consulta pediátrica normal?",
      answer:
        "Es una consulta pediátrica completa, pero con mirada funcional: evaluamos causas de fondo, tóxicos ambientales, micronutrientes y herramientas complementarias basadas en evidencia.",
    },
    {
      question: "¿Es segura para niños?",
      answer:
        "Absolutamente. Todo lo que indicamos tiene respaldo científico y se adapta a la edad del niño. No usamos tratamientos experimentales ni reemplazamos vacunas ni medicación necesaria.",
    },
    {
      question: "¿Necesito dejar al pediatra de cabecera?",
      answer:
        "No. La medicina integrativa complementa la atención convencional. Podemos trabajar en conjunto con tu pediatra habitual.",
    },
    {
      question: "¿Puede ser online?",
      answer:
        "La primera consulta integrativa requiere examen físico presencial. Los seguimientos sí pueden ser por videollamada.",
    },
  ],

  ctaHeading: "Miremos a tu hijo con otros ojos",
  ctaDescription:
    "Reservá una consulta integrativa y exploremos juntos un abordaje más completo.",
  ctaButtonLabel: "Reservar consulta",
};

export default function MedicinaIntegrativaPage() {
  return <ServiceDetailPage {...data} />;
}
