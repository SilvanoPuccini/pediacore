import {
  Stethoscope,
  Thermometer,
  HeartPulse,
  ClipboardList,
  FileText,
  Clock,
  MapPin,
  Users,
} from "lucide-react";
import ServiceDetailPage from "./ServiceDetailPage";
import type { ServiceDetailPageProps } from "./ServiceDetailPage";

const ACCENT_BG = "rgba(249,168,212,0.25)";
const ACCENT_COLOR = "#EC4899";

const data: ServiceDetailPageProps = {
  title: "Control por",
  titleAccent: "enfermedad",
  description:
    "Atención de enfermedades agudas y crónicas, con diagnóstico detallado y acompañamiento familiar real. Resolvemos el motivo de consulta con tiempo y un plan claro.",
  metaDescription:
    "Control por enfermedad pediátrica en Pucón y Villarrica. Diagnóstico detallado, tratamiento y acompañamiento para enfermedades agudas y crónicas en niños.",
  slug: "control-enfermedad",
  heroIcon: Stethoscope,
  heroIconBg: ACCENT_BG,
  heroIconColor: ACCENT_COLOR,
  blobColor1: "#FBCFE8",
  blobColor2: "#FCE7F3",
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
    "linear-gradient(135deg, rgba(249,168,212,0.30) 0%, rgba(251,207,232,0.20) 100%)",
  imageLabel: "foto · consulta pediátrica",
  priceLabel: "Valor consulta",
  price: "$40.000",
  priceSub: "Incluye revisión de exámenes",

  includesTitle: "Diagnóstico y tratamiento, sin apuro.",
  includesDescription:
    "Evaluamos el motivo de consulta de forma integral: desde el cuadro agudo del día hasta el seguimiento de condiciones crónicas, siempre con una mirada funcional.",
  includes: [
    {
      icon: Thermometer,
      iconBg: ACCENT_BG,
      iconColor: ACCENT_COLOR,
      title: "Cuadros agudos",
      description:
        "Fiebre, infecciones respiratorias, gastrointestinales, dermatitis y más, con diagnóstico preciso.",
    },
    {
      icon: HeartPulse,
      iconBg: ACCENT_BG,
      iconColor: ACCENT_COLOR,
      title: "Condiciones crónicas",
      description:
        "Seguimiento de asma, alergias, dermatitis atópica y otras condiciones del desarrollo.",
    },
    {
      icon: ClipboardList,
      iconBg: ACCENT_BG,
      iconColor: ACCENT_COLOR,
      title: "Revisión de exámenes",
      description:
        "Si se requieren exámenes, su interpretación queda incluida en la misma consulta.",
    },
    {
      icon: FileText,
      iconBg: ACCENT_BG,
      iconColor: ACCENT_COLOR,
      title: "Plan y seguimiento",
      description:
        "Indicaciones por escrito y seguimiento posterior por mensaje ante dudas.",
    },
  ],

  steps: [
    {
      title: "Escuchamos el motivo",
      description:
        "Conversamos sobre los síntomas, cuándo empezaron y cómo ha evolucionado tu hijo.",
    },
    {
      title: "Examen físico completo",
      description:
        "Revisión detallada para llegar a un diagnóstico certero, sin apuros.",
    },
    {
      title: "Diagnóstico y tratamiento",
      description:
        "Te explicamos qué tiene tu hijo y definimos el tratamiento paso a paso.",
    },
    {
      title: "Indicaciones por escrito",
      description:
        "Te llevás todo anotado: medicación, dosis, signos de alarma y cuándo volver.",
    },
  ],

  sidePanelEyebrow: "Motivos frecuentes",
  sidePanelTitle: "¿Cuándo consultar?",
  sidePanelDescription:
    "Algunos de los motivos por los que las familias reservan esta consulta:",
  sidePanelRows: [
    { label: "Fiebre persistente", value: "Más de 48–72 hs" },
    { label: "Tos o dificultad respiratoria", value: "Evaluación pulmonar" },
    { label: "Vómitos o diarrea", value: "Riesgo de deshidratación" },
    { label: "Erupciones en la piel", value: "Dermatitis, alergias" },
    { label: "Dolor de oído o garganta", value: "Otitis, faringitis" },
  ],
  sidePanelCallout:
    "Ante signos de urgencia vital (dificultad respiratoria severa, decaimiento extremo), acudí directamente a un servicio de urgencias.",

  prepEyebrow: "Para tu visita",
  prepTitle: "Qué llevar a la consulta",
  checklist: [
    { bold: "Carnet de control", text: "y de vacunas del niño" },
    {
      bold: "Exámenes y recetas",
      text: "previas relacionadas al cuadro",
    },
    {
      bold: "Lista de síntomas",
      text: "con fechas y temperatura si tuvo fiebre",
    },
    {
      bold: "Certificado FONASA",
      text: "vigente si usás valor preferencial",
    },
  ],

  faqs: [
    {
      question: "¿Atienden el mismo día?",
      answer:
        "Siempre buscamos dar un turno en el día para cuadros agudos. Consultá disponibilidad por WhatsApp o a través del sistema de reservas online.",
    },
    {
      question: "¿La consulta incluye la receta?",
      answer:
        "Sí. Te entregamos la receta médica al finalizar la consulta, si corresponde según el diagnóstico.",
    },
    {
      question: "¿Atienden con FONASA o isapre?",
      answer:
        "Atendemos en modalidad particular. Si tenés FONASA modalidad libre elección, podés presentar el bono para el reembolso según tu tramo.",
    },
    {
      question: "¿Puede ser online?",
      answer:
        "Para cuadros que requieren examen físico, la consulta debe ser presencial. Si el cuadro lo permite (seguimiento, revisión de exámenes), podemos evaluar la opción de telemedicina.",
    },
  ],

  ctaHeading: "¿Tu hijo no se siente bien?",
  ctaDescription:
    "Reservá una consulta y resolvamos juntos el motivo, con tiempo y un plan claro.",
  ctaButtonLabel: "Reservar consulta",
};

export default function ControlEnfermedadPage() {
  return <ServiceDetailPage {...data} />;
}
