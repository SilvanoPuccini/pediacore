import {
  Baby,
  Ruler,
  Brain,
  Apple,
  ShieldCheck,
  Clock,
  MapPin,
  Users,
} from "lucide-react";
import ServiceDetailPage from "./ServiceDetailPage";
import type { ServiceDetailPageProps } from "./ServiceDetailPage";

// ─── Accent colors ────────────────────────────────────────────────────────────
const ACCENT_BG = "rgba(13,148,136,0.15)";
const ACCENT_COLOR = "#0D9488";

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
  heroIconBg: ACCENT_BG,
  heroIconColor: ACCENT_COLOR,
  blobColor1: "#14B8A6",
  blobColor2: "#5EEAD4",
  ctaLabel: "Reservar control",

  quickFacts: [
    {
      icon: Clock,
      label: "45 minutos",
      sub: "Duración del control",
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
    "linear-gradient(135deg, rgba(13,148,136,0.30) 0%, rgba(94,234,212,0.20) 100%)",
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
      iconBg: ACCENT_BG,
      iconColor: ACCENT_COLOR,
      title: "Crecimiento",
      description:
        "Peso, talla, perímetro craneal e IMC graficados en las curvas OMS para seguir la trayectoria.",
    },
    {
      icon: Brain,
      iconBg: ACCENT_BG,
      iconColor: ACCENT_COLOR,
      title: "Desarrollo psicomotor",
      description:
        "Evaluación de hitos según la edad: motricidad, lenguaje, vínculo y socialización.",
    },
    {
      icon: Apple,
      iconBg: ACCENT_BG,
      iconColor: ACCENT_COLOR,
      title: "Alimentación",
      description:
        "Lactancia, alimentación complementaria y hábitos según las pautas MINSAL, sin culpas.",
    },
    {
      icon: ShieldCheck,
      iconBg: ACCENT_BG,
      iconColor: ACCENT_COLOR,
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

  // CTA banner
  ctaHeading: "Reservá el control de tu hijo",
  ctaDescription:
    "Elegí sede, día y horario en menos de 2 minutos. Confirmación inmediata por WhatsApp.",
  ctaButtonLabel: "Reservar control",
};

export default function ControlNinoSanoPage() {
  return <ServiceDetailPage {...data} />;
}
