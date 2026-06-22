import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  AlertCircle,
  Video,
  CalendarClock,
  Plus,
  MapPin,
  Sun,
  CalendarPlus,
  Trash2,
  Check,
  X,
  CircleUser,
  MessageCircle,
} from "lucide-react";
import api from "@/lib/api";
import { useSedeStore } from "../stores/useSedeStore";
import type {
  WaitlistEntry,
  PaginatedResponse,
  Patient,
  Service,
  Location,
  AvailableSlot,
} from "@/types/api";

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

function isoDatePlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatSlotLabel(date: string, time: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = isoDatePlus(1);
  const d = new Date(date + "T00:00:00");
  const hhmm = time.slice(0, 5);
  if (date === today) return `Hoy · ${hhmm}`;
  if (date === tomorrow) return `Mañana · ${hhmm}`;
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} · ${hhmm}`;
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
  patient_id: number;
  service_id: number;
  location_id: number | null;
  name: string;
  motivo: string;
  sede: string;
  prioridad: PrioKey;
  dias: number;
  pref: string;
  notes: string;
  preferred_date_start: string;
}

function enrich(e: WaitlistEntry & { patient?: number; service?: number; location?: number | null; preferred_date_start?: string }): EnrichedEntry {
  return {
    id: e.id,
    patient_id: e.patient ?? 0,
    service_id: e.service ?? 0,
    location_id: e.location ?? null,
    name: e.patient_name,
    motivo: e.service_name,
    sede: e.location_name || "Online",
    prioridad: PRIORITY_MAP[e.priority] ?? "media",
    dias: waitDays(e.created_at),
    pref: e.notes?.toLowerCase().includes("tarde") ? "Tarde" : "Mañana",
    notes: e.notes ?? "",
    preferred_date_start: e.preferred_date_start ?? new Date().toISOString().slice(0, 10),
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

// ─── shared input style ───────────────────────────────────────────────────────

const inputCls =
  "w-full px-3 py-2.5 rounded-[10px] bg-bg border border-line text-[13px] text-ink placeholder:text-ink3 focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition";

// ─── segmented control ────────────────────────────────────────────────────────

interface SegOption { v: string; label: string }

interface EsperaSegProps {
  label: string;
  options: (SegOption | string)[];
  value: string;
  onChange: (v: string) => void;
}

function EsperaSeg({ label, options, value, onChange }: EsperaSegProps) {
  return (
    <div>
      <label className="text-[11.5px] font-semibold text-ink2">{label}</label>
      <div className="mt-1.5 inline-flex p-1 rounded-[10px] bg-bg border border-line w-full">
        {options.map((o) => {
          const v = typeof o === "string" ? o : o.v;
          const lbl = typeof o === "string" ? o : o.label;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              className={`flex-1 px-2.5 py-1.5 rounded-[7px] text-[12px] font-semibold transition ${
                value === v ? "bg-teal-dark text-white shadow-soft" : "text-ink2 hover:bg-surface"
              }`}
            >
              {lbl}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── add to waitlist form ─────────────────────────────────────────────────────

interface AddFormState {
  patient: string;
  service: string;
  location: string; // "" = Online (null)
  horario: string;  // "Mañana" | "Tarde" — stored in notes
  priority: "HIGH" | "NORMAL" | "LOW";
  preferred_date_start: string;
  notes: string;
}

interface AddFormProps {
  onClose: () => void;
  onSuccess: (name: string) => void;
}

function AgregarEsperaForm({ onClose, onSuccess }: AddFormProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<AddFormState>({
    patient: "",
    service: "",
    location: "",
    horario: "Mañana",
    priority: "NORMAL",
    preferred_date_start: "",
    notes: "",
  });

  const set =
    (k: keyof AddFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((s) => ({ ...s, [k]: e.target.value }));
  const setV = (k: keyof AddFormState, v: string) =>
    setForm((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const { data: patientsData } = useQuery<PaginatedResponse<Patient>>({
    queryKey: ["patients-select"],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Patient>>("/patients/?page_size=200");
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: servicesData } = useQuery<Service[]>({
    queryKey: ["services-select"],
    queryFn: async () => {
      const { data } = await api.get<Service[]>("/services/");
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: locationsData } = useQuery<Location[]>({
    queryKey: ["locations-select"],
    queryFn: async () => {
      const { data } = await api.get<Location[]>("/locations/");
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const notesWithPref = [
        form.horario === "Tarde" ? "tarde" : "mañana",
        form.notes,
      ]
        .filter(Boolean)
        .join(". ");

      const payload: Record<string, unknown> = {
        patient: Number(form.patient),
        service: Number(form.service),
        location: form.location ? Number(form.location) : null,
        priority: form.priority,
        preferred_date_start: form.preferred_date_start,
        notes: notesWithPref,
      };
      const { data } = await api.post<WaitlistEntry>("/waitlist/", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waitlist"] });
      const patient = patientsData?.results.find((p) => p.id === Number(form.patient));
      onSuccess(patient?.full_name ?? "Paciente");
    },
  });

  const canSave = Boolean(form.patient && form.service && form.preferred_date_start);

  // Build location options for segmented control from real data + "Online"
  const locationOptions: SegOption[] = [
    ...(Array.isArray(locationsData)
      ? locationsData.map((l) => ({ v: String(l.id), label: l.name }))
      : []),
    { v: "", label: "Online" },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/25 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: "consultaFade 180ms ease-out" }}
      />

      {/* Panel */}
      <div
        className="relative h-full w-full max-w-[480px] bg-bg shadow-pop flex flex-col"
        style={{ animation: "consultaIn 280ms cubic-bezier(0.22,1,0.36,1)" }}
      >
        {/* Header */}
        <div className="shrink-0 bg-surface border-b border-line px-6 py-4 flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.12em] font-bold text-teal-dark">
              Lista de espera
            </div>
            <h3 className="text-[17px] font-bold text-ink leading-tight mt-1">Agregar familia</h3>
            <div className="text-[11.5px] text-ink3 mt-0.5">
              Se les avisará cuando se libere un cupo.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-[10px] bg-bg border border-line flex items-center justify-center text-ink2 hover:bg-line/50 transition shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Patient — col-span-2 */}
            <div className="col-span-2">
              <label className="text-[11.5px] font-semibold text-ink2">Paciente *</label>
              <select value={form.patient} onChange={set("patient")} className={`mt-1.5 ${inputCls}`}>
                <option value="">Seleccionar paciente…</option>
                {patientsData?.results.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </select>
            </div>

            {/* Service — col-span-2 */}
            <div className="col-span-2">
              <label className="text-[11.5px] font-semibold text-ink2">Tipo de consulta *</label>
              <select value={form.service} onChange={set("service")} className={`mt-1.5 ${inputCls}`}>
                <option value="">Seleccionar servicio…</option>
                {Array.isArray(servicesData)
                  ? servicesData.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))
                  : null}
              </select>
            </div>
          </div>

          {/* Sede — segmented with real locations + Online */}
          <EsperaSeg
            label="Sede preferida"
            value={form.location}
            onChange={(v) => setV("location", v)}
            options={locationOptions}
          />

          {/* Horario + Prioridad — 2-col grid */}
          <div className="grid grid-cols-2 gap-3">
            <EsperaSeg
              label="Horario"
              value={form.horario}
              onChange={(v) => setV("horario", v)}
              options={["Mañana", "Tarde"]}
            />
            <EsperaSeg
              label="Prioridad"
              value={form.priority}
              onChange={(v) => setV("priority", v)}
              options={[
                { v: "HIGH", label: "Alta" },
                { v: "NORMAL", label: "Media" },
                { v: "LOW", label: "Baja" },
              ]}
            />
          </div>

          {/* Preferred date */}
          <div>
            <label className="text-[11.5px] font-semibold text-ink2">Fecha preferida *</label>
            <input
              type="date"
              value={form.preferred_date_start}
              onChange={set("preferred_date_start")}
              className={`mt-1.5 ${inputCls}`}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-[11.5px] font-semibold text-ink2">Notas</label>
            <textarea
              value={form.notes}
              onChange={set("notes")}
              rows={3}
              placeholder="Motivo de consulta, observaciones…"
              className={`mt-1.5 ${inputCls} resize-none`}
            />
          </div>

          {/* Error */}
          {mutation.isError && (
            <div className="px-3 py-2.5 rounded-[10px] bg-err/10 border border-err/30 text-[12.5px] text-[#A85050]">
              Error al guardar. Intentá de nuevo.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 bg-surface border-t border-line px-6 py-3.5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-[10px] text-[12.5px] font-semibold text-ink2 hover:bg-bg transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!canSave || mutation.isPending}
            onClick={() => mutation.mutate()}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-[10px] bg-teal-dark text-white text-[12.5px] font-semibold hover:opacity-90 transition shadow-soft disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            ) : (
              <Plus size={15} />
            )}
            Agregar a la lista
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── offer-slot panel ─────────────────────────────────────────────────────────

interface SlotItem {
  date: string;
  start_time: string;
  label: string;
}

type OfferChannel = "EMAIL" | "WHATSAPP" | "PHONE";

interface OfrecerTurnoPanelProps {
  entry: EnrichedEntry;
  onClose: () => void;
  onSuccess: (name: string) => void;
}

function OfrecerTurnoPanel({ entry, onClose, onSuccess }: OfrecerTurnoPanelProps) {
  const queryClient = useQueryClient();
  const [selectedSlot, setSelectedSlot] = useState<SlotItem | null>(null);
  const [canal, setCanal] = useState<OfferChannel>("EMAIL");

  const av = esperaAvatar(entry.name);
  const pm = PRIO_META[entry.prioridad];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Fetch slots for today + next 3 days
  const dates = [0, 1, 2, 3].map(isoDatePlus);

  const slotQueries = useQuery<SlotItem[]>({
    queryKey: ["offer-slots", entry.service_id, entry.location_id, dates[0]],
    queryFn: async () => {
      const results: SlotItem[] = [];
      for (const date of dates) {
        const params = new URLSearchParams({
          service: String(entry.service_id),
          date,
        });
        if (entry.location_id) params.set("location", String(entry.location_id));
        try {
          const { data } = await api.get<AvailableSlot[]>(
            `/available-slots/?${params.toString()}`
          );
          for (const slot of data) {
            if (slot.available) {
              results.push({
                date,
                start_time: slot.start_time,
                label: formatSlotLabel(date, slot.start_time),
              });
            }
          }
        } catch {
          // skip days that error
        }
      }
      return results;
    },
    staleTime: 1000 * 60 * 2,
  });

  const slots = slotQueries.data ?? [];

  // Auto-select first slot when data arrives
  useEffect(() => {
    if (slots.length > 0 && !selectedSlot) {
      setSelectedSlot(slots[0]);
    }
  }, [slots, selectedSlot]);

  const offerMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSlot) throw new Error("No slot selected");
      await api.post(`/waitlist/${entry.id}/offer-slot/`, {
        scheduled_date: selectedSlot.date,
        start_time: selectedSlot.start_time,
        channel: canal,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waitlist"] });
      onSuccess(entry.name);
    },
  });

  const channelOptions: SegOption[] = [
    { v: "EMAIL", label: "Email" },
    { v: "WHATSAPP", label: "WhatsApp" },
    { v: "PHONE", label: "Llamada" },
  ];

  const firstName = entry.name.split(" ")[0];

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/25 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: "consultaFade 180ms ease-out" }}
      />

      {/* Panel */}
      <div
        className="relative h-full w-full max-w-[440px] bg-bg shadow-pop flex flex-col"
        style={{ animation: "consultaIn 280ms cubic-bezier(0.22,1,0.36,1)" }}
      >
        {/* Header */}
        <div className="shrink-0 bg-surface border-b border-line px-6 py-4 flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.12em] font-bold text-teal-dark">
              Ofrecer turno
            </div>
            <h3 className="text-[17px] font-bold text-ink leading-tight mt-1">Avisar a la familia</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-[10px] bg-bg border border-line flex items-center justify-center text-ink2 hover:bg-line/50 transition shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Patient info card */}
          <div className="flex items-center gap-3 p-3.5 rounded-[12px] bg-surface border border-line">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-[15px] font-bold shrink-0"
              style={{ background: av.bg, color: av.fg }}
            >
              {entry.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-bold text-ink">{entry.name}</div>
              <div className="text-[12px] text-ink2">{entry.motivo}</div>
              <div className="mt-1 flex items-center gap-2 flex-wrap text-[11px] text-ink3">
                <span className="inline-flex items-center gap-1">
                  <CircleUser size={10} />
                  {entry.sede}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin size={10} />
                  {entry.sede}
                </span>
                <span
                  className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-full text-[10.5px] font-semibold"
                  style={{ background: pm.bg, color: pm.text }}
                >
                  {pm.label}
                </span>
              </div>
            </div>
          </div>

          {/* Slot selector */}
          <div>
            <label className="text-[11.5px] font-semibold text-ink2">Cupo disponible</label>
            {slotQueries.isLoading ? (
              <div className="mt-2 flex items-center gap-2 text-[12px] text-ink3">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-line border-t-teal animate-spin" />
                Buscando cupos disponibles…
              </div>
            ) : slots.length === 0 ? (
              <div className="mt-2 px-3 py-2.5 rounded-[10px] bg-bg border border-line text-[12px] text-ink3">
                No hay cupos disponibles en los próximos días.
              </div>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2">
                {slots.map((s) => {
                  const isSelected =
                    selectedSlot?.date === s.date && selectedSlot?.start_time === s.start_time;
                  return (
                    <button
                      key={`${s.date}-${s.start_time}`}
                      type="button"
                      onClick={() => setSelectedSlot(s)}
                      className={`px-3 py-2.5 rounded-[10px] border text-[12.5px] font-semibold transition text-left ${
                        isSelected
                          ? "bg-teal/15 border-teal text-teal-dark"
                          : "bg-surface border-line text-ink2 hover:bg-bg"
                      }`}
                    >
                      <Clock size={12} className="inline mr-1.5 -mt-0.5" />
                      {s.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Channel selector */}
          <EsperaSeg
            label="Avisar por"
            value={canal}
            onChange={(v) => setCanal(v as OfferChannel)}
            options={channelOptions}
          />

          {/* Message preview */}
          {canal === "EMAIL" && selectedSlot && (
            <div className="p-3.5 rounded-[12px] bg-[#3E8E7C]/[0.08] border border-[#3E8E7C]/20">
              <div className="text-[11px] font-semibold text-[#3E8E7C] mb-1.5 flex items-center gap-1.5">
                <MessageCircle size={12} />
                Mensaje a la familia de {firstName}
              </div>
              <p className="text-[12px] text-ink2 leading-relaxed">
                Hola, le informamos que se liberó un cupo con la Dra. Estefanía para{" "}
                <span className="font-semibold text-ink">{entry.name}</span>:{" "}
                <span className="font-semibold text-ink">{selectedSlot.label}</span> en{" "}
                {entry.sede}. Por favor confirmanos si pueden asistir.
              </p>
            </div>
          )}

          {canal === "WHATSAPP" && selectedSlot && (
            <div className="p-3.5 rounded-[12px] bg-[#3E8E7C]/[0.08] border border-[#3E8E7C]/20">
              <div className="text-[11px] font-semibold text-[#3E8E7C] mb-1.5 flex items-center gap-1.5">
                <MessageCircle size={12} />
                Mensaje WhatsApp para la familia
              </div>
              <p className="text-[12px] text-ink2 leading-relaxed">
                Hola! 👋 Se liberó un cupo con la Dra. Estefi para {firstName}:{" "}
                <span className="font-semibold text-ink">{selectedSlot.label}</span> en{" "}
                {entry.sede}. ¿Lo confirmamos?
              </p>
            </div>
          )}

          {/* Error */}
          {offerMutation.isError && (
            <div className="px-3 py-2.5 rounded-[10px] bg-err/10 border border-err/30 text-[12.5px] text-[#A85050]">
              Error al ofrecer el turno. Intentá de nuevo.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 bg-surface border-t border-line px-6 py-3.5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-[10px] text-[12.5px] font-semibold text-ink2 hover:bg-bg transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!selectedSlot || offerMutation.isPending}
            onClick={() => offerMutation.mutate()}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-[10px] bg-teal-dark text-white text-[12.5px] font-semibold hover:opacity-90 transition shadow-soft disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {offerMutation.isPending ? (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            ) : (
              <CalendarPlus size={15} />
            )}
            Ofrecer y avisar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── confirm dialog ───────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  message: string;
  confirmLabel: string;
  confirmClass: string;
  onCancel: () => void;
  onConfirm: () => void;
  isPending: boolean;
}

function ConfirmDialog({
  message,
  confirmLabel,
  confirmClass,
  onCancel,
  onConfirm,
  isPending,
}: ConfirmDialogProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/25 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-[360px] bg-surface border border-line rounded-[16px] shadow-pop p-6 space-y-4">
        <p className="text-[14px] text-ink font-medium leading-snug">{message}</p>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-[10px] text-[12.5px] font-semibold text-ink2 hover:bg-bg transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={onConfirm}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[10px] text-[12.5px] font-semibold transition shadow-soft disabled:opacity-40 ${confirmClass}`}
          >
            {isPending ? (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            ) : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function WaitlistPage() {
  const { sedeName } = useSedeStore();
  const queryClient = useQueryClient();

  const [sedeFilter, setSedeFilter] = useState("Todas");
  const [prioFilter, setPrioFilter] = useState("todas");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // slide-over: add form
  const [addOpen, setAddOpen] = useState(false);

  // slide-over: offer-slot panel
  const [offerTarget, setOfferTarget] = useState<EnrichedEntry | null>(null);

  // confirm dialog: delete
  const [deleteTarget, setDeleteTarget] = useState<EnrichedEntry | null>(null);

  // sync sede store → local filter
  useEffect(() => {
    if (sedeName && sedeName !== "Todas") setSedeFilter(sedeName);
    else setSedeFilter("Todas");
  }, [sedeName]);

  const flash = (msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = setTimeout(() => setToast(null), 2400);
  };

  // ── main query ──────────────────────────────────────────────────────────────

  const { data, isLoading, isError } = useQuery<PaginatedResponse<WaitlistEntry>>({
    queryKey: ["waitlist"],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<WaitlistEntry>>(
        "/waitlist/?page_size=100&status=WAITING,NOTIFIED"
      );
      return data;
    },
    staleTime: 1000 * 60 * 2,
  });

  // ── delete mutation ─────────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/waitlist/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waitlist"] });
      setDeleteTarget(null);
      flash("Entrada eliminada de la lista de espera");
    },
  });

  // ── derived data ────────────────────────────────────────────────────────────

  const enriched = (data?.results ?? []).map((e) =>
    enrich(e as WaitlistEntry & { patient?: number; service?: number; location?: number | null; preferred_date_start?: string })
  );

  const shown = enriched.filter((e) => {
    if (sedeFilter !== "Todas" && e.sede !== sedeFilter) return false;
    if (prioFilter !== "todas" && e.prioridad !== prioFilter) return false;
    return true;
  });

  const total = enriched.length;
  const altas = enriched.filter((e) => e.prioridad === "alta").length;
  const online = enriched.filter((e) => e.sede === "Online").length;
  const promDias = total
    ? Math.round(enriched.reduce((s, e) => s + e.dias, 0) / total)
    : 0;

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <p className="text-[13.5px] text-ink2 max-w-xl">
          Familias que pidieron un cupo cuando no había disponibilidad. Cuando se libera un
          horario, ofrecé el turno con un clic y se les avisa.
        </p>
        <button
          onClick={() => setAddOpen(true)}
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
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => setOfferTarget(e)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] bg-teal-dark text-white text-[12px] font-semibold hover:opacity-90 transition shadow-soft"
                      >
                        <CalendarPlus size={14} />
                        Ofrecer turno
                      </button>
                      <button
                        onClick={() => setDeleteTarget(e)}
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

      {/* Add slide-over */}
      {addOpen && (
        <AgregarEsperaForm
          onClose={() => setAddOpen(false)}
          onSuccess={(name) => {
            setAddOpen(false);
            flash(`${name} agregado a la lista de espera`);
          }}
        />
      )}

      {/* Offer-slot slide-over panel */}
      {offerTarget && (
        <OfrecerTurnoPanel
          entry={offerTarget}
          onClose={() => setOfferTarget(null)}
          onSuccess={(name) => {
            setOfferTarget(null);
            flash(`Turno ofrecido a ${name}`);
          }}
        />
      )}

      {/* Delete confirm dialog */}
      {deleteTarget && (
        <ConfirmDialog
          message={`¿Quitar a ${deleteTarget.name} de la lista de espera?`}
          confirmLabel="Quitar"
          confirmClass="bg-[#A85050] text-white hover:opacity-90"
          isPending={deleteMutation.isPending}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        />
      )}

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
