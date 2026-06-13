import {
  Activity,
  ShieldPlus,
  Wind,
  BookOpen,
  Baby,
  Stethoscope,
  Video,
  Clock,
  MapPin,
  Users,
} from "lucide-react";
import ServiceDetailPage from "./ServiceDetailPage";
import type { ServiceDetailPageProps } from "./ServiceDetailPage";

const ROSE_BG = "rgba(244,63,94,0.18)";
const ROSE_COLOR = "#BE185D";
const TEAL_BG = "rgba(123,181,189,0.22)";
const TEAL_COLOR = "#4A8590";
const CORAL_BG = "rgba(243,168,161,0.28)";
const CORAL_COLOR = "#B5604F";
const INDIGO_BG = "rgba(99,102,241,0.22)";
const INDIGO_COLOR = "#4F46E5";

const data: ServiceDetailPageProps = {
  title: "RCP",
  titleAccent: "infantil",
  description:
    "Capacitación práctica en reanimación cardiopulmonar y primeros auxilios pediátricos. Porque saber actuar en los primeros minutos puede salvar una vida.",
  metaDescription:
    "Curso de RCP infantil con la Dra. Estefanía Ortigosa en Pucón y Villarrica. Reanimación cardiopulmonar, desobstrucción y primeros auxilios para padres y cuidadores.",
  slug: "rcp-infantil",
  heroIcon: Activity,
  heroIconBg: ROSE_BG,
  heroIconColor: ROSE_COLOR,
  blobColor1: "#F43F5E",
  blobColor2: "#7BB5BD",
  ctaLabel: "Coordinar curso",

  quickFacts: [
    {
      icon: Clock,
      label: "2 horas",
      sub: "Duración del curso",
      bg: ROSE_BG,
      color: ROSE_COLOR,
    },
    {
      icon: MapPin,
      label: "Presencial",
      sub: "Pucón & Villarrica",
      bg: ROSE_BG,
      color: ROSE_COLOR,
    },
    {
      icon: Users,
      label: "Padres y cuidadores",
      sub: "Grupos reducidos",
      bg: ROSE_BG,
      color: ROSE_COLOR,
    },
  ],

  imageGradient:
    "linear-gradient(135deg, rgba(244,63,94,0.30) 0%, rgba(243,168,161,0.22) 100%)",
  imageLabel: "foto · curso RCP infantil",
  priceLabel: "Valor curso",
  price: "$60.000",
  priceSub: "Por persona · Grupal",

  includesTitle: "Saber actuar cuando cada segundo cuenta.",
  includesDescription:
    "Curso teórico-práctico con maniquíes de simulación, diseñado para padres, madres, cuidadores y cualquier persona que esté a cargo de niños.",
  includes: [
    {
      icon: Activity,
      iconBg: ROSE_BG,
      iconColor: ROSE_COLOR,
      title: "RCP básica",
      description:
        "Técnica de reanimación cardiopulmonar en lactantes y niños, paso a paso.",
    },
    {
      icon: Wind,
      iconBg: ROSE_BG,
      iconColor: ROSE_COLOR,
      title: "Desobstrucción de vía aérea",
      description:
        "Maniobra de Heimlich y manejo de atragantamiento según la edad del niño.",
    },
    {
      icon: ShieldPlus,
      iconBg: ROSE_BG,
      iconColor: ROSE_COLOR,
      title: "Primeros auxilios",
      description:
        "Manejo de convulsiones febriles, quemaduras, caídas y signos de alarma.",
    },
    {
      icon: BookOpen,
      iconBg: ROSE_BG,
      iconColor: ROSE_COLOR,
      title: "Material de apoyo",
      description:
        "Guía impresa con los pasos clave para tener en casa como referencia rápida.",
    },
  ],

  steps: [
    {
      title: "Teoría clara y directa",
      description:
        "Explicamos los fundamentos del RCP y primeros auxilios pediátricos sin tecnicismos.",
    },
    {
      title: "Práctica con maniquíes",
      description:
        "Cada participante practica las maniobras en maniquíes de lactante y niño.",
    },
    {
      title: "Simulación de escenarios",
      description:
        "Recreamos situaciones reales: atragantamiento, pérdida de conciencia, convulsión.",
    },
    {
      title: "Guía para la casa",
      description:
        "Te llevás un resumen impreso con los pasos clave y números de emergencia.",
    },
  ],

  sidePanelEyebrow: "Ideal para",
  sidePanelTitle: "¿Quién puede participar?",
  sidePanelDescription: "El curso está pensado para:",
  sidePanelRows: [
    { label: "Padres y madres", value: "Primerizos o no" },
    { label: "Abuelos y cuidadores", value: "Quien cuide niños" },
    { label: "Nanas y au pairs", value: "Personal a cargo" },
    { label: "Educadoras de jardín", value: "Equipos educativos" },
    { label: "Embarazadas", value: "Preparación prenatal" },
  ],
  sidePanelCallout:
    "Armamos grupos reducidos para que cada persona practique con los maniquíes. Consultá por fechas disponibles.",

  prepEyebrow: "Para el curso",
  prepTitle: "Qué saber antes",
  checklist: [
    {
      bold: "Ropa cómoda",
      text: "vas a arrodillarte para practicar en el suelo",
    },
    {
      bold: "Sin requisitos previos",
      text: "no necesitás experiencia médica",
    },
    {
      bold: "Puntualidad",
      text: "el curso empieza a la hora, no se puede tomar tarde",
    },
    {
      bold: "Consultá fechas",
      text: "los grupos se arman por demanda, escribinos por WhatsApp",
    },
  ],

  faqs: [
    {
      question: "¿Necesito conocimientos previos?",
      answer:
        "No. El curso está diseñado para personas sin formación médica. Todo se explica de forma simple y se practica en el momento.",
    },
    {
      question: "¿Puedo ir con mi pareja o familia?",
      answer:
        "Sí, de hecho lo recomendamos. Cada participante paga su inscripción individual. Mientras más personas sepan actuar, mejor.",
    },
    {
      question: "¿Dan certificado?",
      answer:
        "Entregamos una constancia de participación. No es una certificación oficial de salud, pero te asegura que practicaste las maniobras correctamente.",
    },
    {
      question: "¿Cada cuánto hay cursos?",
      answer:
        "Armamos grupos por demanda. Escribinos por WhatsApp y te avisamos cuando se abra el próximo cupo en Pucón o Villarrica.",
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
      slug: "medicina-integrativa",
      title: "Medicina integrativa",
      iconBg: INDIGO_BG,
      iconColor: INDIGO_COLOR,
      icon: Video,
    },
  ],

  ctaHeading: "Aprendé a salvar una vida",
  ctaDescription:
    "Coordiná tu lugar en el próximo curso de RCP infantil. Grupos reducidos y práctica real.",
  ctaButtonLabel: "Coordinar curso",
};

export default function RCPInfantilPage() {
  return <ServiceDetailPage {...data} />;
}
