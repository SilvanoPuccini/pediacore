import {
  Video,
  ShieldCheck,
  ClipboardList,
  HeartPulse,
  FileText,
  Baby,
  Stethoscope,
  Clock,
  Wifi,
  MapPin,
} from "lucide-react";
import ServiceDetailPage from "./ServiceDetailPage";
import type { ServiceDetailPageProps } from "./ServiceDetailPage";

const PURPLE_BG = "rgba(196,181,253,0.30)";
const PURPLE_COLOR = "#6B569E";
const TEAL_BG = "rgba(123,181,189,0.22)";
const TEAL_COLOR = "#4A8590";
const CORAL_BG = "rgba(243,168,161,0.28)";
const CORAL_COLOR = "#B5604F";
const MUSTARD_BG = "rgba(229,184,71,0.30)";
const MUSTARD_COLOR = "#8A6A1F";

const data: ServiceDetailPageProps = {
  title: "Consultas por",
  titleAccent: "videollamada",
  description:
    "Consultas por videollamada para familias en otras regiones o que prefieren la comodidad de su hogar. Misma cercanía y dedicación, desde donde estés.",
  metaDescription:
    "Consultas pediátricas online con la Dra. Estefanía Ortigosa. Videollamada segura, interpretación de exámenes y recetas digitales para todo Chile.",
  slug: "telemedicina",
  heroIcon: Video,
  heroIconBg: PURPLE_BG,
  heroIconColor: PURPLE_COLOR,
  blobColor1: "#7BB5BD",
  blobColor2: "#C4B5FD",
  ctaLabel: "Reservar online",

  quickFacts: [
    {
      icon: Clock,
      label: "30 minutos",
      sub: "Duración de la videollamada",
      bg: PURPLE_BG,
      color: PURPLE_COLOR,
    },
    {
      icon: Wifi,
      label: "100% online",
      sub: "Desde cualquier lugar",
      bg: PURPLE_BG,
      color: PURPLE_COLOR,
    },
    {
      icon: MapPin,
      label: "Todo Chile",
      sub: "Sin importar la región",
      bg: PURPLE_BG,
      color: PURPLE_COLOR,
    },
  ],

  imageGradient:
    "linear-gradient(135deg, rgba(196,181,253,0.40) 0%, rgba(123,181,189,0.22) 100%)",
  imageLabel: "foto · consulta por videollamada",
  priceLabel: "Valor consulta",
  price: "$40.000",
  priceSub: "Pago seguro online",

  includesTitle: "La misma atención, desde tu casa.",
  includesDescription:
    "Ideal para seguimientos, consultas no urgentes, interpretación de exámenes y dudas que no requieren examen físico. Recibís todo por escrito al terminar.",
  includes: [
    {
      icon: ShieldCheck,
      iconBg: PURPLE_BG,
      iconColor: PURPLE_COLOR,
      title: "Videollamada segura",
      description:
        "Plataforma privada y encriptada. Te llega el enlace por mensaje, sin instalar nada complicado.",
    },
    {
      icon: ClipboardList,
      iconBg: PURPLE_BG,
      iconColor: PURPLE_COLOR,
      title: "Interpretación de exámenes",
      description:
        "Revisamos juntos resultados de laboratorio o imágenes y definimos los próximos pasos.",
    },
    {
      icon: HeartPulse,
      iconBg: PURPLE_BG,
      iconColor: PURPLE_COLOR,
      title: "Seguimientos",
      description:
        "Control de tratamientos en curso y evolución de condiciones ya diagnosticadas.",
    },
    {
      icon: FileText,
      iconBg: PURPLE_BG,
      iconColor: PURPLE_COLOR,
      title: "Resumen por escrito",
      description:
        "Tras la consulta recibís las indicaciones y recetas digitales por mensaje.",
    },
  ],

  steps: [
    {
      title: "Reservás y pagás online",
      description:
        "Elegís horario disponible y confirmás el pago. Te llega el enlace por WhatsApp y email.",
    },
    {
      title: "Te conectás a la hora",
      description:
        "Desde el celular o computador, en un lugar tranquilo y con buena conexión.",
    },
    {
      title: "Conversamos con calma",
      description:
        "Revisamos el motivo, vemos a tu hijo en cámara y resolvemos tus dudas.",
    },
    {
      title: "Recibís todo por escrito",
      description:
        "Indicaciones, recetas y próximos pasos te llegan al terminar la videollamada.",
    },
  ],

  sidePanelEyebrow: "Ideal para",
  sidePanelTitle: "¿Cuándo conviene online?",
  sidePanelDescription: "La telemedicina funciona muy bien para:",
  sidePanelRows: [
    { label: "Familias fuera de la región", value: "Sin viajar a Pucón" },
    { label: "Seguimiento de tratamiento", value: "Ver evolución" },
    { label: "Interpretar exámenes", value: "Revisión de resultados" },
    { label: "Dudas de crianza", value: "Sueño, alimentación, hábitos" },
    { label: "Segunda opinión", value: "Orientación pediátrica" },
  ],
  sidePanelCallout:
    "Si durante la videollamada detectamos que se necesita examen físico, te orientamos para una consulta presencial o derivación.",

  prepEyebrow: "Para tu videollamada",
  prepTitle: "Cómo prepararte",
  checklist: [
    { bold: "Buena conexión", text: "a internet y batería cargada" },
    {
      bold: "Lugar tranquilo",
      text: "y con buena luz para ver bien al niño",
    },
    {
      bold: "Exámenes a mano",
      text: "(en papel o foto) si vas a consultarlos",
    },
    { bold: "Tus dudas anotadas", text: "para aprovechar el tiempo" },
  ],

  faqs: [
    {
      question: "¿Qué plataforma usan?",
      answer:
        "Una plataforma de videollamada segura y privada. Al confirmar la reserva te llega el enlace directo por WhatsApp y email. No hace falta instalar ninguna app.",
    },
    {
      question: "¿Sirve para recetas?",
      answer:
        "Sí, emitimos recetas digitales válidas en todo Chile. Las recibís por mensaje al finalizar la consulta.",
    },
    {
      question: "¿Y si necesito examen físico?",
      answer:
        "Si el caso lo requiere, te orientamos para coordinar una consulta presencial en Pucón o Villarrica, o la derivación correspondiente.",
    },
    {
      question: "¿Cómo se paga?",
      answer:
        "El pago es online al reservar, con tarjeta de crédito, débito o transferencia bancaria. El sistema es seguro y recibirás el comprobante por email.",
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
      slug: "asesoria-lactancia",
      title: "Asesoría de lactancia",
      iconBg: MUSTARD_BG,
      iconColor: MUSTARD_COLOR,
      icon: Baby,
    },
  ],

  ctaHeading: "Atendete desde donde estés",
  ctaDescription:
    "Reservá tu consulta online y conversemos sin que tengas que moverte de casa.",
  ctaButtonLabel: "Reservar online",
};

export default function TelemedicinaPage() {
  return <ServiceDetailPage {...data} />;
}
