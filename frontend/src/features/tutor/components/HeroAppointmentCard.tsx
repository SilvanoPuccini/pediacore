import { useState } from "react";
import {
  CalendarDays,
  MapPin,
  Video,
  Stethoscope,
  X,
  AlertCircle,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { StatusBadge, Btn, Avatar } from "@/features/tutor/components/portal-ui";
import type { Appointment } from "@/types/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_NAMES_SHORT = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MONTH_NAMES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

function formatTime(t: string): string {
  return t.slice(0, 5);
}

function daysUntil(dateStr: string): number {
  const target = parseLocalDate(dateStr);
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function mapStatus(status: string, attendanceConfirmed?: boolean): string {
  if (status === "CONFIRMED" && attendanceConfirmed) return "asistencia";
  const MAP: Record<string, string> = {
    CONFIRMED: "confirmado",
    COMPLETED: "realizado",
    CANCELLED: "cancelado",
    HOLD: "pendiente",
    PENDING: "pendiente",
  };
  return MAP[status] ?? "realizado";
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  appointment: Appointment | null | undefined;
  loading?: boolean;
}

export default function HeroAppointmentCard({ appointment, loading }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCancelModal, setShowCancelModal] = useState(false);

  const cancelMutation = useMutation({
    mutationFn: () => api.post(`/appointments/${appointment?.id}/cancel/`),
    onSuccess: () => {
      setShowCancelModal(false);
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["appointments-count"] });
      queryClient.invalidateQueries({ queryKey: ["appointments", "dashboard-upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });

  if (loading) {
    return (
      <div className="rounded-[18px] border border-line shadow-card p-6 animate-pulse"
        style={{ background: "linear-gradient(135deg, rgba(123,181,189,0.10) 0%, rgba(229,184,71,0.08) 100%)" }}
      >
        <div className="flex items-start gap-5">
          <div className="h-[72px] w-[64px] bg-cream rounded-[12px] shrink-0" />
          <div className="flex-1 space-y-2.5">
            <div className="h-4 w-2/3 bg-cream rounded-full" />
            <div className="h-3 w-1/2 bg-cream rounded-full" />
            <div className="h-3 w-1/3 bg-cream rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="rounded-[18px] border border-line shadow-card p-8 flex flex-col items-center gap-4 text-center bg-surface">
        <div className="h-14 w-14 rounded-full bg-bg flex items-center justify-center">
          <CalendarDays size={24} className="text-ink3" />
        </div>
        <p className="text-[15px] font-bold text-ink">No tenés turnos próximos</p>
        <p className="text-[13px] text-ink2">Reservá un turno para comenzar.</p>
        <Link
          to="/booking"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-teal-dark text-white text-[13px] font-semibold hover:opacity-90 transition-opacity"
        >
          <CalendarDays size={14} />
          Reservar turno
        </Link>
      </div>
    );
  }

  const date = parseLocalDate(appointment.scheduled_date);
  const dayNum = date.getDate();
  const monthName = MONTH_NAMES[date.getMonth()];
  const dayName = DAY_NAMES_SHORT[date.getDay()];
  const remaining = daysUntil(appointment.scheduled_date);
  const isOnline = appointment.is_online;
  const hasJoinLink = isOnline && !!appointment.meeting_link && appointment.status === "CONFIRMED";
  const isUnpaid = appointment.status === "PENDING" || appointment.status === "HOLD";

  return (
    <>
      <div
        className="rounded-[18px] border border-line shadow-card overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, rgba(123,181,189,0.10) 0%, rgba(229,184,71,0.08) 100%)",
        }}
      >
        {/* Clickable card body */}
        <Link to={`/portal/turnos/${appointment.id}`} className="block p-6 hover:bg-white/30 transition-colors">
          {/* Top row: label + badge + time-until */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-dark" />
              <span className="text-[11px] uppercase tracking-[0.12em] font-bold text-teal-dark">
                Próximo turno
              </span>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={mapStatus(appointment.status, appointment.attendance_confirmed)} />
              {remaining > 0 && (
                <span className="text-[11px] text-ink3 font-medium">
                  En {remaining} día{remaining !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>

          {/* Date + info */}
          <div className="flex items-start gap-5">
            {/* Date mini calendar */}
            <div className="text-center px-4 py-3 rounded-[12px] bg-surface border border-line shrink-0">
              <div className="text-[11px] uppercase tracking-wider font-bold text-teal-dark">
                {dayName}
              </div>
              <div className="font-display text-[30px] font-medium text-ink leading-none mt-0.5">
                {dayNum}
              </div>
              <div className="text-[10.5px] text-ink2 font-medium mt-0.5">{monthName}</div>
            </div>

            {/* Time + child info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-[24px] font-medium text-ink">
                  {formatTime(appointment.start_time)}
                </span>
                {appointment.end_time && (
                  <span className="text-[15px] text-ink3">
                    — {formatTime(appointment.end_time)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-2">
                <Avatar name={appointment.patient_name ?? "P"} childIndex={0} size={26} />
                <div>
                  <span className="text-[13.5px] font-semibold text-ink">
                    {appointment.patient_name}
                  </span>
                </div>
              </div>

              {/* Type + sede */}
              <div className="flex items-center gap-3 mt-2 text-[12px] text-ink2">
                <span className="flex items-center gap-1">
                  <Stethoscope size={12} className="text-ink3" />
                  {appointment.service_name}
                </span>
                <span className="text-ink3">·</span>
                <span className="flex items-center gap-1">
                  {isOnline ? (
                    <Video size={12} className="text-teal-dark" />
                  ) : (
                    <MapPin size={12} className="text-ink3" />
                  )}
                  {isOnline ? "Online" : (appointment.location_name ?? "Presencial")}
                </span>
              </div>
            </div>
          </div>
        </Link>

        {/* Actions footer */}
        <div className="border-t border-line/60 px-6 py-4 flex items-center gap-2 flex-wrap">
          {hasJoinLink && (
            <a
              href={appointment.meeting_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-teal-dark text-white text-[12.5px] font-semibold hover:opacity-90 transition-opacity"
            >
              <Video size={14} />
              Unirme online
            </a>
          )}
          <Btn
            variant="ghost"
            size="sm"
            icon="RefreshCw"
            onClick={() => navigate(`/portal/turnos/${appointment.id}/reagendar`)}
          >
            Reagendar
          </Btn>
          {isUnpaid && appointment.payment_id && (
            <Btn
              variant="soft"
              size="sm"
              icon="CreditCard"
              onClick={() => navigate(`/portal/pagos/${appointment.payment_id}`)}
            >
              Pagar
            </Btn>
          )}
          <div className="flex-1" />
          <button
            onClick={() => setShowCancelModal(true)}
            className="flex items-center gap-1 text-[12px] text-ink3 hover:text-[#A85050] transition-colors"
          >
            <X size={13} />
            Cancelar
          </button>
        </div>
      </div>

      {/* Cancel confirmation modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={() => setShowCancelModal(false)}
          />
          <div
            className="relative z-10 bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] p-6 w-full max-w-[380px]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowCancelModal(false)}
              className="absolute top-4 right-4 text-ink3 hover:text-ink transition-colors"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>

            <div className="h-12 w-12 rounded-full bg-coral/10 flex items-center justify-center mb-4">
              <AlertCircle size={22} className="text-coral" />
            </div>

            <h2 className="font-display text-[20px] font-semibold text-ink mb-2">
              Cancelar este turno?
            </h2>
            <p className="text-[13px] text-ink2 leading-relaxed mb-6">
              Esta acción no se puede deshacer. El turno quedará cancelado y se
              aplicará la política de cancelación vigente.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelMutation.isPending}
                className={cn(
                  "flex-1 h-10 rounded-[12px] border border-line text-[13px] font-semibold text-ink2",
                  "hover:bg-cream transition-colors disabled:opacity-50"
                )}
              >
                Volver
              </button>
              <button
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                className={cn(
                  "flex-1 h-10 rounded-[12px] bg-coral text-[13px] font-semibold text-white",
                  "hover:opacity-90 transition-opacity disabled:opacity-50"
                )}
              >
                {cancelMutation.isPending ? "Cancelando..." : "Cancelar turno"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
