import { useState } from "react";
import {
  Search,
  MessageCircle,
  Mail,
  Phone,
  ChevronRight,
  CalendarX2,
  Wallet,
  Video,
  Smartphone,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/features/tutor/components/portal-ui";

// ─── FAQ items ───────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    icon: CalendarX2,
    label: "Cómo cancelar un turno",
    description:
      "Podés cancelar desde Mis turnos hasta 24 hs antes. Después de ese plazo, comunicate por WhatsApp.",
  },
  {
    icon: Wallet,
    label: "Reembolsos con isapre",
    description:
      "Pedí tu boleta electrónica por email después de la consulta. La presentás directo en tu isapre para el reembolso.",
  },
  {
    icon: Video,
    label: "Cómo unirme a la videollamada",
    description:
      "El día de tu consulta online vas a recibir un link por email y WhatsApp 30 minutos antes. Solo necesitás un dispositivo con cámara.",
  },
  {
    icon: Smartphone,
    label: "Cambiar mi número de WhatsApp",
    description:
      "Andá a Mi perfil y editá tu teléfono. Ese número es el que usamos para recordatorios y comunicaciones.",
  },
];

// ─── Contact channels ────────────────────────────────────────────────────────

const CONTACT_CHANNELS = [
  {
    icon: MessageCircle,
    title: "WhatsApp directo",
    detail: "Respondemos lun\u2013vie en 4 hs máximo.",
    actionLabel: "Abrir WhatsApp",
    href: "https://wa.me/56945000000",
    color: "#25D366",
    bg: "rgba(37,211,102,0.12)",
  },
  {
    icon: Mail,
    title: "Email",
    detail: "hola@estefipediatra.com",
    actionLabel: "Escribir email",
    href: "mailto:hola@estefipediatra.com",
    color: "#2563EB",
    bg: "rgba(37,99,235,0.12)",
  },
  {
    icon: Phone,
    title: "Llamada",
    detail: "+56 9 4500 0000",
    actionLabel: "Llamar",
    href: "tel:+56945000000",
    color: "#0D9488",
    bg: "rgba(13,148,136,0.12)",
  },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function HelpPage() {
  const [search, setSearch] = useState("");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const filtered = search.trim()
    ? FAQ_ITEMS.filter(
        (item) =>
          item.label.toLowerCase().includes(search.toLowerCase()) ||
          item.description.toLowerCase().includes(search.toLowerCase()),
      )
    : FAQ_ITEMS;

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-[28px] font-semibold text-ink mb-1">
          ¿En qué te ayudamos?
        </h1>
        <p className="text-[14px] text-ink3">
          Preguntas frecuentes y canales de contacto.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink3"
        />
        <input
          type="text"
          placeholder="Buscar en ayuda..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-[12px] bg-surface border border-line pl-10 pr-4 py-3 text-[13.5px] text-ink placeholder:text-ink3 focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition shadow-[var(--shadow-soft)]"
        />
      </div>

      {/* FAQ */}
      <Card>
        <h2 className="text-[15px] font-bold text-ink mb-4">
          Preguntas frecuentes
        </h2>
        <div className="divide-y divide-line -mx-5">
          {filtered.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-ink3 text-center">
              No encontramos resultados para tu búsqueda.
            </p>
          ) : (
            filtered.map((item, i) => {
              const Icon = item.icon;
              const isOpen = expandedIndex === i;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setExpandedIndex(isOpen ? null : i)}
                  className="w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-bg/60 transition-colors"
                >
                  <div
                    className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      backgroundColor: "rgba(13,148,136,0.12)",
                      color: "#0D9488",
                    }}
                  >
                    <Icon size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13.5px] font-semibold text-ink">
                        {item.label}
                      </span>
                      <ChevronRight
                        size={14}
                        className={`shrink-0 text-ink3 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
                      />
                    </div>
                    {isOpen && (
                      <p className="text-[12.5px] text-ink2 leading-relaxed mt-1.5">
                        {item.description}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </Card>

      {/* Contact channels */}
      <div>
        <h2 className="text-[15px] font-bold text-ink mb-3">
          Contacto directo
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {CONTACT_CHANNELS.map((ch) => {
            const Icon = ch.icon;
            return (
              <Card key={ch.title} className="flex flex-col">
                <div
                  className="w-10 h-10 rounded-[12px] flex items-center justify-center mb-3"
                  style={{ backgroundColor: ch.bg, color: ch.color }}
                >
                  <Icon size={18} />
                </div>
                <h3 className="text-[13.5px] font-bold text-ink mb-0.5">
                  {ch.title}
                </h3>
                <p className="text-[11.5px] text-ink3 leading-snug mb-4 flex-1">
                  {ch.detail}
                </p>
                <a
                  href={ch.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-teal-dark hover:gap-2 transition-all"
                >
                  {ch.actionLabel}
                  <ExternalLink size={11} />
                </a>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
