import {
  Moon,
  MoonStar,
  Baby,
  Brain,
  Puzzle,
  Stethoscope,
  Video,
  Clock,
  MapPin,
  Users,
} from "lucide-react";
import ServiceDetailPage from "./ServiceDetailPage";
import type { ServiceDetailPageProps } from "./ServiceDetailPage";

const SKY_BG = "rgba(56,189,248,0.20)";
const SKY_COLOR = "#0369A1";
const TEAL_BG = "rgba(123,181,189,0.22)";
const TEAL_COLOR = "#4A8590";
const CORAL_BG = "rgba(243,168,161,0.28)";
const CORAL_COLOR = "#B5604F";
const PURPLE_BG = "rgba(196,181,253,0.30)";
const PURPLE_COLOR = "#6B569E";

const data: ServiceDetailPageProps = {
  title: "Sueño y",
  titleAccent: "desarrollo",
  description:
    "Abordaje de trastornos del sueño, cólicos y hitos del desarrollo neuromotor con enfoque integral. Para que toda la familia descanse mejor.",
  metaDescription:
    "Consulta de sueño y desarrollo infantil con la Dra. Estefanía Ortigosa. Trastornos del sueño, cólicos y evaluación de hitos del desarrollo neuromotor.",
  slug: "sueno-desarrollo",
  heroIcon: Moon,
  heroIconBg: SKY_BG,
  heroIconColor: SKY_COLOR,
  blobColor1: "#38BDF8",
  blobColor2: "#7DD3FC",
  ctaLabel: "Reservar consulta",

  quickFacts: [
    {
      icon: Clock,
      label: "45 minutos",
      sub: "Duración de la consulta",
      bg: SKY_BG,
      color: SKY_COLOR,
    },
    {
      icon: MapPin,
      label: "Presencial u online",
      sub: "Vos elegís",
      bg: SKY_BG,
      color: SKY_COLOR,
    },
    {
      icon: Users,
      label: "0 a 6 años",
      sub: "Foco en primeros años",
      bg: SKY_BG,
      color: SKY_COLOR,
    },
  ],

  imageGradient:
    "linear-gradient(135deg, rgba(123,181,189,0.40) 0%, rgba(168,201,168,0.22) 100%)",
  imageLabel: "foto · sueño y desarrollo infantil",
  priceLabel: "Valor consulta",
  price: "$40.000",
  priceSub: "Presencial u online",

  includesTitle: "Descanso y desarrollo, con mirada integral.",
  includesDescription:
    "El sueño y el desarrollo van de la mano. Evaluamos hábitos, descartamos causas médicas y armamos un plan respetuoso para tu hijo y tu familia.",
  includes: [
    {
      icon: MoonStar,
      iconBg: SKY_BG,
      iconColor: SKY_COLOR,
      title: "Trastornos del sueño",
      description:
        "Despertares frecuentes, dificultad para dormir y rutinas según la edad del niño.",
    },
    {
      icon: Baby,
      iconBg: SKY_BG,
      iconColor: SKY_COLOR,
      title: "Cólicos del lactante",
      description:
        "Orientación y manejo del llanto y los cólicos en los primeros meses.",
    },
    {
      icon: Brain,
      iconBg: SKY_BG,
      iconColor: SKY_COLOR,
      title: "Hitos del desarrollo",
      description:
        "Evaluación del desarrollo neuromotor y derivación oportuna si es necesario.",
    },
    {
      icon: Puzzle,
      iconBg: SKY_BG,
      iconColor: SKY_COLOR,
      title: "Enfoque integral",
      description:
        "Miramos el conjunto: sueño, alimentación, vínculo y rutina familiar.",
    },
  ],

  steps: [
    {
      title: "Mapeamos la rutina",
      description:
        "Conversamos sobre cómo duerme, los horarios y la dinámica de la familia.",
    },
    {
      title: "Descartamos causas médicas",
      description:
        "Evaluamos si hay algo de fondo (reflujo, alergias, etc.) que afecte el sueño.",
    },
    {
      title: "Evaluamos el desarrollo",
      description:
        "Chequeamos los hitos esperables para la edad de tu hijo.",
    },
    {
      title: "Plan respetuoso",
      description:
        "Definimos estrategias realistas y acordes a tu estilo de crianza.",
    },
  ],

  sidePanelEyebrow: "Motivos frecuentes",
  sidePanelTitle: "¿Cuándo consultar?",
  sidePanelDescription:
    "Algunos motivos por los que las familias reservan:",
  sidePanelRows: [
    { label: "Despertares nocturnos", value: "Múltiples por noche" },
    { label: "Cuesta dormir", value: "Rutina de sueño" },
    { label: "Cólicos y llanto", value: "Lactante inquieto" },
    { label: "Dudas de desarrollo", value: "Hitos por edad" },
    { label: "Pesadillas o terrores", value: "Niño preescolar" },
  ],
  sidePanelCallout:
    "Trabajamos con enfoque respetuoso: nada de métodos rígidos. Buscamos lo que funciona para tu hijo y tu familia.",

  prepEyebrow: "Para tu consulta",
  prepTitle: "Qué tener listo",
  checklist: [
    {
      bold: "Registro de sueño",
      text: "de los últimos días, si podés anotarlo",
    },
    {
      bold: "Horarios habituales",
      text: "de siestas, comidas y acostada",
    },
    { bold: "Carnet de control", text: "con la información de desarrollo" },
    {
      bold: "Tus dudas anotadas",
      text: "sobre sueño o desarrollo",
    },
  ],

  faqs: [
    {
      question: "¿Usan métodos de 'dejar llorar'?",
      answer:
        "No. Trabajamos con un enfoque respetuoso, sin métodos rígidos de extinción. Buscamos estrategias que funcionen para tu hijo y sean sostenibles para tu familia.",
    },
    {
      question: "¿Desde qué edad?",
      answer:
        "Podemos abordar el sueño y el desarrollo desde los primeros meses de vida. Cuanto antes se trabaja, más fácil es instalar buenos hábitos.",
    },
    {
      question: "¿Los cólicos tienen solución?",
      answer:
        "Te damos herramientas concretas para el manejo: posiciones, técnicas de contención, ajustes en la alimentación y qué descartar médicamente.",
    },
    {
      question: "¿Puede ser online?",
      answer:
        "Sí, esta consulta funciona muy bien por videollamada. Conversamos, evaluamos y armamos el plan sin que tengas que salir de casa con el bebé.",
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

  ctaHeading: "Que toda la familia descanse",
  ctaDescription:
    "Reservá una consulta y armemos un plan de sueño y desarrollo a la medida de tu hijo.",
  ctaButtonLabel: "Reservar consulta",
};

export default function SuenoDesarrolloPage() {
  return <ServiceDetailPage {...data} />;
}
