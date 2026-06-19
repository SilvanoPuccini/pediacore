import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  X,
  Check,
  Ban,
  Clock,
  UserX,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { useSedeStore } from "../stores/useSedeStore";
import type { Appointment, Location, PaginatedResponse } from "@/types/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const SLOT_HEIGHT = 80; // px per hour — taller for readability
const CAL_START_HOUR = 8;
const CAL_END_HOUR = 20;
const TOTAL_HOURS = CAL_END_HOUR - CAL_START_HOUR;

// ─── Service color mapping ────────────────────────────────────────────────────

type ServiceColor = { bg: string; border: string; text: string };

function getServiceColor(serviceName: string): ServiceColor {
  const name = serviceName.toLowerCase();
  if (name.includes("control sano") || name.includes("control")) {
    return { bg: "#D6F1EA", border: "#7DD3C0", text: "#2E6B5E" };
  }
  if (name.includes("online") || name.includes("telemedicina")) {
    return { bg: "#FFE2D9", border: "#F4A89A", text: "#9C4A3C" };
  }
  if (name.includes("consulta")) {
    return { bg: "#EDE4FF", border: "#C7B8E8", text: "#5B4889" };
  }
  return { bg: "#EDE4FF", border: "#C7B8E8", text: "#5B4889" };
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  CONFIRMED:  { label: "Confirmado", bg: "#D6F1EA", text: "#3E8E7C", border: "#7DD3C0", dot: "#3E8E7C" },
  PENDING:    { label: "Pendiente",  bg: "#FFF3CD", text: "#856404", border: "#FFD85E", dot: "#D4A017" },
  HOLD:       { label: "Reservado",  bg: "#EDE4FF", text: "#6B569E", border: "#C7B8E8", dot: "#7C6BC4" },
  COMPLETED:  { label: "Completado", bg: "#E0F2FE", text: "#0369A1", border: "#7DD3F4", dot: "#0284C7" },
  CANCELLED:  { label: "Cancelado",  bg: "#FFE4E1", text: "#B5604F", border: "#F4A89A", dot: "#DC2626" },
  NO_SHOW:    { label: "No asistió", bg: "#F3F4F6", text: "#6B7280", border: "#D1D5DB", dot: "#9CA3AF" },
  EXPIRED:    { label: "Expirado",   bg: "#F3F4F6", text: "#6B7280", border: "#D1D5DB", dot: "#9CA3AF" },
  RESCHEDULED:{ label: "Reagendado", bg: "#FEF3C7", text: "#92400E", border: "#FCD34D", dot: "#D97706" },
};

function StatusChip({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["EXPIRED"];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-semibold border"
      style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.border }}
    >
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

const DAY_ABBREVS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DAY_FULL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const MONTH_NAMES_LOWER = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatSpanishDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return `${DAY_FULL[d.getDay()]} ${day} de ${MONTH_NAMES_LOWER[month - 1]}, ${year}`;
}

// ─── Appointment block ────────────────────────────────────────────────────────

function AppointmentBlock({ appt, onSelect }: { appt: Appointment; onSelect: (a: Appointment) => void }) {
  const startMin = timeToMinutes(appt.start_time) - CAL_START_HOUR * 60;
  const endMin = timeToMinutes(appt.end_time) - CAL_START_HOUR * 60;
  const top = (startMin / 60) * SLOT_HEIGHT;
  const height = Math.max(((endMin - startMin) / 60) * SLOT_HEIGHT, 28);
  const color = appt.is_online
    ? getServiceColor("online")
    : getServiceColor(appt.service_name);
  const statusCfg = STATUS_CONFIG[appt.status];
  const isCancelled = appt.status === "CANCELLED" || appt.status === "EXPIRED" || appt.status === "NO_SHOW";

  return (
    <button
      type="button"
      className={cn(
        "absolute left-1.5 right-1.5 rounded-[10px] px-2.5 py-1.5 overflow-hidden text-left",
        "cursor-pointer transition-all duration-150",
        "hover:shadow-md hover:scale-[1.02] hover:z-20",
        "focus:outline-none focus:ring-2 focus:ring-teal/40 focus:ring-offset-1",
        isCancelled && "opacity-50",
      )}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        background: color.bg,
        borderLeft: `4px solid ${color.border}`,
      }}
      onClick={() => onSelect(appt)}
    >
      {/* Status dot */}
      {statusCfg && (
        <span
          className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full border border-white/60"
          style={{ background: statusCfg.dot }}
          title={statusCfg.label}
        />
      )}
      <p
        className="text-[11px] font-semibold leading-tight tabular-nums"
        style={{ color: color.text, opacity: 0.75 }}
      >
        {appt.start_time.slice(0, 5)} – {appt.end_time.slice(0, 5)}
      </p>
      <p
        className="text-[12.5px] font-bold leading-tight truncate mt-0.5"
        style={{ color: color.text }}
      >
        {appt.patient_name}
      </p>
      {height > 48 && (
        <p className="text-[10.5px] leading-tight truncate mt-0.5" style={{ color: color.text, opacity: 0.7 }}>
          {appt.service_name}
        </p>
      )}
      {height > 64 && appt.is_online && (
        <p className="text-[9.5px] font-medium mt-0.5" style={{ color: color.text, opacity: 0.6 }}>
          Online
        </p>
      )}
    </button>
  );
}

// ─── Now indicator ────────────────────────────────────────────────────────────

function NowIndicator() {
  const [top, setTop] = useState(0);

  useEffect(() => {
    function calc() {
      const now = new Date();
      const minutes = (now.getHours() - CAL_START_HOUR) * 60 + now.getMinutes();
      setTop((minutes / 60) * SLOT_HEIGHT);
    }
    calc();
    const iv = setInterval(calc, 60_000);
    return () => clearInterval(iv);
  }, []);

  const now = new Date();
  if (now.getHours() < CAL_START_HOUR || now.getHours() >= CAL_END_HOUR) return null;

  return (
    <div
      className="absolute left-0 right-0 flex items-center pointer-events-none z-10"
      style={{ top: `${top}px` }}
    >
      <div className="w-3 h-3 rounded-full bg-coral shrink-0 -ml-1.5 shadow-sm" />
      <div className="flex-1 h-[2px] bg-coral" />
    </div>
  );
}

// ─── Appointment detail modal ─────────────────────────────────────────────────

type ModalProps = {
  appt: Appointment;
  onClose: () => void;
};

function AppointmentDetailModal({ appt, onClose }: ModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [editingTime, setEditingTime] = useState(false);
  const [newDate, setNewDate] = useState(appt.scheduled_date);
  const [newTime, setNewTime] = useState(appt.start_time.slice(0, 5));

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["appointments"] });
  }, [queryClient]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // ── Mutations ──

  const confirmMut = useMutation({
    mutationFn: () => api.post(`/appointments/${appt.id}/confirm/`),
    onSuccess: () => { invalidate(); onClose(); },
  });

  const completeMut = useMutation({
    mutationFn: () => api.patch(`/appointments/${appt.id}/`, { status: "COMPLETED" }),
    onSuccess: () => { invalidate(); onClose(); },
  });

  const noShowMut = useMutation({
    mutationFn: () => api.patch(`/appointments/${appt.id}/`, { status: "NO_SHOW" }),
    onSuccess: () => { invalidate(); onClose(); },
  });

  const cancelMut = useMutation({
    mutationFn: () => api.post(`/appointments/${appt.id}/cancel/`, { reason: cancelReason }),
    onSuccess: () => { invalidate(); onClose(); },
  });

  const rescheduleMut = useMutation({
    mutationFn: () => api.patch(`/appointments/${appt.id}/`, {
      scheduled_date: newDate,
      start_time: newTime,
    }),
    onSuccess: () => { invalidate(); onClose(); },
  });

  const anyPending = confirmMut.isPending || completeMut.isPending || noShowMut.isPending || cancelMut.isPending || rescheduleMut.isPending;

  const canConfirm = appt.status === "PENDING" || appt.status === "HOLD";
  const canComplete = appt.status === "CONFIRMED";
  const canNoShow = appt.status === "CONFIRMED";
  const canCancel = ["PENDING", "HOLD", "CONFIRMED"].includes(appt.status);
  const canReschedule = ["PENDING", "HOLD", "CONFIRMED"].includes(appt.status);
  const isTerminal = ["CANCELLED", "EXPIRED", "NO_SHOW", "COMPLETED", "RESCHEDULED"].includes(appt.status);

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/25 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] bg-surface rounded-[18px] shadow-[var(--shadow-pop)] border border-line overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-line/60">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[16px] font-bold text-ink leading-tight truncate">{appt.patient_name}</h2>
              <p className="text-[13px] text-ink3 mt-0.5">{appt.service_name}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-[8px] hover:bg-bg text-ink3 hover:text-ink transition-colors shrink-0"
            >
              <X size={16} />
            </button>
          </div>
          <div className="mt-3">
            <StatusChip status={appt.status} />
          </div>
        </div>

        {/* Details */}
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-ink2 flex items-center gap-1.5"><Clock size={13} /> Hora</span>
            <span className="font-semibold text-ink tabular-nums">
              {appt.start_time.slice(0, 5)} – {appt.end_time.slice(0, 5)}
            </span>
          </div>
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-ink2 flex items-center gap-1.5"><CalendarDays size={13} /> Fecha</span>
            <span className="font-medium text-ink capitalize">
              {formatSpanishDate(appt.scheduled_date)}
            </span>
          </div>
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-ink2">Sede</span>
            <span className="font-medium text-ink">
              {appt.location_name ?? (appt.is_online ? "Online" : "—")}
            </span>
          </div>
        </div>

        {/* ── Reschedule inline form ── */}
        {editingTime && canReschedule && (
          <div className="px-5 pb-4 border-t border-line/60 pt-4">
            <p className="text-[12.5px] font-semibold text-ink mb-3">Reagendar turno</p>
            <div className="flex gap-2">
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="flex-1 px-3 py-2 rounded-[8px] border border-line text-[13px] text-ink bg-bg focus:outline-none focus:ring-2 focus:ring-teal/30"
              />
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-[110px] px-3 py-2 rounded-[8px] border border-line text-[13px] text-ink bg-bg focus:outline-none focus:ring-2 focus:ring-teal/30"
              />
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => rescheduleMut.mutate()}
                disabled={anyPending}
                className="flex-1 py-2 rounded-[8px] bg-teal-dark text-white text-[12.5px] font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {rescheduleMut.isPending ? "Guardando..." : "Guardar cambios"}
              </button>
              <button
                onClick={() => setEditingTime(false)}
                className="px-4 py-2 rounded-[8px] border border-line text-[12.5px] font-medium text-ink2 hover:bg-bg transition-colors"
              >
                Cancelar
              </button>
            </div>
            {rescheduleMut.isError && (
              <p className="text-[11.5px] text-red-600 mt-2 flex items-center gap-1">
                <AlertCircle size={12} /> No se pudo reagendar. Verificá que el horario esté disponible.
              </p>
            )}
          </div>
        )}

        {/* ── Cancel confirmation ── */}
        {showCancel && canCancel && (
          <div className="px-5 pb-4 border-t border-line/60 pt-4">
            <p className="text-[12.5px] font-semibold text-ink mb-2">Cancelar turno</p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Motivo de cancelación (opcional)"
              rows={2}
              className="w-full px-3 py-2 rounded-[8px] border border-line text-[13px] text-ink bg-bg resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => cancelMut.mutate()}
                disabled={anyPending}
                className="flex-1 py-2 rounded-[8px] bg-red-600 text-white text-[12.5px] font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {cancelMut.isPending ? "Cancelando..." : "Confirmar cancelación"}
              </button>
              <button
                onClick={() => setShowCancel(false)}
                className="px-4 py-2 rounded-[8px] border border-line text-[12.5px] font-medium text-ink2 hover:bg-bg transition-colors"
              >
                Volver
              </button>
            </div>
          </div>
        )}

        {/* ── Action buttons ── */}
        {!isTerminal && !editingTime && !showCancel && (
          <div className="px-5 pb-4 border-t border-line/60 pt-4">
            <div className="grid grid-cols-2 gap-2">
              {canConfirm && (
                <button
                  onClick={() => confirmMut.mutate()}
                  disabled={anyPending}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-[10px] bg-teal-dark text-white text-[12.5px] font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  <Check size={14} />
                  {confirmMut.isPending ? "..." : "Confirmar"}
                </button>
              )}
              {canComplete && (
                <button
                  onClick={() => completeMut.mutate()}
                  disabled={anyPending}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-[10px] bg-sky-600 text-white text-[12.5px] font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  <CheckCircle2 size={14} />
                  {completeMut.isPending ? "..." : "Completar"}
                </button>
              )}
              {canNoShow && (
                <button
                  onClick={() => noShowMut.mutate()}
                  disabled={anyPending}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-[10px] border border-line text-[12.5px] font-semibold text-ink2 hover:bg-bg disabled:opacity-50 transition-colors"
                >
                  <UserX size={14} />
                  {noShowMut.isPending ? "..." : "No asistió"}
                </button>
              )}
              {canReschedule && (
                <button
                  onClick={() => { setEditingTime(true); setShowCancel(false); }}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-[10px] border border-line text-[12.5px] font-semibold text-ink2 hover:bg-bg transition-colors"
                >
                  <CalendarDays size={14} />
                  Reagendar
                </button>
              )}
              {canCancel && (
                <button
                  onClick={() => { setShowCancel(true); setEditingTime(false); }}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-[10px] border border-red-200 text-[12.5px] font-semibold text-red-600 hover:bg-red-50 transition-colors col-span-2"
                >
                  <Ban size={14} />
                  Cancelar turno
                </button>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 pb-5 flex items-center gap-2">
          <button
            onClick={() => {
              navigate(`/dashboard/pacientes/${appt.patient}`);
              onClose();
            }}
            className="flex-1 py-2.5 rounded-[10px] border border-line text-[13px] font-medium text-ink2 hover:bg-bg transition-colors"
          >
            Ver ficha
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-[10px] border border-line text-[13px] font-medium text-ink2 hover:bg-bg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Calendar page ────────────────────────────────────────────────────────────

export default function Calendar() {
  const sedeId = useSedeStore((s) => s.sedeId);
  const [monday, setMonday] = useState<Date>(() => getMondayOfWeek(new Date()));
  const [activeSede, setActiveSede] = useState<number | null>(sedeId);
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to business hours on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = SLOT_HEIGHT * 1;
    }
  }, []);

  useEffect(() => {
    setActiveSede(sedeId);
  }, [sedeId]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const dateFrom = toISO(monday);
  const dateTo = toISO(addDays(monday, 6));

  const locationsQ = useQuery<Location[]>({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Location>>("/locations/");
      return data.results;
    },
    staleTime: 1000 * 60 * 60,
  });

  const apptsQ = useQuery<Appointment[]>({
    queryKey: ["appointments", "week", dateFrom, dateTo, activeSede],
    queryFn: async () => {
      const params = new URLSearchParams({
        date_from: dateFrom,
        date_to: dateTo,
        page_size: "200",
      });
      if (activeSede) params.set("location_id", String(activeSede));
      const { data } = await api.get<PaginatedResponse<Appointment>>(
        `/appointments/?${params}`
      );
      return data.results;
    },
    staleTime: 1000 * 60 * 2,
  });

  const appointments = apptsQ.data ?? [];
  const locations = locationsQ.data ?? [];
  const today = new Date();
  const todayISO = toISO(today);

  // Group appointments by date
  const apptsByDate = new Map<string, Appointment[]>();
  for (const appt of appointments) {
    const key = appt.scheduled_date;
    if (!apptsByDate.has(key)) apptsByDate.set(key, []);
    apptsByDate.get(key)!.push(appt);
  }

  // Month/year title
  const startMonth = monday.getMonth();
  const endMonth = addDays(monday, 6).getMonth();
  const year = monday.getFullYear();
  const monthTitle =
    startMonth === endMonth
      ? `${MONTH_NAMES[startMonth]} ${year}`
      : `${MONTH_NAMES[startMonth]} – ${MONTH_NAMES[endMonth]} ${year}`;

  const weekNum = getWeekNumber(monday);
  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => CAL_START_HOUR + i);

  const legendItems = [
    { label: "Control sano", color: "#7DD3C0", bg: "#D6F1EA" },
    { label: "Consulta", color: "#C7B8E8", bg: "#EDE4FF" },
    { label: "Online", color: "#F4A89A", bg: "#FFE2D9" },
  ];

  const statusLegend = [
    { label: "Confirmado", dot: "#3E8E7C" },
    { label: "Pendiente", dot: "#D4A017" },
    { label: "Completado", dot: "#0284C7" },
  ];

  return (
    <div className="flex flex-col h-full max-w-[1400px] space-y-0">
      {/* ── Header bar ── */}
      <div className="bg-surface border border-line rounded-[14px] shadow-card px-5 py-4 flex items-center gap-4 flex-wrap mb-4">
        {/* Nav */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMonday((m) => addDays(m, -7))}
            className="w-9 h-9 rounded-[8px] flex items-center justify-center hover:bg-bg border border-line transition-colors"
          >
            <ChevronLeft size={16} className="text-ink2" />
          </button>
          <button
            onClick={() => setMonday(getMondayOfWeek(new Date()))}
            className="px-3.5 py-2 rounded-[8px] text-[12.5px] font-semibold border border-line hover:bg-bg transition-colors text-ink2"
          >
            Hoy
          </button>
          <button
            onClick={() => setMonday((m) => addDays(m, 7))}
            className="w-9 h-9 rounded-[8px] flex items-center justify-center hover:bg-bg border border-line transition-colors"
          >
            <ChevronRight size={16} className="text-ink2" />
          </button>
        </div>

        {/* Title */}
        <div className="flex items-center gap-2">
          <span className="text-[20px] font-bold text-ink tracking-tight">{monthTitle}</span>
          <span className="text-[12.5px] text-ink3 font-medium">Semana {weekNum}</span>
        </div>

        {/* Locations */}
        {locations.length > 0 && (
          <div className="inline-flex p-1 rounded-[10px] bg-bg ml-auto">
            <button
              onClick={() => setActiveSede(null)}
              className={cn(
                "px-3.5 py-1.5 rounded-[8px] text-[12px] font-semibold transition-all",
                activeSede === null
                  ? "bg-surface text-teal-dark shadow-card"
                  : "text-ink2 hover:text-ink"
              )}
            >
              Todas
            </button>
            {locations.map((loc) => (
              <button
                key={loc.id}
                onClick={() => setActiveSede(loc.id)}
                className={cn(
                  "px-3.5 py-1.5 rounded-[8px] text-[12px] font-semibold transition-all",
                  activeSede === loc.id
                    ? "bg-surface text-teal-dark shadow-card"
                    : "text-ink2 hover:text-ink"
                )}
              >
                {loc.name}
              </button>
            ))}
          </div>
        )}

        {/* Appointment count badge */}
        {appointments.length > 0 && (
          <span className="text-[12px] font-medium text-ink3 bg-bg px-2.5 py-1 rounded-full border border-line">
            {appointments.length} turno{appointments.length !== 1 ? "s" : ""}
          </span>
        )}

        {/* New appointment */}
        <button
          onClick={() => window.open("/reservar", "_blank")}
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] bg-teal-dark text-white text-[12.5px] font-semibold hover:opacity-90 transition-opacity",
            locations.length === 0 && "ml-auto"
          )}>
          <Plus size={14} />
          Nuevo turno
        </button>
      </div>

      {/* ── Loading ── */}
      {apptsQ.isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 rounded-full border-2 border-line border-t-teal animate-spin" />
        </div>
      )}

      {/* ── Weekly grid ── */}
      {!apptsQ.isLoading && (
        <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] overflow-hidden flex flex-col">
          {/* Day headers */}
          <div className="grid border-b border-line" style={{ gridTemplateColumns: "64px repeat(7, 1fr)" }}>
            <div className="border-r border-line" />
            {weekDays.map((day, i) => {
              const iso = toISO(day);
              const isToday = iso === todayISO;
              const isWeekend = i >= 5;
              const dayCount = (apptsByDate.get(iso) ?? []).length;
              return (
                <div
                  key={iso}
                  className={cn(
                    "py-3 text-center border-r border-line last:border-r-0",
                    isWeekend && "bg-bg/50"
                  )}
                >
                  <p className="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-ink3">
                    {DAY_ABBREVS[day.getDay()]}
                  </p>
                  <div className="mx-auto mt-1 flex items-center justify-center">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-[18px] font-bold tracking-tight transition-colors",
                        isToday ? "bg-teal text-white shadow-sm" : "text-ink"
                      )}
                    >
                      {day.getDate()}
                    </div>
                  </div>
                  {dayCount > 0 && (
                    <p className="text-[10px] text-ink3 mt-1 font-medium">
                      {dayCount} turno{dayCount !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Scrollable grid body */}
          <div
            ref={scrollRef}
            className="overflow-y-auto"
            style={{ maxHeight: `${SLOT_HEIGHT * 8}px` }}
          >
            <div className="grid" style={{ gridTemplateColumns: "64px repeat(7, 1fr)" }}>
              {/* Hour labels */}
              <div className="border-r border-line">
                {hours.map((h) => (
                  <div
                    key={h}
                    className="flex items-start justify-end pr-3"
                    style={{ height: `${SLOT_HEIGHT}px` }}
                  >
                    <span className="text-[11px] font-medium text-ink3 -translate-y-2 tabular-nums">
                      {String(h).padStart(2, "0")}:00
                    </span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekDays.map((day, i) => {
                const iso = toISO(day);
                const isToday = iso === todayISO;
                const isWeekend = i >= 5;
                const dayAppts = apptsByDate.get(iso) ?? [];

                return (
                  <div
                    key={iso}
                    className={cn(
                      "relative border-r border-line last:border-r-0",
                      isWeekend && "bg-bg/50",
                      isToday && "bg-teal/[0.03]",
                    )}
                    style={{ height: `${SLOT_HEIGHT * TOTAL_HOURS}px` }}
                  >
                    {/* Hour grid lines */}
                    {hours.map((h) => (
                      <div
                        key={h}
                        className="absolute left-0 right-0 border-t border-line/50"
                        style={{ top: `${(h - CAL_START_HOUR) * SLOT_HEIGHT}px` }}
                      />
                    ))}
                    {/* Half-hour dashed lines */}
                    {hours.map((h) => (
                      <div
                        key={`half-${h}`}
                        className="absolute left-0 right-0 border-t border-dashed border-line/25"
                        style={{ top: `${(h - CAL_START_HOUR) * SLOT_HEIGHT + SLOT_HEIGHT / 2}px` }}
                      />
                    ))}

                    {isToday && <NowIndicator />}

                    {dayAppts.map((appt) => (
                      <AppointmentBlock key={appt.id} appt={appt} onSelect={setSelectedApt} />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Legend ── */}
      <div className="flex items-center gap-5 pt-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-[11.5px] text-ink3">
          <CalendarDays size={13} />
          <span>Tipos:</span>
        </div>
        {legendItems.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5 text-[11.5px] text-ink2">
            <span
              className="w-3.5 h-3.5 rounded-[4px]"
              style={{ background: item.bg, borderLeft: `3px solid ${item.color}` }}
            />
            {item.label}
          </div>
        ))}
        <span className="w-px h-3.5 bg-line" />
        <div className="flex items-center gap-1.5 text-[11.5px] text-ink3">
          <span>Estado:</span>
        </div>
        {statusLegend.map((s) => (
          <div key={s.label} className="flex items-center gap-1 text-[11.5px] text-ink2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.dot }} />
            {s.label}
          </div>
        ))}
        <span className="w-px h-3.5 bg-line" />
        <div className="flex items-center gap-1.5 text-[11.5px] text-ink2">
          <span className="inline-flex items-center gap-0.5">
            <span className="w-2.5 h-2.5 rounded-full bg-coral" />
            <span className="w-4 h-[2px] bg-coral" />
          </span>
          Ahora
        </div>
      </div>

      {/* ── Detail modal ── */}
      {selectedApt && (
        <AppointmentDetailModal
          appt={selectedApt}
          onClose={() => setSelectedApt(null)}
        />
      )}
    </div>
  );
}
