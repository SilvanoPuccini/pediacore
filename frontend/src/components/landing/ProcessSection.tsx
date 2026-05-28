import { Calendar, Stethoscope, FileText, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface ProcessStep {
  number: string;
  title: string;
  description: string;
  icon: React.ElementType;
  numberBg: string;
  numberText: string;
  iconBg: string;
  iconColor: string;
}

const STEPS: ProcessStep[] = [
  {
    number: "01",
    title: "Reservás tu turno",
    description:
      "Elegí sede, modalidad y horario desde la plataforma. Sin llamadas, sin esperas. Confirmación inmediata por email.",
    icon: Calendar,
    numberBg: "bg-[var(--teal)]/15",
    numberText: "text-[var(--teal-dark)]",
    iconBg: "bg-[var(--teal)]/12",
    iconColor: "text-[var(--teal-dark)]",
  },
  {
    number: "02",
    title: "Atención sin apuros",
    description:
      "Cada consulta tiene el tiempo que necesita. La Dra. Estefi revisa, explica y responde todas tus preguntas.",
    icon: Stethoscope,
    numberBg: "bg-[var(--mustard)]/20",
    numberText: "text-[var(--mustard)]",
    iconBg: "bg-[var(--mustard)]/15",
    iconColor: "text-[var(--mustard)]",
  },
  {
    number: "03",
    title: "Seguimiento y ficha digital",
    description:
      "Accedé a la historia clínica de tu hijo, indicaciones e historial de consultas desde tu cuenta en cualquier momento.",
    icon: FileText,
    numberBg: "bg-[var(--coral)]/15",
    numberText: "text-[var(--coral)]",
    iconBg: "bg-[var(--coral)]/12",
    iconColor: "text-[var(--coral)]",
  },
];

export default function ProcessSection() {
  return (
    <section id="como-funciona" className="py-24 lg:py-32 bg-[var(--bg)]">
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left — copy */}
          <div className="flex flex-col gap-7">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-6 h-[1px] bg-[var(--teal-dark)]" aria-hidden="true" />
                <span className="text-[11px] tracking-[0.18em] uppercase font-bold text-[var(--teal-dark)]">
                  Cómo funciona
                </span>
              </div>
              <h2 className="font-display text-[36px] lg:text-[44px] leading-[1.05] text-[var(--ink)] tracking-tight">
                Sin esperas, sin papeleos. Tres pasos y listo
                <span className="text-[var(--coral)]">.</span>
              </h2>
            </div>

            <p className="text-[15px] text-[var(--ink2)] leading-relaxed max-w-[420px]">
              Reservar una consulta debería ser tan simple como necesitar una.
              Sin formularios interminables ni llamadas telefónicas.
            </p>

            <Link
              to="/booking"
              className={cn(
                "relative overflow-hidden self-start flex items-center gap-2",
                "px-6 py-3.5 rounded-[12px] text-[14px] font-semibold text-white",
                "bg-[var(--teal-dark)] shadow-[var(--shadow-cta)]",
                "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgba(74,133,144,0.38)]",
                "group"
              )}
            >
              <span
                className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700
                  bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]"
                aria-hidden="true"
              />
              Reservar consulta
              <ArrowRight size={15} />
            </Link>
          </div>

          {/* Right — steps */}
          <div className="flex flex-col gap-0">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isLast = index === STEPS.length - 1;

              return (
                <div key={step.number} className="flex gap-5">
                  {/* Number column with connector */}
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "w-11 h-11 rounded-full flex items-center justify-center shrink-0",
                        step.numberBg
                      )}
                    >
                      <span
                        className={cn(
                          "font-display text-[13px] font-bold",
                          step.numberText
                        )}
                      >
                        {step.number}
                      </span>
                    </div>
                    {/* Connector line */}
                    {!isLast && (
                      <div className="w-[1px] flex-1 bg-[var(--line)] my-2" />
                    )}
                  </div>

                  {/* Card */}
                  <div
                    className={cn(
                      "flex-1 rounded-[20px] border border-[var(--line)] bg-[var(--surface)] p-6",
                      "shadow-[var(--shadow-card)]",
                      !isLast && "mb-3"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-[15px] font-semibold text-[var(--ink)] mb-2 tracking-tight">
                          {step.title}
                        </h3>
                        <p className="text-[13px] text-[var(--ink2)] leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "shrink-0 w-10 h-10 rounded-[12px] flex items-center justify-center",
                          step.iconBg,
                          step.iconColor
                        )}
                      >
                        <Icon size={18} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
