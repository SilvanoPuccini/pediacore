import { GraduationCap, Monitor, MapPin, Heart } from "lucide-react";

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
    title: "Pediatra titulada",
    subtitle: "U. de Chile · Especialista",
  },
  {
    icon: Monitor,
    iconBg: "bg-[var(--coral)]/20 text-[var(--coral)]",
    title: "Consulta online",
    subtitle: "Para familias en regiones",
  },
  {
    icon: MapPin,
    iconBg: "bg-[var(--mustard)]/20 text-[var(--mustard)]",
    title: "2 sedes",
    subtitle: "Pucón & Villarrica",
  },
  {
    icon: Heart,
    iconBg: "bg-[var(--sage)]/25 text-[var(--sage)]",
    title: "Trato cálido",
    subtitle: "Cada familia es única",
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
