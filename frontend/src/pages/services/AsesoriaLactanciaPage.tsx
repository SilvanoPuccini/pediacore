import {
  Milk,
  HandHeart,
  Droplets,
  HeartPulse,
  FileText,
  Baby,
  Stethoscope,
  Video,
  Clock,
  MapPin,
  Users,
} from "lucide-react";
import ServiceDetailPage from "./ServiceDetailPage";
import type { ServiceDetailPageProps } from "./ServiceDetailPage";

const MUSTARD_BG = "rgba(229,184,71,0.30)";
const MUSTARD_COLOR = "#8A6A1F";
const TEAL_BG = "rgba(123,181,189,0.22)";
const TEAL_COLOR = "#4A8590";
const CORAL_BG = "rgba(243,168,161,0.28)";
const CORAL_COLOR = "#B5604F";
const PURPLE_BG = "rgba(196,181,253,0.30)";
const PURPLE_COLOR = "#6B569E";

const data: ServiceDetailPageProps = {
  title: "Asesoría de",
  titleAccent: "lactancia",
  description:
    "Acompañamiento individualizado en lactancia materna: acople, técnica, producción láctea y dudas frecuentes. Sin presiones, a tu ritmo.",
  metaDescription:
    "Asesoría de lactancia materna con la Dra. Estefanía Ortigosa en Pucón y Villarrica. Acople, técnica, producción láctea y acompañamiento personalizado.",
  slug: "asesoria-lactancia",
  heroIcon: Milk,
  heroIconBg: MUSTARD_BG,
  heroIconColor: MUSTARD_COLOR,
  blobColor1: "#7BB5BD",
  blobColor2: "#E5B847",
  ctaLabel: "Reservar asesoría",

  quickFacts: [
    {
      icon: Clock,
      label: "45 minutos",
      sub: "Duración de la sesión",
      bg: MUSTARD_BG,
      color: MUSTARD_COLOR,
    },
    {
      icon: MapPin,
      label: "Presencial u online",
      sub: "Vos elegís",
      bg: MUSTARD_BG,
      color: MUSTARD_COLOR,
    },
    {
      icon: Users,
      label: "Embarazo +",
      sub: "Desde antes de nacer",
      bg: MUSTARD_BG,
      color: MUSTARD_COLOR,
    },
  ],

  imageGradient:
    "linear-gradient(135deg, rgba(229,184,71,0.40) 0%, rgba(243,168,161,0.22) 100%)",
  imageLabel: "foto · asesoría de lactancia",
  priceLabel: "Valor sesión",
  price: "$40.000",
  priceSub: "Presencial u online",

  includesTitle: "Una lactancia más tranquila y posible.",
  includesDescription:
    "Cada díada mamá-bebé es única. Evaluamos tu situación particular y armamos un plan realista, con técnica concreta y mucho acompañamiento.",
  includes: [
    {
      icon: HandHeart,
      iconBg: MUSTARD_BG,
      iconColor: MUSTARD_COLOR,
      title: "Acople y técnica",
      description:
        "Evaluamos posiciones y agarre para prevenir grietas y dolor, y mejorar la transferencia de leche.",
    },
    {
      icon: Droplets,
      iconBg: MUSTARD_BG,
      iconColor: MUSTARD_COLOR,
      title: "Producción láctea",
      description:
        "Estrategias para aumentar o regular la producción según las necesidades de tu bebé.",
    },
    {
      icon: HeartPulse,
      iconBg: MUSTARD_BG,
      iconColor: MUSTARD_COLOR,
      title: "Dificultades comunes",
      description:
        "Grietas, mastitis, baja de peso, confusión tetina-pezón y rechazo del pecho.",
    },
    {
      icon: FileText,
      iconBg: MUSTARD_BG,
      iconColor: MUSTARD_COLOR,
      title: "Plan y contención",
      description:
        "Un plan claro y realista, con seguimiento por mensaje y mucho apoyo emocional.",
    },
  ],

  steps: [
    {
      title: "Conversamos tu historia",
      description:
        "Cómo viene la lactancia, qué te preocupa y qué te gustaría lograr.",
    },
    {
      title: "Observamos una toma",
      description:
        "Vemos al bebé mamando para evaluar el acople, la postura y la succión.",
    },
    {
      title: "Ajustamos la técnica",
      description:
        "Corregimos posiciones y agarre en el momento, con indicaciones prácticas.",
    },
    {
      title: "Armamos tu plan",
      description:
        "Definimos próximos pasos, frecuencia y seguimiento según tu caso.",
    },
  ],

  sidePanelEyebrow: "Motivos frecuentes",
  sidePanelTitle: "¿Cuándo pedir asesoría?",
  sidePanelDescription: "Algunos motivos por los que las mamás reservan:",
  sidePanelRows: [
    { label: "Dolor al amamantar", value: "Grietas, mal acople" },
    { label: "Bebé que no sube de peso", value: "Evaluar transferencia" },
    { label: "Dudas de producción", value: "¿Tengo suficiente leche?" },
    { label: "Vuelta al trabajo", value: "Extracción y conservación" },
    { label: "Preparación prenatal", value: "Antes de que nazca" },
  ],
  sidePanelCallout:
    "La asesoría se puede hacer presencial u online. Para evaluar el acople en vivo, la videollamada también funciona muy bien.",

  prepEyebrow: "Para tu sesión",
  prepTitle: "Qué tener a mano",
  checklist: [
    {
      bold: "A tu bebé",
      text: "idealmente con algo de hambre para observar una toma",
    },
    { bold: "Cojín de lactancia", text: "si lo usás habitualmente" },
    {
      bold: "Extractor",
      text: "y mamaderas si querés que revisemos su uso",
    },
    {
      bold: "Tus dudas anotadas",
      text: "por más pequeñas que parezcan",
    },
  ],

  faqs: [
    {
      question: "¿Desde cuándo puedo consultar?",
      answer:
        "Desde el embarazo para prepararte. También en los primeros días posparto, que es cuando surgen más dudas, y en cualquier momento durante la lactancia.",
    },
    {
      question: "¿Sirve la asesoría online?",
      answer:
        "Sí. Por videollamada puedo observar la postura, el agarre y una toma, y orientarte con indicaciones prácticas. Muchas mamás resuelven sus dudas sin salir de casa.",
    },
    {
      question: "¿Atienden lactancia mixta?",
      answer:
        "Por supuesto. Te acompañamos sea cual sea tu situación: lactancia exclusiva, mixta o en proceso de destete. Sin juicios.",
    },
    {
      question: "¿Incluye seguimiento?",
      answer:
        "Sí, tras la sesión te acompaño por mensaje para resolver dudas del proceso y ajustar lo que sea necesario.",
    },
  ],

  relatedServices: [
    {
      slug: "control-nino-sano",
      title: "Control de niño sano",
      iconBg: TEAL_BG,
      iconColor: TEAL_COLOR,
      icon: Baby,
    },
    {
      slug: "control-enfermedad",
      title: "Control por enfermedad",
      iconBg: CORAL_BG,
      iconColor: CORAL_COLOR,
      icon: Stethoscope,
    },
    {
      slug: "telemedicina",
      title: "Telemedicina",
      iconBg: PURPLE_BG,
      iconColor: PURPLE_COLOR,
      icon: Video,
    },
  ],

  ctaHeading: "Acompañemos tu lactancia",
  ctaDescription:
    "Reservá una asesoría y vivamos esta etapa con más calma, técnica y apoyo.",
  ctaButtonLabel: "Reservar asesoría",
};

export default function AsesoriaLactanciaPage() {
  return <ServiceDetailPage {...data} />;
}
