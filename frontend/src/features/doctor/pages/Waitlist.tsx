import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  AlertCircle,
  Video,
  CalendarClock,
  Plus,
  MapPin,
  Sun,
  Phone,
  MessageCircle,
  CalendarPlus,
  Trash2,
  Check,
} from "lucide-react";
import api from "@/lib/api";
import { useSedeStore } from "../stores/useSedeStore";
import type { WaitlistEntry, PaginatedResponse } from "@/types/api";

// ─── helpers ──────────────────────────────────────────────────────────────────

function waitDays(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
}

function esperaAvatar(name: string): { fg: string; bg: string } {
  const palettes: [string, string][] = [
    ["#F4A89A", "#FFE2D9"],
    ["#7DD3C0", "#D6F1EA"],
    ["#C7B8E8", "#EDE4FF"],
    ["#A8D5B5", "#DAEFE0"],
    ["#F5D4A0", "#FCEACB"],
  ];
  const [fg, bg] = palettes[name.charCodeAt(0) % palettes.length];
  return { fg, bg };
}

// ─── maps ─────────────────────────────────────────────────────────────────────

type PrioKey = "alta" | "media" | "baja";

const PRIORITY_MAP: Record<WaitlistEntry["priority"], PrioKey> = {
  HIGH: "alta",
  NORMAL: "media",
  LOW: "baja",
};

const PRIO_META: Record<PrioKey, { label: string; bg: string; text: string; dot: string }> = {
  alta:  { label: "Alta",  bg: "rgba(232, 160, 160, 0.28)", text: "#A85050", dot: "#E8A0A0" },
  media: { label: "Media", bg: "rgba(245, 212, 160, 0.45)", text: "#9C7423", dot: "#F5D4A0" },
  baja:  { label: "Baja",  bg: "rgba(168, 213, 181, 0.30)", text: "#3F8358", dot: "#A8D5B5" },
};

// ─── row type (enriched from API) ─────────────────────────────────────────────

interface EnrichedEntry {
  id: number;
  name: string;
  motivo: string;
  sede: string;
  prioridad: PrioKey;
  dias: number;
  phone: string;
  pref: string;
}

function enrich(e: WaitlistEntry): EnrichedEntry {
  return {
    id: e.id,
    name: e.patient_name,
    motivo: e.service_name,
    sede: e.location_name || "Pucón",
    prioridad: PRIORITY_MAP[e.priority],
    dias: waitDays(e.created_at),
    phone: "—",
    pref: e.notes?.toLowerCase().includes("tarde") ? "Tarde" : "Mañana",
  };
}

// ─── metric card ──────────────────────────────────────────────────────────────

interface EsperaMetricProps {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  value: string | number;
  label: string;
}

function EsperaMetric({ icon, iconBg, iconColor, value, label }: EsperaMetricProps) {
  return (
    <div className="bg-surface border border-line rounded-[14px] p-4 shadow-card">
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
          style={{ background: iconBg, color: iconColor }}
        >
          {icon}
        </div>
        <div>
          <div className="text-[22px] font-bold text-ink leading-none tracking-tight">{value}</div>
          <div className="text-[11.5px] text-ink2 mt-1 font-medium">{label}</div>
        </div>
      </div>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function WaitlistPage() {
  const { sedeName } = useSedeStore();
  const [sedeFilter, setSedeFilter] = useState("Todas");
  const [prioFilter, setPrioFilter] = useState("todas");
  const [localList, setLocalList] = useState<EnrichedEntry[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  // sync sede store → local filter
  useEffect(() => {
    if (sedeName && sedeName !== "Todas") setSedeFilter(sedeName);
    else setSedeFilter("Todas");
  }, [sedeName]);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  const { data, isLoading, isError } = useQuery<PaginatedResponse<WaitlistEntry>>({
    queryKey: ["waitlist"],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<WaitlistEntry>>("/waitlist/?page_size=100");
      return data;
    },
    staleTime: 1000 * 60 * 2,
  });

  // sync API data → local enriched list (only on first load)
  useEffect(() => {
    if (data?.results) {
      setLocalList(data.results.map(enrich));
    }
  }, [data]);

  const ofrecer = (id: number) => {
    const e = localList.find((x) => x.id === id);
    setLocalList((prev) => prev.filter((x) => x.id !== id));
    if (e) flash(`Turno ofrecido a ${e.name} por WhatsApp`);
  };

  const quitar = (id: number) => {
    setLocalList((prev) => prev.filter((x) => x.id !== id));
  };

  const shown = localList.filter((e) => {
    if (sedeFilter !== "Todas" && e.sede !== sedeFilter) return false;
    if (prioFilter !== "todas" && e.prioridad !== prioFilter) return false;
    return true;
  });

  const total = localList.length;
  const altas = localList.filter((e) => e.prioridad === "alta").length;
  const online = localList.filter((e) => e.sede === "Online").length;
  const promDias = total ? Math.round(localList.reduce((s, e) => s + e.dias, 0) / total) : 0;

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <p className="text-[13.5px] text-ink2 max-w-xl">
          Familias que pidieron un cupo cuando no había disponibilidad. Cuando se libera un horario,
          ofrecé el turno con un clic y se les avisa por WhatsApp.
        </p>
        <button
          onClick={() => flash("Formulario para agregar a la lista (demo)")}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-teal-dark text-white text-[13px] font-semibold hover:opacity-90 transition shadow-soft"
        >
          <Plus size={15} />
          Agregar a la lista
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <EsperaMetric
          icon={<Clock size={16} />}
          iconBg="rgba(125, 211, 192, 0.20)"
          iconColor="#3E8E7C"
          value={total}
          label="En lista de espera"
        />
        <EsperaMetric
          icon={<AlertCircle size={16} />}
          iconBg="rgba(232, 160, 160, 0.28)"
          iconColor="#A85050"
          value={altas}
          label="Prioridad alta"
        />
        <EsperaMetric
          icon={<Video size={16} />}
          iconBg="rgba(244, 168, 154, 0.25)"
          iconColor="#B5604F"
          value={online}
          label="Prefieren online"
        />
        <EsperaMetric
          icon={<CalendarClock size={16} />}
          iconBg="rgba(199, 184, 232, 0.28)"
          iconColor="#6B569E"
          value={`${promDias} días`}
          label="Espera promedio"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {["Todas", "Pucón", "Villarrica", "Online"].map((s) => (
          <button
            key={s}
            onClick={() => setSedeFilter(s)}
            className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold transition border ${
              sedeFilter === s
                ? "bg-teal/20 border-teal/40 text-teal-dark"
                : "bg-surface border-line text-ink2 hover:bg-bg"
            }`}
          >
            {s}
          </button>
        ))}
        <div className="w-px h-5 bg-line mx-1" />
        {(
          [
            ["todas", "Toda prioridad"],
            ["alta", "Alta"],
            ["media", "Media"],
            ["baja", "Baja"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setPrioFilter(id)}
            className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold transition border ${
              prioFilter === id
                ? "bg-lavender/25 border-lavender/50 text-[#6B569E]"
                : "bg-surface border-line text-ink2 hover:bg-bg"
            }`}
          >
            {label}
          </button>
        ))}
        <div className="flex-1" />
        <span className="text-[11.5px] text-ink3">
          {shown.length} de {total}
        </span>
      </div>

      {/* List */}
      <div className="bg-surface border border-line rounded-[14px] shadow-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-5 w-5 rounded-full border-2 border-line border-t-teal animate-spin" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-ink3">
            <AlertCircle size={28} className="opacity-40" />
            <p className="text-[13px]">Error al cargar la lista de espera</p>
          </div>
        ) : shown.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-ok/20 flex items-center justify-center mb-3 text-[#3F8358]">
              <Check size={22} />
            </div>
            <div className="text-[14px] font-bold text-ink">Sin familias en espera</div>
            <div className="text-[12px] text-ink3 mt-1">
              Cuando no haya cupos, las solicitudes aparecerán acá.
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-line/70">
            {shown.map((e) => {
              const av = esperaAvatar(e.name);
              const pm = PRIO_META[e.prioridad];
              return (
                <li key={e.id} className="px-5 py-4 hover:bg-bg transition">
                  <div className="flex items-start gap-4 flex-wrap">
                    {/* Avatar */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-bold shrink-0"
                      style={{ background: av.bg, color: av.fg }}
                    >
                      {e.name.charAt(0)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-[180px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[14px] font-bold text-ink">{e.name}</span>
                        <span
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-semibold"
                          style={{ background: pm.bg, color: pm.text }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: pm.dot }}
                          />
                          Prioridad {pm.label}
                        </span>
                      </div>
                      <div className="mt-1 text-[12.5px] text-ink2">{e.motivo}</div>
                      <div className="mt-1.5 flex items-center gap-3 flex-wrap text-[11.5px] text-ink3">
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={11} />
                          {e.sede}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Sun size={11} />
                          Prefiere {e.pref.toLowerCase()}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={11} />
                          En espera {e.dias} {e.dias === 1 ? "día" : "días"}
                        </span>
                        {e.phone !== "—" && (
                          <span className="inline-flex items-center gap-1">
                            <Phone size={11} />
                            {e.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => flash(`Abriendo WhatsApp de ${e.name}…`)}
                        className="w-9 h-9 rounded-[10px] bg-surface border border-line flex items-center justify-center text-ink2 hover:bg-bg hover:text-[#3E8E7C] transition"
                        title="WhatsApp"
                      >
                        <MessageCircle size={15} />
                      </button>
                      <button
                        onClick={() => ofrecer(e.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] bg-teal-dark text-white text-[12px] font-semibold hover:opacity-90 transition shadow-soft"
                      >
                        <CalendarPlus size={14} />
                        Ofrecer turno
                      </button>
                      <button
                        onClick={() => quitar(e.id)}
                        className="w-9 h-9 rounded-[10px] flex items-center justify-center text-ink3 hover:text-[#A85050] hover:bg-err/10 transition"
                        title="Quitar de la lista"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-[12px] bg-ink text-white text-[12.5px] font-semibold shadow-pop flex items-center gap-2">
          <Check size={14} className="text-teal" />
          {toast}
        </div>
      )}
    </div>
  );
}
