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
const SNAP_MINUTES = 15; // drag-and-drop snap interval

// ─── View mode type ───────────────────────────────────────────────────────────

type CalendarView = "day" | "week" | "month";

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
  CONFIRMED:   { label: "Confirmado",  bg: "#D6F1EA", text: "#3E8E7C", border: "#7DD3C0", dot: "#3E8E7C" },
  CHECKED_IN:  { label: "En sala",     bg: "#FEF3C7", text: "#9C7423", border: "#F5D4A0", dot: "#D4A017" },
  IN_PROGRESS: { label: "En consulta", bg: "#D1FAE5", text: "#065F46", border: "#6EE7B7", dot: "#059669" },
  PENDING:     { label: "Pendiente",   bg: "#FFF3CD", text: "#856404", border: "#FFD85E", dot: "#D4A017" },
  HOLD:        { label: "Reservado",   bg: "#EDE4FF", text: "#6B569E", border: "#C7B8E8", dot: "#7C6BC4" },
  COMPLETED:   { label: "Completado",  bg: "#E0F2FE", text: "#0369A1", border: "#7DD3F4", dot: "#0284C7" },
  CANCELLED:   { label: "Cancelado",   bg: "#FFE4E1", text: "#B5604F", border: "#F4A89A", dot: "#DC2626" },
  NO_SHOW:     { label: "No asistió",  bg: "#F3F4F6", text: "#6B7280", border: "#D1D5DB", dot: "#9CA3AF" },
  EXPIRED:     { label: "Expirado",    bg: "#F3F4F6", text: "#6B7280", border: "#D1D5DB", dot: "#9CA3AF" },
  RESCHEDULED: { label: "Reagendado",  bg: "#FEF3C7", text: "#92400E", border: "#FCD34D", dot: "#D97706" },
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

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
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

function getFirstDayOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getLastDayOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
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

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatSpanishDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return `${DAY_FULL[d.getDay()]} ${day} de ${MONTH_NAMES_LOWER[month - 1]}, ${year}`;
}

// ─── Toast / flash helper ─────────────────────────────────────────────────────

type ToastState = { message: string; type: "success" | "error" } | null;

// ─── Drag-and-drop helpers ────────────────────────────────────────────────────

// Calculates new start_time from Y offset within the grid (snapped to SNAP_MINUTES)
function yOffsetToTime(offsetY: number): string {
  const totalMinutes = CAL_START_HOUR * 60 + (offsetY / SLOT_HEIGHT) * 60;
  const snapped = Math.round(totalMinutes / SNAP_MINUTES) * SNAP_MINUTES;
  const clamped = Math.min(
    Math.max(snapped, CAL_START_HOUR * 60),
    CAL_END_HOUR * 60 - 15
  );
  return minutesToTime(clamped);
}

// Calculates scheduled_date from X column index in week view (0-indexed from monday)
function colIndexToDate(monday: Date, colIndex: number): string {
  return toISO(addDays(monday, colIndex));
}

// ─── Appointment block (draggable) ────────────────────────────────────────────

type DragInfo = {
  apptId: number;
  originalDate: string;
  originalTime: string;
  durationMinutes: number;
};

type AppointmentBlockProps = {
  appt: Appointment;
  onSelect: (a: Appointment) => void;
  draggable?: boolean;
  onDragStartCb?: (info: DragInfo) => void;
  draggingId?: number | null;
  fullWidth?: boolean; // for day view
};

function AppointmentBlock({
  appt,
  onSelect,
  draggable: isDraggable = false,
  onDragStartCb,
  draggingId,
  fullWidth = false,
}: AppointmentBlockProps) {
  const startMin = timeToMinutes(appt.start_time) - CAL_START_HOUR * 60;
  const endMin = timeToMinutes(appt.end_time) - CAL_START_HOUR * 60;
  const top = (startMin / 60) * SLOT_HEIGHT;
  const height = Math.max(((endMin - startMin) / 60) * SLOT_HEIGHT, 28);
  const color = appt.is_online
    ? getServiceColor("online")
    : getServiceColor(appt.service_name);
  const statusCfg = STATUS_CONFIG[appt.status];
  const isCancelled = appt.status === "CANCELLED" || appt.status === "EXPIRED" || appt.status === "NO_SHOW";
  const isDragging = draggingId === appt.id;
  const canDrag = isDraggable && ["PENDING", "HOLD", "CONFIRMED", "CHECKED_IN"].includes(appt.status);

  function handleDragStart(e: React.DragEvent<HTMLButtonElement>) {
    const durationMinutes =
      timeToMinutes(appt.end_time) - timeToMinutes(appt.start_time);
    const info: DragInfo = {
      apptId: appt.id,
      originalDate: appt.scheduled_date,
      originalTime: appt.start_time.slice(0, 5),
      durationMinutes,
    };
    e.dataTransfer.setData("application/json", JSON.stringify(info));
    e.dataTransfer.effectAllowed = "move";
    onDragStartCb?.(info);
  }

  return (
    <button
      type="button"
      draggable={canDrag}
      onDragStart={canDrag ? handleDragStart : undefined}
      className={cn(
        "absolute rounded-[10px] px-2.5 py-1.5 overflow-hidden text-left",
        "cursor-pointer transition-all duration-150",
        "hover:shadow-md hover:scale-[1.02] hover:z-20",
        "focus:outline-none focus:ring-2 focus:ring-teal/40 focus:ring-offset-1",
        isCancelled && "opacity-50",
        isDragging && "opacity-40 scale-95 cursor-grabbing",
        canDrag && !isDragging && "cursor-grab",
        fullWidth ? "left-2 right-2" : "left-1.5 right-1.5",
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
      {height > 64 && fullWidth && appt.location_name && (
        <p className="text-[9.5px] font-medium mt-0.5" style={{ color: color.text, opacity: 0.6 }}>
          {appt.is_online ? "Online" : appt.location_name}
        </p>
      )}
      {height > 64 && !fullWidth && appt.is_online && (
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

// ─── Drop target indicator ────────────────────────────────────────────────────

type DropTargetProps = {
  top: number;
  height: number;
};

function DropTargetIndicator({ top, height }: DropTargetProps) {
  return (
    <div
      className="absolute left-1.5 right-1.5 rounded-[10px] border-2 border-dashed border-teal bg-teal/10 pointer-events-none z-30"
      style={{ top: `${top}px`, height: `${height}px` }}
    />
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
  const canComplete = ["CONFIRMED", "CHECKED_IN", "IN_PROGRESS"].includes(appt.status);
  const canNoShow = ["CONFIRMED", "CHECKED_IN"].includes(appt.status);
  const canCancel = ["PENDING", "HOLD", "CONFIRMED", "CHECKED_IN"].includes(appt.status);
  const canReschedule = ["PENDING", "HOLD", "CONFIRMED", "CHECKED_IN"].includes(appt.status);
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

// ─── Day view ─────────────────────────────────────────────────────────────────

type DayViewProps = {
  date: Date;
  appointments: Appointment[];
  onSelect: (a: Appointment) => void;
  todayISO: string;
  onReschedule: (apptId: number, newDate: string, newTime: string) => void;
  onToast: (msg: string, type: "success" | "error") => void;
};

function DayView({ date, appointments, onSelect, todayISO, onReschedule, onToast }: DayViewProps) {
  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => CAL_START_HOUR + i);
  const iso = toISO(date);
  const isToday = iso === todayISO;
  const dayAppts = appointments.filter((a) => a.scheduled_date === iso);

  // Drag state
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [draggingDuration, setDraggingDuration] = useState<number>(30);
  const [dropTop, setDropTop] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  function getGridY(e: React.DragEvent): number {
    if (!gridRef.current) return 0;
    const rect = gridRef.current.getBoundingClientRect();
    return e.clientY - rect.top;
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const y = getGridY(e);
    const totalMin = CAL_START_HOUR * 60 + (y / SLOT_HEIGHT) * 60;
    const snapped = Math.round(totalMin / SNAP_MINUTES) * SNAP_MINUTES;
    const clamped = Math.min(Math.max(snapped, CAL_START_HOUR * 60), CAL_END_HOUR * 60 - 15);
    const top = ((clamped - CAL_START_HOUR * 60) / 60) * SLOT_HEIGHT;
    setDropTop(top);
  }

  function handleDragLeave() {
    setDropTop(null);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDropTop(null);
    setDraggingId(null);

    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;

    let info: DragInfo;
    try {
      info = JSON.parse(raw) as DragInfo;
    } catch {
      return;
    }

    const y = getGridY(e);
    const newTime = yOffsetToTime(y);
    const newDate = iso;

    if (newTime === info.originalTime && newDate === info.originalDate) return;

    onReschedule(info.apptId, newDate, newTime);
    onToast(`Turno movido a ${newTime}`, "success");
  }

  return (
    <div
      className="relative border-r border-line last:border-r-0"
      style={{ height: `${SLOT_HEIGHT * TOTAL_HOURS}px` }}
      ref={gridRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
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

      {dropTop !== null && draggingId !== null && (
        <DropTargetIndicator
          top={dropTop}
          height={(draggingDuration / 60) * SLOT_HEIGHT}
        />
      )}

      {dayAppts.map((appt) => (
        <AppointmentBlock
          key={appt.id}
          appt={appt}
          onSelect={onSelect}
          draggable
          onDragStartCb={(info) => {
            setDraggingId(info.apptId);
            setDraggingDuration(info.durationMinutes);
          }}
          draggingId={draggingId}
          fullWidth
        />
      ))}
    </div>
  );
}

// ─── Week view columns ────────────────────────────────────────────────────────

type WeekViewProps = {
  weekDays: Date[];
  apptsByDate: Map<string, Appointment[]>;
  onSelect: (a: Appointment) => void;
  todayISO: string;
  monday: Date;
  onReschedule: (apptId: number, newDate: string, newTime: string) => void;
  onToast: (msg: string, type: "success" | "error") => void;
};

type ColumnDropState = {
  colIndex: number;
  top: number;
};

function WeekViewColumns({
  weekDays,
  apptsByDate,
  onSelect,
  todayISO,
  monday,
  onReschedule,
  onToast,
}: WeekViewProps) {
  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => CAL_START_HOUR + i);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [draggingDuration, setDraggingDuration] = useState<number>(30);
  const [dropState, setDropState] = useState<ColumnDropState | null>(null);
  const colRefs = useRef<(HTMLDivElement | null)[]>([]);

  function getGridY(e: React.DragEvent, colIndex: number): number {
    const ref = colRefs.current[colIndex];
    if (!ref) return 0;
    const rect = ref.getBoundingClientRect();
    return e.clientY - rect.top;
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>, colIndex: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const y = getGridY(e, colIndex);
    const totalMin = CAL_START_HOUR * 60 + (y / SLOT_HEIGHT) * 60;
    const snapped = Math.round(totalMin / SNAP_MINUTES) * SNAP_MINUTES;
    const clamped = Math.min(Math.max(snapped, CAL_START_HOUR * 60), CAL_END_HOUR * 60 - 15);
    const top = ((clamped - CAL_START_HOUR * 60) / 60) * SLOT_HEIGHT;
    setDropState({ colIndex, top });
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>, colIndex: number) {
    e.preventDefault();
    setDropState(null);
    setDraggingId(null);

    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;

    let info: DragInfo;
    try {
      info = JSON.parse(raw) as DragInfo;
    } catch {
      return;
    }

    const y = getGridY(e, colIndex);
    const newTime = yOffsetToTime(y);
    const newDate = colIndexToDate(monday, colIndex);

    if (newTime === info.originalTime && newDate === info.originalDate) return;

    onReschedule(info.apptId, newDate, newTime);
    onToast(`Turno movido a ${newTime}`, "success");
  }

  return (
    <>
      {weekDays.map((day, i) => {
        const iso = toISO(day);
        const isToday = iso === todayISO;
        const isWeekend = i >= 5;
        const dayAppts = apptsByDate.get(iso) ?? [];

        return (
          <div
            key={iso}
            ref={(el) => { colRefs.current[i] = el; }}
            className={cn(
              "relative border-r border-line last:border-r-0",
              isWeekend && "bg-bg/50",
              isToday && "bg-teal/[0.03]",
            )}
            style={{ height: `${SLOT_HEIGHT * TOTAL_HOURS}px` }}
            onDragOver={(e) => handleDragOver(e, i)}
            onDragLeave={() => setDropState(null)}
            onDrop={(e) => handleDrop(e, i)}
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

            {dropState?.colIndex === i && draggingId !== null && (
              <DropTargetIndicator
                top={dropState.top}
                height={(draggingDuration / 60) * SLOT_HEIGHT}
              />
            )}

            {dayAppts.map((appt) => (
              <AppointmentBlock
                key={appt.id}
                appt={appt}
                onSelect={onSelect}
                draggable
                onDragStartCb={(info) => {
                  setDraggingId(info.apptId);
                  setDraggingDuration(info.durationMinutes);
                }}
                draggingId={draggingId}
              />
            ))}
          </div>
        );
      })}
    </>
  );
}

// ─── Month view ───────────────────────────────────────────────────────────────

type MonthViewProps = {
  currentMonth: Date;
  appointments: Appointment[];
  todayISO: string;
  onSelectDay: (date: Date) => void;
};

function MonthView({ currentMonth, appointments, todayISO, onSelectDay }: MonthViewProps) {
  const firstDay = getFirstDayOfMonth(currentMonth);

  // Build a 6-week grid starting from the Monday before/on the first day
  const gridStart = getMondayOfWeek(firstDay);

  // Build 6 weeks = 42 cells
  const cells: Date[] = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  // Group appointments by date
  const apptsByDate = new Map<string, Appointment[]>();
  for (const appt of appointments) {
    const key = appt.scheduled_date;
    if (!apptsByDate.has(key)) apptsByDate.set(key, []);
    apptsByDate.get(key)!.push(appt);
  }

  const currentMonthNum = currentMonth.getMonth();
  const currentYear = currentMonth.getFullYear();

  return (
    <div className="flex flex-col h-full">
      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-line">
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
          <div
            key={d}
            className="py-2 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-ink3"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 flex-1">
        {cells.map((cell, i) => {
          const iso = toISO(cell);
          const isToday = iso === todayISO;
          const isCurrentMonth = cell.getMonth() === currentMonthNum && cell.getFullYear() === currentYear;
          const isWeekend = i % 7 >= 5;
          const cellAppts = apptsByDate.get(iso) ?? [];

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelectDay(cell)}
              className={cn(
                "min-h-[100px] p-2 border-b border-r border-line last:border-r-0 text-left",
                "transition-colors hover:bg-teal/5 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:ring-inset",
                isWeekend && "bg-bg/40",
                !isCurrentMonth && "opacity-40",
              )}
            >
              {/* Day number */}
              <div className="flex items-center justify-start mb-1">
                <span
                  className={cn(
                    "w-7 h-7 flex items-center justify-center rounded-full text-[13px] font-bold",
                    isToday && "bg-teal text-white",
                    !isToday && "text-ink"
                  )}
                >
                  {cell.getDate()}
                </span>
              </div>

              {/* Appointment pills */}
              {cellAppts.length > 0 && (
                <div className="space-y-0.5">
                  {cellAppts.slice(0, 2).map((appt) => {
                    const color = appt.is_online
                      ? getServiceColor("online")
                      : getServiceColor(appt.service_name);
                    return (
                      <div
                        key={appt.id}
                        className="rounded-[4px] px-1.5 py-0.5 text-[10px] font-semibold truncate"
                        style={{ background: color.bg, color: color.text }}
                      >
                        {appt.start_time.slice(0, 5)} {appt.patient_name}
                      </div>
                    );
                  })}
                  {cellAppts.length > 2 && (
                    <p className="text-[10px] text-ink3 font-medium px-1">
                      +{cellAppts.length - 2} más
                    </p>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Toast component ──────────────────────────────────────────────────────────

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-[60]",
        "flex items-center gap-2 px-4 py-2.5 rounded-[10px] shadow-[var(--shadow-pop)]",
        "text-[13px] font-semibold animate-in fade-in slide-in-from-bottom-2 duration-200",
        toast.type === "success" && "bg-teal-dark text-white",
        toast.type === "error" && "bg-red-600 text-white",
      )}
    >
      {toast.type === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
      {toast.message}
    </div>
  );
}

// ─── Calendar page ────────────────────────────────────────────────────────────

export default function Calendar() {
  const sedeId = useSedeStore((s) => s.sedeId);
  const queryClient = useQueryClient();

  // View state
  const [viewMode, setViewMode] = useState<CalendarView>("week");
  const [monday, setMonday] = useState<Date>(() => getMondayOfWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());

  // UI state
  const [activeSede, setActiveSede] = useState<number | null>(sedeId);
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to business hours on mount / view change
  useEffect(() => {
    if (scrollRef.current && (viewMode === "week" || viewMode === "day")) {
      scrollRef.current.scrollTop = SLOT_HEIGHT * 1;
    }
  }, [viewMode]);

  useEffect(() => {
    setActiveSede(sedeId);
  }, [sedeId]);

  // Derived date ranges per view
  const dateFrom = (() => {
    if (viewMode === "day") return toISO(selectedDate);
    if (viewMode === "week") return toISO(monday);
    return toISO(getFirstDayOfMonth(currentMonth));
  })();

  const dateTo = (() => {
    if (viewMode === "day") return toISO(selectedDate);
    if (viewMode === "week") return toISO(addDays(monday, 6));
    return toISO(getLastDayOfMonth(currentMonth));
  })();

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  const locationsQ = useQuery<Location[]>({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Location>>("/locations/");
      return data.results;
    },
    staleTime: 1000 * 60 * 60,
  });

  const apptsQ = useQuery<Appointment[]>({
    queryKey: ["appointments", viewMode, dateFrom, dateTo, activeSede],
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

  // Optimistic reschedule mutation (used by drag-and-drop)
  const rescheduleDragMut = useMutation({
    mutationFn: ({ apptId, newDate, newTime }: { apptId: number; newDate: string; newTime: string }) =>
      api.patch(`/appointments/${apptId}/`, {
        scheduled_date: newDate,
        start_time: newTime,
      }),
    onMutate: async ({ apptId, newDate, newTime }) => {
      // Cancel in-flight queries
      await queryClient.cancelQueries({ queryKey: ["appointments"] });

      // Snapshot previous data
      const queryKey = ["appointments", viewMode, dateFrom, dateTo, activeSede];
      const previous = queryClient.getQueryData<Appointment[]>(queryKey);

      // Optimistically update
      if (previous) {
        queryClient.setQueryData<Appointment[]>(queryKey, (old) =>
          (old ?? []).map((a) =>
            a.id === apptId
              ? { ...a, scheduled_date: newDate, start_time: `${newTime}:00` }
              : a
          )
        );
      }

      return { previous, queryKey };
    },
    onError: (_err, _vars, context) => {
      // Revert optimistic update
      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
      setToast({ message: "No se pudo mover el turno. Intentá de nuevo.", type: "error" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });

  function handleDragReschedule(apptId: number, newDate: string, newTime: string) {
    rescheduleDragMut.mutate({ apptId, newDate, newTime });
  }

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
  }

  const appointments = apptsQ.data ?? [];
  const locations = locationsQ.data ?? [];
  const today = new Date();
  const todayISO = toISO(today);

  // Group appointments by date (for week view)
  const apptsByDate = new Map<string, Appointment[]>();
  for (const appt of appointments) {
    const key = appt.scheduled_date;
    if (!apptsByDate.has(key)) apptsByDate.set(key, []);
    apptsByDate.get(key)!.push(appt);
  }

  // Header title
  const headerTitle = (() => {
    if (viewMode === "day") {
      const d = selectedDate;
      return `${DAY_FULL[d.getDay()]} ${d.getDate()} de ${MONTH_NAMES_LOWER[d.getMonth()]} ${d.getFullYear()}`;
    }
    if (viewMode === "week") {
      const startMonth = monday.getMonth();
      const endMonth = addDays(monday, 6).getMonth();
      const year = monday.getFullYear();
      return startMonth === endMonth
        ? `${MONTH_NAMES[startMonth]} ${year}`
        : `${MONTH_NAMES[startMonth]} – ${MONTH_NAMES[endMonth]} ${year}`;
    }
    return `${MONTH_NAMES[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;
  })();

  const weekNum = getWeekNumber(monday);
  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => CAL_START_HOUR + i);

  // Navigation handlers
  function goToPrev() {
    if (viewMode === "day") setSelectedDate((d) => addDays(d, -1));
    else if (viewMode === "week") setMonday((m) => addDays(m, -7));
    else setCurrentMonth((m) => addMonths(m, -1));
  }

  function goToNext() {
    if (viewMode === "day") setSelectedDate((d) => addDays(d, 1));
    else if (viewMode === "week") setMonday((m) => addDays(m, 7));
    else setCurrentMonth((m) => addMonths(m, 1));
  }

  function goToToday() {
    const now = new Date();
    setSelectedDate(now);
    setMonday(getMondayOfWeek(now));
    setCurrentMonth(now);
  }

  function switchToDay(date: Date) {
    setSelectedDate(date);
    setViewMode("day");
  }

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
            onClick={goToPrev}
            className="w-9 h-9 rounded-[8px] flex items-center justify-center hover:bg-bg border border-line transition-colors"
          >
            <ChevronLeft size={16} className="text-ink2" />
          </button>
          <button
            onClick={goToToday}
            className="px-3.5 py-2 rounded-[8px] text-[12.5px] font-semibold border border-line hover:bg-bg transition-colors text-ink2"
          >
            Hoy
          </button>
          <button
            onClick={goToNext}
            className="w-9 h-9 rounded-[8px] flex items-center justify-center hover:bg-bg border border-line transition-colors"
          >
            <ChevronRight size={16} className="text-ink2" />
          </button>
        </div>

        {/* Title */}
        <div className="flex items-center gap-2">
          <span className="text-[20px] font-bold text-ink tracking-tight capitalize">{headerTitle}</span>
          {viewMode === "week" && (
            <span className="text-[12.5px] text-ink3 font-medium">Semana {weekNum}</span>
          )}
        </div>

        {/* View mode toggle */}
        <div className="inline-flex p-1 rounded-[10px] bg-bg">
          {(["day", "week", "month"] as CalendarView[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                "px-3.5 py-1.5 rounded-[8px] text-[12px] font-semibold transition-all",
                viewMode === mode
                  ? "bg-surface text-teal-dark shadow-card"
                  : "text-ink2 hover:text-ink"
              )}
            >
              {mode === "day" ? "Día" : mode === "week" ? "Semana" : "Mes"}
            </button>
          ))}
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

      {/* ── Month view ── */}
      {!apptsQ.isLoading && viewMode === "month" && (
        <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] overflow-hidden flex flex-col">
          <MonthView
            currentMonth={currentMonth}
            appointments={appointments}
            todayISO={todayISO}
            onSelectDay={(date) => switchToDay(date)}
          />
        </div>
      )}

      {/* ── Day view ── */}
      {!apptsQ.isLoading && viewMode === "day" && (
        <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] overflow-hidden flex flex-col">
          {/* Day header */}
          <div className="grid border-b border-line" style={{ gridTemplateColumns: "64px 1fr" }}>
            <div className="border-r border-line" />
            <div className="py-3 text-center">
              <p className="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-ink3">
                {DAY_ABBREVS[selectedDate.getDay()]}
              </p>
              <div className="mx-auto mt-1 flex items-center justify-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-[18px] font-bold tracking-tight",
                    toISO(selectedDate) === todayISO ? "bg-teal text-white shadow-sm" : "text-ink"
                  )}
                >
                  {selectedDate.getDate()}
                </div>
              </div>
              {(() => {
                const dayApptCount = appointments.filter(
                  (a) => a.scheduled_date === toISO(selectedDate)
                ).length;
                return dayApptCount > 0 ? (
                  <p className="text-[10px] text-ink3 mt-1 font-medium">
                    {dayApptCount} turno{dayApptCount !== 1 ? "s" : ""}
                  </p>
                ) : null;
              })()}
            </div>
          </div>

          {/* Scrollable grid body */}
          <div
            ref={scrollRef}
            className="overflow-y-auto"
            style={{ maxHeight: `${SLOT_HEIGHT * 8}px` }}
          >
            <div className="grid" style={{ gridTemplateColumns: "64px 1fr" }}>
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

              {/* Single day column */}
              <DayView
                date={selectedDate}
                appointments={appointments}
                onSelect={setSelectedApt}
                todayISO={todayISO}
                onReschedule={handleDragReschedule}
                onToast={showToast}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Weekly grid ── */}
      {!apptsQ.isLoading && viewMode === "week" && (
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
                <button
                  key={iso}
                  type="button"
                  onClick={() => switchToDay(day)}
                  className={cn(
                    "py-3 text-center border-r border-line last:border-r-0 transition-colors hover:bg-teal/5",
                    "focus:outline-none focus:ring-2 focus:ring-teal/30 focus:ring-inset",
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
                </button>
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

              {/* Day columns with drag-and-drop */}
              <WeekViewColumns
                weekDays={weekDays}
                apptsByDate={apptsByDate}
                onSelect={setSelectedApt}
                todayISO={todayISO}
                monday={monday}
                onReschedule={handleDragReschedule}
                onToast={showToast}
              />
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

      {/* ── Toast ── */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
