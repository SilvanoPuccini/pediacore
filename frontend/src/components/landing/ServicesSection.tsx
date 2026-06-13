import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Stethoscope,
  Baby,
  Video,
  HeartHandshake,
  Apple,
  Moon,
  Leaf,
  Activity,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ServiceCard {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  accentColor: string;
  title: string;
  description: string;
  href: string;
}

const SERVICES: ServiceCard[] = [
  {
    icon: Baby,
    iconBg: "bg-[#0D9488]/15",
    iconColor: "text-[#0D9488]",
    accentColor: "bg-[#0D9488]/15",
    title: "Control de niño sano",
    description:
      "Seguimiento del crecimiento y desarrollo en cada etapa. Revisión de hitos, vacunas y nutrición adaptada a la edad.",
    href: "/servicios/control-nino-sano",
  },
  {
    icon: Stethoscope,
    iconBg: "bg-[#F9A8D4]/25",
    iconColor: "text-[#F9A8D4]",
    accentColor: "bg-[#F9A8D4]/25",
    title: "Control por enfermedad",
    description:
      "Atención de enfermedades agudas y crónicas, con diagnóstico detallado y acompañamiento familiar real.",
    href: "/servicios/control-enfermedad",
  },
  {
    icon: Video,
    iconBg: "bg-[#7C3AED]/15",
    iconColor: "text-[#7C3AED]",
    accentColor: "bg-[#7C3AED]/15",
    title: "Telemedicina",
    description:
      "Consultas por videollamada para familias en otras regiones o que prefieren la comodidad de su hogar.",
    href: "/servicios/telemedicina",
  },
  {
    icon: HeartHandshake,
    iconBg: "bg-[#D97706]/18",
    iconColor: "text-[#D97706]",
    accentColor: "bg-[#D97706]/18",
    title: "Asesoría de lactancia",
    description:
      "Acompañamiento individualizado en lactancia materna: acople, técnica, producción láctea y dudas frecuentes.",
    href: "/servicios/asesoria-lactancia",
  },
  {
    icon: Apple,
    iconBg: "bg-[#6EE7B7]/25",
    iconColor: "text-[#6EE7B7]",
    accentColor: "bg-[#6EE7B7]/25",
    title: "Alimentación infantil",
    description:
      "Orientación para alimentación complementaria y hábitos saludables desde los primeros meses.",
    href: "/servicios/alimentacion-infantil",
  },
  {
    icon: Moon,
    iconBg: "bg-[#2563EB]/15",
    iconColor: "text-[#2563EB]",
    accentColor: "bg-[#2563EB]/15",
    title: "Sueño y desarrollo",
    description:
      "Abordaje de trastornos del sueño, cólicos y hitos del desarrollo neuromotor con enfoque integral.",
    href: "/servicios/sueno-desarrollo",
  },
  {
    icon: Leaf,
    iconBg: "bg-[#FDBA74]/25",
    iconColor: "text-[#FDBA74]",
    accentColor: "bg-[#FDBA74]/25",
    title: "Medicina integrativa",
    description:
      "Enfoque funcional que complementa la pediatría clásica: micronutrientes, salud digestiva y plan personalizado.",
    href: "/servicios/medicina-integrativa",
  },
  {
    icon: Activity,
    iconBg: "bg-[#DC2626]/15",
    iconColor: "text-[#DC2626]",
    accentColor: "bg-[#DC2626]/15",
    title: "RCP infantil",
    description:
      "Curso práctico de reanimación y primeros auxilios pediátricos para padres y cuidadores.",
    href: "/servicios/rcp-infantil",
  },
];

function ServiceCardItem({ service }: { service: ServiceCard }) {
  const [hovered, setHovered] = useState(false);
  const Icon = service.icon;

  return (
    <div
      className={cn(
        "relative rounded-[20px] border border-[var(--line)] bg-[var(--surface)] p-7 overflow-hidden",
        "transition-all duration-300 cursor-pointer",
        "shadow-[var(--shadow-card)]",
        hovered && "-translate-y-1 shadow-[var(--shadow-pop)]"
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Decorative circle top-right */}
      <div
        aria-hidden="true"
        className={cn(
          "absolute -top-8 -right-8 w-32 h-32 rounded-full transition-transform duration-300",
          service.accentColor,
          hovered && "scale-110"
        )}
      />

      {/* Icon — clickable */}
      <Link to={service.href} className="relative z-10 block mb-5" aria-label={service.title}>
        <div
          className={cn(
            "w-12 h-12 rounded-[14px] flex items-center justify-center",
            service.iconBg,
            service.iconColor,
            "transition-transform duration-300",
            hovered && "animate-bounce"
          )}
        >
          <Icon size={22} />
        </div>
      </Link>

      {/* Content */}
      <h3 className="relative z-10 text-[16px] font-semibold text-[var(--ink)] mb-2 tracking-tight">
        {service.title}
      </h3>
      <p className="relative z-10 text-[13.5px] text-[var(--ink2)] leading-relaxed mb-5">
        {service.description}
      </p>

      {/* Link */}
      <Link
        to={service.href}
        className={cn(
          "relative z-10 inline-flex items-center gap-1.5 text-[12.5px] font-semibold",
          "text-[var(--teal-dark)] hover:gap-2.5 transition-all duration-200"
        )}
      >
        Más información
        <ArrowRight size={13} />
      </Link>
    </div>
  );
}

export default function ServicesSection() {
  return (
    <section id="servicios" className="py-24 lg:py-32 bg-[var(--bg)]">
      <div className="max-w-[1280px] mx-auto px-6">
        {/* Section header */}
        <div className="mb-14">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-6 h-[1px] bg-[var(--teal-dark)]" aria-hidden="true" />
            <span className="text-[11px] tracking-[0.18em] uppercase font-bold text-[var(--teal-dark)]">
              Servicios
            </span>
          </div>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <h2 className="font-display text-[36px] lg:text-[48px] leading-[1.05] text-[var(--ink)] tracking-tight max-w-[520px]">
              Todo lo que tu hijo necesita, en un solo lugar
              <span className="text-[var(--coral)]">.</span>
            </h2>
            <p className="text-[15px] text-[var(--ink2)] leading-relaxed max-w-[360px]">
              Atención integral desde el nacimiento hasta la adultez temprana,
              con foco en la prevención y el acompañamiento familiar.
            </p>
          </div>
        </div>

        {/* Cards grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {SERVICES.map((service) => (
            <ServiceCardItem key={service.title} service={service} />
          ))}
        </div>
      </div>
    </section>
  );
}
