import {
  Apple,
  CookingPot,
  Sprout,
  Wheat,
  TrendingUp,
  Clock,
  MapPin,
  Users,
} from "lucide-react";
import ServiceDetailPage from "./ServiceDetailPage";
import type { ServiceDetailPageProps } from "./ServiceDetailPage";

const ACCENT_BG = "rgba(110,231,183,0.25)";
const ACCENT_COLOR = "#6EE7B7";

const data: ServiceDetailPageProps = {
  title: "Alimentación",
  titleAccent: "infantil",
  description:
    "Orientación para alimentación complementaria y hábitos saludables desde los primeros meses. Con base en evidencia y adaptada a tu familia.",
  metaDescription:
    "Consulta de alimentación infantil con la Dra. Estefanía Ortigosa. Alimentación complementaria, hábitos saludables y abordaje de selectividad desde los 6 meses.",
  slug: "alimentacion-infantil",
  heroIcon: Apple,
  heroIconBg: ACCENT_BG,
  heroIconColor: ACCENT_COLOR,
  blobColor1: "#A7F3D0",
  blobColor2: "#D1FAE5",
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
      label: "Presencial u online",
      sub: "Vos elegís",
      bg: ACCENT_BG,
      color: ACCENT_COLOR,
    },
    {
      icon: Users,
      label: "Desde 4–6 m",
      sub: "Inicio de sólidos",
      bg: ACCENT_BG,
      color: ACCENT_COLOR,
    },
  ],

  imageGradient:
    "linear-gradient(135deg, rgba(110,231,183,0.30) 0%, rgba(167,243,208,0.20) 100%)",
  imageLabel: "foto · alimentación infantil",
  priceLabel: "Valor consulta",
  price: "$40.000",
  priceSub: "Presencial u online",

  includesTitle: "Comer sano, sin estrés ni peleas.",
  includesDescription:
    "Te acompañamos en cada etapa: desde los primeros alimentos hasta resolver la selectividad del preescolar, siempre respetando las señales de tu hijo.",
  includes: [
    {
      icon: CookingPot,
      iconBg: ACCENT_BG,
      iconColor: ACCENT_COLOR,
      title: "Alimentación complementaria",
      description:
        "Cuándo y cómo empezar a los 6 meses: texturas, porciones y prevención de atragantamientos.",
    },
    {
      icon: Sprout,
      iconBg: ACCENT_BG,
      iconColor: ACCENT_COLOR,
      title: "Hábitos saludables",
      description:
        "Cómo armar una alimentación variada y equilibrada según la edad de tu hijo.",
    },
    {
      icon: Wheat,
      iconBg: ACCENT_BG,
      iconColor: ACCENT_COLOR,
      title: "Selectividad y rechazos",
      description:
        "Estrategias sin presión para el niño que 'no come' o solo acepta ciertos alimentos.",
    },
    {
      icon: TrendingUp,
      iconBg: ACCENT_BG,
      iconColor: ACCENT_COLOR,
      title: "Crecimiento adecuado",
      description:
        "Vinculamos la alimentación con la curva de crecimiento para ajustar lo necesario.",
    },
  ],

  steps: [
    {
      title: "Vemos cómo come hoy",
      description:
        "Conversamos sobre la alimentación actual, horarios, texturas y dificultades.",
    },
    {
      title: "Evaluamos el crecimiento",
      description:
        "Revisamos la curva para entender si la alimentación acompaña el desarrollo.",
    },
    {
      title: "Diseñamos un plan",
      description:
        "Pautas concretas y realistas según la edad, sin dietas imposibles.",
    },
    {
      title: "Acompañamos el proceso",
      description:
        "Seguimiento por mensaje para ajustar a medida que tu hijo avanza.",
    },
  ],

  sidePanelEyebrow: "Etapas que cubrimos",
  sidePanelTitle: "Según la edad",
  sidePanelDescription: "Adaptamos la orientación a cada momento:",
  sidePanelRows: [
    { label: "4–6 meses", value: "Señales para iniciar sólidos" },
    { label: "6–12 meses", value: "Texturas y nuevos alimentos" },
    { label: "1–2 años", value: "Transición a la mesa familiar" },
    { label: "2–6 años", value: "Selectividad y variedad" },
    { label: "Escolar", value: "Loncheras y hábitos" },
  ],
  sidePanelCallout:
    "Si detectamos signos de alergia alimentaria o problemas de crecimiento, coordinamos el estudio y seguimiento necesario.",

  prepEyebrow: "Para tu consulta",
  prepTitle: "Qué traer",
  checklist: [
    {
      bold: "Registro de lo que come",
      text: "en un día típico, si podés anotarlo",
    },
    { bold: "Carnet de control", text: "con los últimos pesos y tallas" },
    {
      bold: "Dudas concretas",
      text: "sobre alimentos, texturas o porciones",
    },
    { bold: "Exámenes", text: "recientes si tu hijo los tiene" },
  ],

  faqs: [
    {
      question: "¿A qué edad empiezo los sólidos?",
      answer:
        "En general alrededor de los 6 meses, cuando el bebé muestra señales de preparación: se sienta con apoyo, tiene interés por la comida y perdió el reflejo de extrusión. En la consulta evaluamos caso por caso.",
    },
    {
      question: "¿Hacen BLW o papillas?",
      answer:
        "Te orientamos en el método que mejor se adapte a tu hijo y tu familia, con los pros y contras de cada enfoque. No hay una sola forma correcta de introducir los sólidos.",
    },
    {
      question: "¿Sirve si mi hijo 'no come nada'?",
      answer:
        "Sí. La selectividad es muy común y tiene solución. Analizamos los patrones, descartamos causas médicas y trabajamos con estrategias sin presión para ampliar la variedad.",
    },
    {
      question: "¿Puede ser online?",
      answer:
        "Sí, esta orientación funciona muy bien por videollamada. Te preparamos el plan, compartimos recursos y hacemos seguimiento sin que tengas que moverte.",
    },
  ],

  ctaHeading: "Hagamos de la comida un buen momento",
  ctaDescription:
    "Reservá una consulta y armemos juntos una alimentación sana y sin peleas.",
  ctaButtonLabel: "Reservar consulta",
};

export default function AlimentacionInfantilPage() {
  return <ServiceDetailPage {...data} />;
}
