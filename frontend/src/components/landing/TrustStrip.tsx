import { GraduationCap, Leaf, MapPin, Users } from "lucide-react";

interface TrustItem {
  icon: React.ElementType;
  iconBg: string;
  title: string;
  subtitle: string;
}

const TRUST_ITEMS: TrustItem[] = [
  {
    icon: GraduationCap,
    iconBg: "bg-[var(--teal)]/15 text-[var(--teal-dark)]",
    title: "Médica Pediatra",
    subtitle: "Formada en Argentina, validada en Chile",
  },
  {
    icon: Leaf,
    iconBg: "bg-[var(--sage)]/25 text-[var(--sage)]",
    title: "Enfoque integrativo",
    subtitle: "Medicina funcional y basada en evidencia",
  },
  {
    icon: MapPin,
    iconBg: "bg-[var(--mustard)]/20 text-[var(--mustard)]",
    title: "Presencial y online",
    subtitle: "Pucón, Villarrica y videollamada",
  },
  {
    icon: Users,
    iconBg: "bg-[var(--coral)]/20 text-[var(--coral)]",
    title: "+550 familias",
    subtitle: "5+ años de experiencia",
  },
];

export default function TrustStrip() {
  return (
    <div className="border-y border-[var(--line)] bg-[var(--surface)]/70">
      <div className="max-w-[1280px] mx-auto px-6 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {TRUST_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="flex items-center gap-4"
              >
                <div
                  className={`shrink-0 w-11 h-11 rounded-[12px] flex items-center justify-center ${item.iconBg}`}
                >
                  <Icon size={20} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[13.5px] font-semibold text-[var(--ink)]">
                    {item.title}
                  </span>
                  <span className="text-[12px] text-[var(--ink3)]">
                    {item.subtitle}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
