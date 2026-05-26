import { cn } from "@/lib/utils";

interface Stage {
  ageLabel: string;
  ageRange: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  circleText: string;
  bullets: string[];
}

const STAGES: Stage[] = [
  {
    ageLabel: "0–2 años",
    ageRange: "0–2",
    label: "Lactante",
    color: "text-[var(--teal-dark)]",
    bgColor: "bg-[var(--teal)]/12",
    borderColor: "border-[var(--teal)]/30",
    circleText: "bg-[var(--teal)]/15 text-[var(--teal-dark)]",
    bullets: ["Lactancia y alimentación", "Esquema de vacunas", "Sueño y cólicos"],
  },
  {
    ageLabel: "2–6 años",
    ageRange: "2–6",
    label: "Preescolar",
    color: "text-[var(--mustard)]",
    bgColor: "bg-[var(--mustard)]/10",
    borderColor: "border-[var(--mustard)]/30",
    circleText: "bg-[var(--mustard)]/20 text-[var(--mustard)]",
    bullets: ["Hitos del desarrollo", "Control de esfínteres", "Adaptación al jardín"],
  },
  {
    ageLabel: "6–12 años",
    ageRange: "6–12",
    label: "Escolar",
    color: "text-[var(--sage)]",
    bgColor: "bg-[var(--sage)]/12",
    borderColor: "border-[var(--sage)]/30",
    circleText: "bg-[var(--sage)]/25 text-[var(--sage)]",
    bullets: ["Crecimiento y peso", "Rendimiento escolar", "Actividad física"],
  },
  {
    ageLabel: "12–18 años",
    ageRange: "12–18",
    label: "Adolescente",
    color: "text-[var(--coral)]",
    bgColor: "bg-[var(--coral)]/10",
    borderColor: "border-[var(--coral)]/25",
    circleText: "bg-[var(--coral)]/15 text-[var(--coral)]",
    bullets: ["Pubertad y desarrollo", "Salud mental", "Consulta confidencial"],
  },
];

export default function StagesSection() {
  return (
    <section
      id="etapas"
      className="py-24 lg:py-32 bg-[var(--surface)] border-y border-[var(--line)]"
    >
      <div className="max-w-[1280px] mx-auto px-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-14">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-6 h-[1px] bg-[var(--teal-dark)]" aria-hidden="true" />
              <span className="text-[11px] tracking-[0.18em] uppercase font-bold text-[var(--teal-dark)]">
                Etapas
              </span>
            </div>
            <h2 className="font-display text-[36px] lg:text-[48px] leading-[1.05] text-[var(--ink)] tracking-tight max-w-[500px]">
              Cada edad tiene su momento
              <span className="text-[var(--coral)]">.</span>
            </h2>
          </div>
          <p className="text-[15px] text-[var(--ink2)] leading-relaxed max-w-[340px] lg:text-right">
            Atención especializada según la etapa de desarrollo de tu hijo, con
            foco en lo que realmente importa en cada momento.
          </p>
        </div>

        {/* Stage cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {STAGES.map((stage) => (
            <div
              key={stage.label}
              className={cn(
                "rounded-[20px] border p-6 flex flex-col gap-5",
                "transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-pop)]",
                "shadow-[var(--shadow-card)]",
                stage.bgColor,
                stage.borderColor
              )}
            >
              {/* Age circle */}
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-14 h-14 rounded-full flex flex-col items-center justify-center shrink-0",
                    stage.circleText
                  )}
                >
                  <span className="font-display text-[14px] font-semibold leading-none">
                    {stage.ageRange}
                  </span>
                  <span className="text-[9px] font-medium mt-0.5 opacity-70">
                    años
                  </span>
                </div>
                <div>
                  <div
                    className={cn(
                      "text-[10px] tracking-[0.14em] uppercase font-bold",
                      stage.color
                    )}
                  >
                    {stage.ageLabel}
                  </div>
                  <div className="text-[16px] font-semibold text-[var(--ink)] tracking-tight">
                    {stage.label}
                  </div>
                </div>
              </div>

              {/* Bullets */}
              <ul className="flex flex-col gap-2.5">
                {stage.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="flex items-start gap-2 text-[13px] text-[var(--ink2)] leading-snug"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "mt-[5px] w-1.5 h-1.5 rounded-full shrink-0",
                        stage.circleText
                      )}
                    />
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
