import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { SERVICE_REGISTRY } from "@/pages/services/serviceRegistry";
import type { Service } from "@/types/api";

const DESCRIPTIONS: Record<string, string> = {
  "control-nino-sano":
    "Seguimiento del crecimiento y desarrollo en cada etapa. Revisión de hitos, vacunas y nutrición adaptada a la edad.",
  "control-enfermedad":
    "Atención de enfermedades agudas y crónicas, con diagnóstico detallado y acompañamiento familiar real.",
  telemedicina:
    "Consultas por videollamada para familias en otras regiones o que prefieren la comodidad de su hogar.",
  "asesoria-lactancia":
    "Acompañamiento individualizado en lactancia materna: acople, técnica, producción láctea y dudas frecuentes.",
  "alimentacion-infantil":
    "Orientación para alimentación complementaria y hábitos saludables desde los primeros meses.",
  "sueno-desarrollo":
    "Abordaje de trastornos del sueño, cólicos y hitos del desarrollo neuromotor con enfoque integral.",
  "medicina-integrativa":
    "Enfoque funcional que complementa la pediatría clásica: micronutrientes, salud digestiva y plan personalizado.",
  "rcp-infantil":
    "Curso práctico de reanimación y primeros auxilios pediátricos para padres y cuidadores.",
};

function ServiceCardItem({
  service,
}: {
  service: (typeof SERVICE_REGISTRY)[number];
}) {
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
          hovered && "scale-110"
        )}
        style={{ backgroundColor: service.bg }}
      />

      {/* Icon — clickable */}
      <Link
        to={`/servicios/${service.slug}`}
        className="relative z-10 block mb-5"
        aria-label={service.title}
      >
        <div
          className={cn(
            "w-12 h-12 rounded-[14px] flex items-center justify-center",
            "transition-transform duration-300",
            hovered && "animate-bounce"
          )}
          style={{ backgroundColor: service.bg, color: service.color }}
        >
          <Icon size={22} />
        </div>
      </Link>

      {/* Content */}
      <h3 className="relative z-10 text-[16px] font-semibold text-[var(--ink)] mb-2 tracking-tight">
        {service.title}
      </h3>
      <p className="relative z-10 text-[13.5px] text-[var(--ink2)] leading-relaxed mb-5">
        {DESCRIPTIONS[service.slug] ?? ""}
      </p>

      {/* Link */}
      <Link
        to={`/servicios/${service.slug}`}
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
  const { data: apiServices } = useQuery<Service[]>({
    queryKey: ["public-services"],
    queryFn: async () => {
      const res = await api.get<{ results: Service[] }>("/practices/dra-estefi/services/");
      return res.data.results;
    },
    staleTime: 1000 * 60 * 10,
  });

  // Only show services whose slug appears in the active API list.
  // Fallback to full registry if the API hasn't loaded or failed.
  const activeServices = apiServices
    ? SERVICE_REGISTRY.filter((s) => apiServices.some((a) => a.slug === s.slug))
    : SERVICE_REGISTRY;

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
          {activeServices.map((service) => (
            <ServiceCardItem key={service.slug} service={service} />
          ))}
        </div>
      </div>
    </section>
  );
}
