import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MapPin,
  Video,
  Clock,
  Plus,
  X,
  Check,
  Star,
  Calendar,
  Sun,
  AlertCircle,
  Trash2,
} from "lucide-react";
import api from "@/lib/api";
import type { WorkingHours, Location, BlockedSlot } from "@/types/api";

// ─── constants ────────────────────────────────────────────────────────────────

const HOR_DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;
type DayKey = (typeof HOR_DAYS)[number];

// ─── types ────────────────────────────────────────────────────────────────────

interface TimeBlock {
  start: string;
  end: string;
}

interface DaySchedule {
  enabled: boolean;
  blocks: TimeBlock[];
}

type SedeSchedule = Record<DayKey, DaySchedule>;
type FullSchedule = Record<string, SedeSchedule>;

type BlockedTipo = "feriado" | "evento" | "vacaciones";

// ─── helpers ──────────────────────────────────────────────────────────────────

function minutesBetween(a: string, b: string): number {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return bh * 60 + bm - (ah * 60 + am);
}

function emptySedeSchedule(): SedeSchedule {
  return Object.fromEntries(
    HOR_DAYS.map((d) => [d, { enabled: false, blocks: [] }])
  ) as unknown as SedeSchedule;
}

function buildScheduleFromApi(
  locations: Location[],
  hours: WorkingHours[]
): FullSchedule {
  const schedule: FullSchedule = {};
  for (const loc of locations) {
    schedule[loc.name] = emptySedeSchedule();
  }

  for (const h of hours) {
    if (!h.is_active) continue;
    const day = HOR_DAYS[h.day_of_week];
    if (!day) continue;
    const block = { start: h.start_time.slice(0, 5), end: h.end_time.slice(0, 5) };

    if (h.location) {
      // Hours assigned to a specific location
      const loc = locations.find((l) => l.id === h.location);
      if (loc && schedule[loc.name]) {
        schedule[loc.name][day].enabled = true;
        schedule[loc.name][day].blocks.push(block);
      }
    } else if (h.is_online) {
      // Online hours (location is null, is_online true)
      if (!schedule["Online"]) schedule["Online"] = emptySedeSchedule();
      schedule["Online"][day].enabled = true;
      schedule["Online"][day].blocks.push(block);
    } else {
      // Hours without location — assign to first location as fallback
      const firstLoc = locations[0];
      if (firstLoc && schedule[firstLoc.name]) {
        schedule[firstLoc.name][day].enabled = true;
        schedule[firstLoc.name][day].blocks.push(block);
      }
    }
  }
  return schedule;
}

function guessTipo(reason: string): BlockedTipo {
  const r = reason.toLowerCase();
  if (r.includes("feriado") || r.includes("nacional")) return "feriado";
  if (r.includes("vacacion")) return "vacaciones";
  return "evento";
}

function formatBlockedDate(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const fmt = (d: Date) =>
    d.toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });
  // Same day or next-day-midnight = single day
  const diffMs = e.getTime() - s.getTime();
  if (diffMs <= 86400000) return fmt(s);
  return `${fmt(s)} – ${fmt(e)}`;
}

const tipoChip: Record<
  BlockedTipo,
  { bg: string; text: string; icon: React.ReactNode }
> = {
  feriado:    { bg: "rgba(232, 160, 160, 0.25)", text: "#A85050", icon: <Star size={14} /> },
  evento:     { bg: "rgba(199, 184, 232, 0.28)", text: "#6B569E", icon: <Calendar size={14} /> },
  vacaciones: { bg: "rgba(245, 212, 160, 0.45)", text: "#9C7423", icon: <Sun size={14} /> },
};

// ─── page ─────────────────────────────────────────────────────────────────────

export default function HorariosPage() {
  const [activeSede, setActiveSede] = useState<string>("Pucón");
  const [schedule, setSchedule] = useState<FullSchedule>({});
  const [sedes, setSedes] = useState<string[]>([]);
  const [duracion, setDuracion] = useState(45);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [newBlock, setNewBlock] = useState<{ startDate: string; endDate: string; reason: string; tipo: BlockedTipo }>({
    startDate: "", endDate: "", reason: "", tipo: "feriado",
  });
  const [conflictWarning, setConflictWarning] = useState<{ count: number; appointments: { id: number; patient_name: string; service_name: string; scheduled_date: string; start_time: string }[] } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  // API queries
  const hoursQ = useQuery<WorkingHours[]>({
    queryKey: ["working-hours"],
    queryFn: async () => {
      const { data } = await api.get<{ results: WorkingHours[] }>("/admin/working-hours/?page_size=200");
      return data.results;
    },
    staleTime: 1000 * 60 * 10,
  });

  const locationsQ = useQuery<Location[]>({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data } = await api.get<{ results: Location[] }>("/practices/dra-estefi/locations/");
      return data.results;
    },
    staleTime: 1000 * 60 * 60,
  });

  const blockedQ = useQuery<BlockedSlot[]>({
    queryKey: ["blocked-slots"],
    queryFn: async () => {
      const { data } = await api.get<{ results: BlockedSlot[] }>("/admin/blocked-slots/?page_size=200");
      return data.results;
    },
    staleTime: 1000 * 60 * 5,
  });

  const createBlockedMutation = useMutation({
    mutationFn: async (payload: { start_datetime: string; end_datetime: string; reason: string }) => {
      await api.post("/admin/blocked-slots/", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked-slots"] });
      flash("Día bloqueado");
      setShowBlockForm(false);
      setNewBlock({ startDate: "", endDate: "", reason: "", tipo: "feriado" });
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      const msg = detail
        ? Object.values(detail).flat().join(". ")
        : "Error al bloquear día";
      flash(msg || "Error al bloquear día");
    },
  });

  const deleteBlockedMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/admin/blocked-slots/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked-slots"] });
      flash("Día desbloqueado");
    },
    onError: () => flash("Error al desbloquear día"),
  });

  const locations = locationsQ.data ?? [];
  const hours = hoursQ.data ?? [];
  const blocked = blockedQ.data ?? [];
  const isLoading = hoursQ.isLoading || locationsQ.isLoading;
  const isError = hoursQ.isError || locationsQ.isError;

  // Populate schedule from API data + add Online if needed
  useEffect(() => {
    if (locations.length === 0) return;
    const apiSedes = locations.map((l) => l.name);
    const allSedes = apiSedes.includes("Online") ? apiSedes : [...apiSedes, "Online"];
    setSedes(allSedes);

    const built = buildScheduleFromApi(locations, hours);
    // ensure Online key exists
    if (!built["Online"]) built["Online"] = emptySedeSchedule();
    setSchedule(built);

    if (!built[activeSede]) setActiveSede(allSedes[0] ?? "Pucón");
  }, [locations, hours]); // eslint-disable-line react-hooks/exhaustive-deps

  const sedeSched: SedeSchedule = schedule[activeSede] ?? emptySedeSchedule();

  // schedule mutations
  const toggleDay = (day: DayKey) => {
    setSchedule((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as FullSchedule;
      if (!next[activeSede]) next[activeSede] = emptySedeSchedule();
      const d = next[activeSede][day];
      d.enabled = !d.enabled;
      if (d.enabled && d.blocks.length === 0) d.blocks = [{ start: "09:00", end: "13:00" }];
      return next;
    });
  };

  const addBlock = (day: DayKey) => {
    setSchedule((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as FullSchedule;
      if (!next[activeSede]) next[activeSede] = emptySedeSchedule();
      const d = next[activeSede][day];
      d.enabled = true;
      const last = d.blocks[d.blocks.length - 1];
      d.blocks.push(last ? { start: last.end, end: "18:00" } : { start: "09:00", end: "13:00" });
      return next;
    });
  };

  const removeBlock = (day: DayKey, i: number) => {
    setSchedule((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as FullSchedule;
      if (!next[activeSede]) next[activeSede] = emptySedeSchedule();
      const d = next[activeSede][day];
      d.blocks.splice(i, 1);
      if (d.blocks.length === 0) d.enabled = false;
      return next;
    });
  };

  const editBlock = (day: DayKey, i: number, field: "start" | "end", val: string) => {
    setSchedule((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as FullSchedule;
      if (!next[activeSede]) next[activeSede] = emptySedeSchedule();
      next[activeSede][day].blocks[i][field] = val;
      return next;
    });
  };

  const doBlock = (startDt: string, endDt: string) => {
    createBlockedMutation.mutate({
      start_datetime: startDt,
      end_datetime: endDt,
      reason: newBlock.reason || newBlock.tipo,
    });
  };

  const addBlocked = async () => {
    if (!newBlock.startDate) { flash("Indicá una fecha de inicio"); return; }
    const startDt = `${newBlock.startDate}T00:00:00`;
    const endDt = newBlock.endDate
      ? `${newBlock.endDate}T23:59:59`
      : `${newBlock.startDate}T23:59:59`;

    try {
      const { data } = await api.post<{
        count: number;
        appointments: { id: number; patient_name: string; service_name: string; scheduled_date: string; start_time: string }[];
      }>("/admin/blocked-slots/check-conflicts/", {
        start_datetime: startDt,
        end_datetime: endDt,
      });

      if (data.count > 0) {
        setConflictWarning({ count: data.count, appointments: data.appointments });
        return;
      }
    } catch {
      // If check fails, proceed anyway
    }

    doBlock(startDt, endDt);
  };

  const confirmBlock = () => {
    const startDt = `${newBlock.startDate}T00:00:00`;
    const endDt = newBlock.endDate
      ? `${newBlock.endDate}T23:59:59`
      : `${newBlock.startDate}T23:59:59`;
    setConflictWarning(null);
    doBlock(startDt, endDt);
  };

  // capacity calculation
  const stats = useMemo(() => {
    let mins = 0, days = 0;
    HOR_DAYS.forEach((d) => {
      const day = sedeSched[d];
      if (day?.enabled) {
        days++;
        day.blocks.forEach((b) => { mins += minutesBetween(b.start, b.end); });
      }
    });
    return {
      horas: (mins / 60).toFixed(1),
      turnos: Math.floor(mins / duracion),
      days,
    };
  }, [sedeSched, duracion]);

  // display sedes (fallback if API not loaded)
  const displaySedes = sedes.length > 0 ? sedes : ["Pucón", "Villarrica", "Online"];

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <p className="text-[13.5px] text-ink2 max-w-xl">
          Definí tus horarios de atención por sede. Esto determina los cupos que las familias
          pueden reservar online.
        </p>
        <button
          onClick={() => flash("Cambios guardados")}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-teal-dark text-white text-[13px] font-semibold hover:opacity-90 transition shadow-soft"
        >
          <Check size={15} />
          Guardar cambios
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-5 w-5 rounded-full border-2 border-line border-t-teal animate-spin" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-ink3">
          <AlertCircle size={28} className="opacity-40" />
          <p className="text-[13px]">Error al cargar los horarios</p>
        </div>
      ) : (
        <>
          {/* Sede tabs */}
          <div className="inline-flex p-1 rounded-[12px] bg-surface border border-line">
            {displaySedes.map((s) => (
              <button
                key={s}
                onClick={() => setActiveSede(s)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-[12.5px] font-semibold transition ${
                  activeSede === s
                    ? "bg-teal-dark text-white shadow-soft"
                    : "text-ink2 hover:bg-bg"
                }`}
              >
                {s === "Online" ? <Video size={13} /> : <MapPin size={13} />}
                {s}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
            {/* Weekly schedule */}
            <div className="bg-surface border border-line rounded-[14px] shadow-card overflow-hidden">
              <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-[15px] font-bold text-ink">
                    Horario semanal · {activeSede}
                  </h3>
                  <p className="text-[11.5px] text-ink3 mt-0.5">
                    {stats.days} días de atención · {stats.horas} h por semana
                  </p>
                </div>
                {activeSede === "Online" ? (
                  <Video size={16} className="text-ink3" />
                ) : (
                  <MapPin size={16} className="text-ink3" />
                )}
              </div>

              <div className="divide-y divide-line/70">
                {HOR_DAYS.map((d) => {
                  const day = sedeSched[d] ?? { enabled: false, blocks: [] };
                  const weekend = d === "Sáb" || d === "Dom";
                  return (
                    <div
                      key={d}
                      className={`flex items-center gap-4 px-5 py-3.5 ${!day.enabled ? "opacity-60" : ""}`}
                    >
                      <div className="w-12 shrink-0">
                        <span className={`text-[13px] font-bold ${weekend ? "text-ink3" : "text-ink"}`}>
                          {d}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        {day.enabled && day.blocks.length > 0 ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            {day.blocks.map((b, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-[9px] bg-teal/15 text-teal-dark text-[12px] font-semibold"
                              >
                                <Clock size={12} />
                                <input
                                  type="time"
                                  value={b.start}
                                  onChange={(e) => editBlock(d, i, "start", e.target.value)}
                                  className="bg-transparent w-[58px] text-teal-dark font-semibold focus:outline-none focus:bg-white/60 rounded px-0.5"
                                />
                                <span className="text-teal-dark/60">–</span>
                                <input
                                  type="time"
                                  value={b.end}
                                  onChange={(e) => editBlock(d, i, "end", e.target.value)}
                                  className="bg-transparent w-[58px] text-teal-dark font-semibold focus:outline-none focus:bg-white/60 rounded px-0.5"
                                />
                                <button
                                  onClick={() => removeBlock(d, i)}
                                  className="ml-0.5 w-5 h-5 rounded-full flex items-center justify-center hover:bg-white/60 text-teal-dark/70 hover:text-[#A85050] transition"
                                  title="Quitar bloque"
                                >
                                  <X size={11} />
                                </button>
                              </span>
                            ))}
                            <button
                              onClick={() => addBlock(d)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[9px] border border-dashed border-line text-ink3 hover:text-teal-dark hover:border-teal/40 transition text-[11.5px] font-semibold"
                            >
                              <Plus size={12} /> Bloque
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addBlock(d)}
                            className="inline-flex items-center gap-1 text-[12px] text-ink3 italic hover:text-teal-dark transition"
                          >
                            No atiende ·{" "}
                            <span className="not-italic font-semibold inline-flex items-center gap-0.5">
                              <Plus size={11} />
                              agregar horario
                            </span>
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => toggleDay(d)}
                        className="shrink-0"
                        title={day.enabled ? "Desactivar día" : "Activar día"}
                      >
                        <span
                          className={`relative inline-flex items-center w-10 h-[22px] rounded-full transition ${
                            day.enabled ? "bg-teal-dark" : "bg-line"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-all ${
                              day.enabled ? "left-[20px]" : "left-0.5"
                            }`}
                          />
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Side panel */}
            <div className="space-y-5">
              {/* Slot duration */}
              <div className="bg-surface border border-line rounded-[14px] shadow-card p-5">
                <h3 className="text-[14px] font-bold text-ink">Duración del turno</h3>
                <div className="mt-3 flex items-center gap-2">
                  {[30, 45, 60].map((m) => (
                    <button
                      key={m}
                      onClick={() => setDuracion(m)}
                      className={`flex-1 px-3 py-2 rounded-[10px] text-[12.5px] font-semibold transition border ${
                        duracion === m
                          ? "bg-teal-dark text-white border-teal-dark"
                          : "bg-surface text-ink2 border-line hover:bg-bg"
                      }`}
                    >
                      {m} min
                    </button>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-line/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-ink2">Anticipación mínima</span>
                    <span className="text-[12.5px] font-semibold text-ink">2 horas</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-ink2">Reserva máxima</span>
                    <span className="text-[12.5px] font-semibold text-ink">60 días</span>
                  </div>
                </div>
              </div>

              {/* Capacity */}
              <div className="bg-surface border border-line rounded-[14px] shadow-card p-5">
                <h3 className="text-[14px] font-bold text-ink">Capacidad semanal</h3>
                <div className="mt-3 flex items-stretch gap-3">
                  <div className="flex-1 rounded-[12px] bg-teal/10 p-3.5">
                    <div className="text-[11px] font-semibold text-teal-dark">Cupos / semana</div>
                    <div className="mt-1 text-[24px] font-bold text-ink leading-none tracking-tight">
                      {stats.turnos}
                    </div>
                  </div>
                  <div className="flex-1 rounded-[12px] bg-lavender/15 p-3.5">
                    <div className="text-[11px] font-semibold text-[#6B569E]">Horas / semana</div>
                    <div className="mt-1 text-[24px] font-bold text-ink leading-none tracking-tight">
                      {stats.horas}
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-ink3">
                  Calculado con turnos de {duracion} min en {activeSede}.
                </p>
              </div>

              {/* Blocked days */}
              <div className="bg-surface border border-line rounded-[14px] shadow-card overflow-hidden">
                <div className="px-5 pt-5 pb-2 flex items-center justify-between">
                  <h3 className="text-[14px] font-bold text-ink">Días bloqueados</h3>
                  <button
                    onClick={() => setShowBlockForm((v) => !v)}
                    className={`rounded-lg p-1 transition ${
                      showBlockForm ? "bg-teal/15 text-teal-dark" : "text-teal-dark hover:bg-teal/10"
                    }`}
                    title="Bloquear día"
                  >
                    {showBlockForm ? <X size={16} /> : <Plus size={16} />}
                  </button>
                </div>

                {showBlockForm && (
                  <div className="mx-3 mb-2 p-3 rounded-[12px] bg-bg border border-line space-y-2 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <label className="text-[10.5px] font-semibold text-ink3 mb-0.5 block">Desde</label>
                        <input
                          type="date"
                          value={newBlock.startDate}
                          onChange={(e) => setNewBlock((n) => ({ ...n, startDate: e.target.value }))}
                          className="w-full px-2 py-2 rounded-[9px] bg-surface border border-line text-[12px] focus:outline-none focus:border-teal"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <label className="text-[10.5px] font-semibold text-ink3 mb-0.5 block">Hasta <span className="font-normal">(op.)</span></label>
                        <input
                          type="date"
                          value={newBlock.endDate}
                          onChange={(e) => setNewBlock((n) => ({ ...n, endDate: e.target.value }))}
                          min={newBlock.startDate}
                          className="w-full px-2 py-2 rounded-[9px] bg-surface border border-line text-[12px] focus:outline-none focus:border-teal"
                        />
                      </div>
                    </div>
                    <input
                      value={newBlock.reason}
                      onChange={(e) => setNewBlock((n) => ({ ...n, reason: e.target.value }))}
                      placeholder="Motivo · ej: Feriado, Congreso, Vacaciones"
                      className="w-full px-3 py-2 rounded-[9px] bg-surface border border-line text-[12.5px] focus:outline-none focus:border-teal"
                    />
                    <div className="flex items-center gap-1.5">
                      {(
                        [
                          ["feriado", "Feriado"],
                          ["evento", "Evento"],
                          ["vacaciones", "Vacaciones"],
                        ] as const
                      ).map(([id, label]) => (
                        <button
                          key={id}
                          onClick={() => setNewBlock((n) => ({ ...n, tipo: id }))}
                          className={`flex-1 px-2 py-1.5 rounded-[8px] text-[11px] font-semibold transition border ${
                            newBlock.tipo === id
                              ? "bg-teal-dark text-white border-teal-dark"
                              : "bg-surface text-ink2 border-line hover:bg-bg"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={addBlocked}
                      disabled={createBlockedMutation.isPending}
                      className="w-full px-3 py-2 rounded-[9px] bg-teal-dark text-white text-[12px] font-semibold hover:opacity-90 transition disabled:opacity-50"
                    >
                      {createBlockedMutation.isPending ? "Bloqueando..." : "Bloquear día"}
                    </button>
                  </div>
                )}

                <ul className="px-2 pb-3">
                  {blockedQ.isLoading && (
                    <li className="px-3 py-6 text-center">
                      <div className="h-4 w-4 rounded-full border-2 border-line border-t-teal animate-spin mx-auto" />
                    </li>
                  )}
                  {!blockedQ.isLoading && blocked.length === 0 && (
                    <li className="px-3 py-6 text-center text-[12px] text-ink3">
                      Sin días bloqueados.
                    </li>
                  )}
                  {blocked.map((b) => {
                    const tipo = guessTipo(b.reason);
                    const tc = tipoChip[tipo];
                    return (
                      <li
                        key={b.id}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] hover:bg-bg transition group"
                      >
                        <div
                          className="w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0"
                          style={{ background: tc.bg, color: tc.text }}
                        >
                          {tc.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12.5px] font-semibold text-ink leading-tight">
                            {formatBlockedDate(b.start_datetime, b.end_datetime)}
                          </div>
                          <div className="text-[11px] text-ink3 truncate">{b.reason || "Sin motivo"}</div>
                        </div>
                        <button
                          onClick={() => deleteBlockedMutation.mutate(b.id)}
                          className="text-ink3 hover:text-[#A85050] opacity-0 group-hover:opacity-100 transition p-1"
                          title="Quitar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Toast */}
      {/* Conflict warning modal */}
      {conflictWarning && (
        <div className="fixed inset-0 z-50 bg-ink/30 flex items-center justify-center" onClick={() => setConflictWarning(null)}>
          <div className="bg-surface rounded-[14px] border border-line shadow-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={18} className="text-amber-500" />
              <h3 className="text-[15px] font-bold text-ink">Turnos en ese rango</h3>
            </div>
            <p className="text-[13px] text-ink2 mb-3">
              Hay <strong>{conflictWarning.count} turno{conflictWarning.count !== 1 ? "s" : ""}</strong> agendado{conflictWarning.count !== 1 ? "s" : ""} en las fechas que querés bloquear:
            </p>
            <ul className="space-y-1.5 mb-4 max-h-40 overflow-y-auto">
              {conflictWarning.appointments.map((a) => (
                <li key={a.id} className="text-[12px] text-ink2 flex items-center gap-2">
                  <Calendar size={12} className="text-ink3 shrink-0" />
                  <span>{a.scheduled_date} {a.start_time.slice(0, 5)} — {a.patient_name} ({a.service_name})</span>
                </li>
              ))}
              {conflictWarning.count > conflictWarning.appointments.length && (
                <li className="text-[11px] text-ink3">...y {conflictWarning.count - conflictWarning.appointments.length} más</li>
              )}
            </ul>
            <p className="text-[12px] text-ink3 mb-4">
              Si bloqueás este rango, los turnos seguirán existiendo. Cancelalos manualmente si corresponde.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConflictWarning(null)}
                className="px-4 py-2 rounded-[10px] text-[13px] text-ink2 hover:bg-bg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmBlock}
                className="px-4 py-2 rounded-[10px] text-[13px] font-semibold bg-teal-dark text-white hover:opacity-90 transition-opacity"
              >
                Bloquear de todas formas
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-[12px] bg-ink text-white text-[12.5px] font-semibold shadow-pop flex items-center gap-2">
          <Check size={14} className="text-teal" />
          {toast}
        </div>
      )}
    </div>
  );
}
