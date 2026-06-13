import {
  Baby,
  Ruler,
  Brain,
  Apple,
  ShieldCheck,
  Stethoscope,
  Video,
  Clock,
  MapPin,
  Users,
} from "lucide-react";
import ServiceDetailPage from "./ServiceDetailPage";
import type { ServiceDetailPageProps } from "./ServiceDetailPage";

// ─── Shared icon bg helpers ───────────────────────────────────────────────────
const TEAL_BG = "rgba(123,181,189,0.22)";
const TEAL_COLOR = "#4A8590";
const PURPLE_BG = "rgba(196,181,253,0.30)";
const PURPLE_COLOR = "#6B569E";
const GREEN_BG = "rgba(134,239,172,0.30)";
const GREEN_COLOR = "#3F8358";
const MUSTARD_BG = "rgba(229,184,71,0.30)";
const MUSTARD_COLOR = "#8A6A1F";

const data: ServiceDetailPageProps = {
  // Hero
  title: "Control de",
  titleAccent: "niño sano",
  description:
    "Evaluación del crecimiento, desarrollo psicomotor y alimentación según las pautas OMS y MINSAL. Un espacio con tiempo y calma para acompañar a tu hijo en cada etapa.",
  metaDescription:
    "Control de niño sano en Pucón y Villarrica con la Dra. Estefanía Ortigosa. Evaluación integral del crecimiento, desarrollo psicomotor, alimentación y vacunas.",
  slug: "control-nino-sano",
  heroIcon: Baby,
  heroIconBg: TEAL_BG,
  heroIconColor: TEAL_COLOR,
  blobColor1: "#7BB5BD",
  blobColor2: "#A8C9A8",
  ctaLabel: "Reservar control",

  quickFacts: [
    {
      icon: Clock,
      label: "45 minutos",
      sub: "Duración del control",
      bg: TEAL_BG,
      color: TEAL_COLOR,
    },
    {
      icon: MapPin,
      label: "Presencial",
      sub: "Pucón & Villarrica",
      bg: TEAL_BG,
      color: TEAL_COLOR,
    },
    {
      icon: Users,
      label: "0 a 18 años",
      sub: "Todas las edades",
      bg: TEAL_BG,
      color: TEAL_COLOR,
    },
  ],

  imageGradient:
    "linear-gradient(135deg, rgba(123,181,189,0.30) 0%, rgba(168,201,168,0.30) 100%)",
  imageLabel: "foto · control pediátrico",
  priceLabel: "Valor consulta",
  price: "$40.000",
  priceSub: "Valor FONASA: $32.000",

  // Qué incluye
  includesTitle: "Una evaluación completa, sin apuros.",
  includesDescription:
    "Cada control de niño sano cubre las cuatro áreas clave del desarrollo. El objetivo es detectar a tiempo, orientar y darte un plan claro para el período hasta el próximo control.",
  includes: [
    {
      icon: Ruler,
      iconBg: TEAL_BG,
      iconColor: TEAL_COLOR,
      title: "Crecimiento",
      description:
        "Peso, talla, perímetro craneal e IMC graficados en las curvas OMS para seguir la trayectoria.",
    },
    {
      icon: Brain,
      iconBg: PURPLE_BG,
      iconColor: PURPLE_COLOR,
      title: "Desarrollo psicomotor",
      description:
        "Evaluación de hitos según la edad: motricidad, lenguaje, vínculo y socialización.",
    },
    {
      icon: Apple,
      iconBg: GREEN_BG,
      iconColor: GREEN_COLOR,
      title: "Alimentación",
      description:
        "Lactancia, alimentación complementaria y hábitos según las pautas MINSAL, sin culpas.",
    },
    {
      icon: ShieldCheck,
      iconBg: MUSTARD_BG,
      iconColor: MUSTARD_COLOR,
      title: "Vacunas y prevención",
      description:
        "Revisión del calendario MINSAL, indicación de vacunas particulares y consejos de prevención.",
    },
  ],

  // Steps
  steps: [
    {
      title: "Conversamos",
      description:
        "Revisamos antecedentes, dudas y cómo viene la familia desde el último control.",
    },
    {
      title: "Examinamos y medimos",
      description:
        "Examen físico completo, peso, talla y perímetro graficados en las curvas OMS.",
    },
    {
      title: "Evaluamos el desarrollo",
      description:
        "Chequeamos los hitos esperables para la edad y resolvemos inquietudes.",
    },
    {
      title: "Plan por escrito",
      description:
        "Te llevás indicaciones claras, esquema de vacunas y la fecha del próximo control.",
    },
  ],

  // Side panel
  sidePanelEyebrow: "Frecuencia recomendada",
  sidePanelTitle: "Calendario de controles",
  sidePanelDescription:
    "Según la pauta MINSAL, la frecuencia ideal de controles del niño sano por edad:",
  sidePanelRows: [
    { label: "Recién nacido", value: "7 y 15 días" },
    { label: "Lactante (0–12 m)", value: "1, 2, 4, 6, 9 y 12 meses" },
    { label: "12 a 24 meses", value: "Cada 3 meses" },
    { label: "2 a 6 años", value: "Cada 6 meses" },
    { label: "6 a 18 años", value: "1 vez al año" },
  ],
  sidePanelCallout:
    "¿No sabés cuándo toca el próximo control? Escribinos y lo coordinamos según la edad de tu hijo.",

  // Preparation
  prepEyebrow: "Para tu visita",
  prepTitle: "Qué llevar al control",
  checklist: [
    { bold: "Carnet de control", text: "y de vacunas del niño" },
    {
      bold: "Exámenes previos",
      text: "si los tiene (sangre, imágenes, etc.)",
    },
    { bold: "Lista de dudas", text: "anotadas para no olvidar nada" },
    {
      bold: "Certificado FONASA",
      text: "vigente si usás valor preferencial",
    },
  ],

  // FAQ
  faqs: [
    {
      question: "¿Desde qué edad puedo traer a mi hijo?",
      answer:
        "Desde el nacimiento. El primer control se hace al séptimo día de vida. Atendemos niños y adolescentes hasta los 18 años.",
    },
    {
      question: "¿El control incluye la vacunación?",
      answer:
        "Revisamos el calendario de vacunas MINSAL y te orientamos sobre qué vacunas corresponden. Las aplicaciones se hacen en el CESFAM o centros de vacunación habilitados.",
    },
    {
      question: "¿Atienden con FONASA o isapre?",
      answer:
        "Atendemos en modalidad particular. Si tenés FONASA modalidad libre elección, podés presentar el bono para el reembolso según tu tramo.",
    },
    {
      question: "¿Puedo hacer el control online?",
      answer:
        "El control de niño sano requiere examen físico presencial, por lo que no está disponible por videollamada. Para consultas de seguimiento o dudas puntuales sí podemos usar telemedicina.",
    },
  ],

  // Related
  relatedServices: [
    {
      slug: "control-enfermedad",
      title: "Control por enfermedad",
      iconBg: "rgba(243,168,161,0.28)",
      iconColor: "#B5604F",
      icon: Stethoscope,
    },
    {
      slug: "telemedicina",
      title: "Telemedicina",
      iconBg: PURPLE_BG,
      iconColor: PURPLE_COLOR,
      icon: Video,
    },
    {
      slug: "asesoria-lactancia",
      title: "Asesoría de lactancia",
      iconBg: MUSTARD_BG,
      iconColor: MUSTARD_COLOR,
      icon: Baby,
    },
  ],

  // CTA banner
  ctaHeading: "Reservá el control de tu hijo",
  ctaDescription:
    "Elegí sede, día y horario en menos de 2 minutos. Confirmación inmediata por WhatsApp.",
  ctaButtonLabel: "Reservar control",
};

export default function ControlNinoSanoPage() {
  return <ServiceDetailPage {...data} />;
}
