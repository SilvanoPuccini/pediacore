import { CalendarDays, Clock, MapPin, Wifi, User, Stethoscope, ExternalLink, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/types/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

const DAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

function formatTime(timeStr: string): string {
  return timeStr.slice(0, 5);
}

function formatDateLong(dateStr: string): { day: number; month: string; weekday: string } {
  const date = parseLocalDate(dateStr);
  return {
    day: date.getDate(),
    month: MONTH_NAMES[date.getMonth()],
    weekday: DAY_NAMES[date.getDay()],
  };
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyHero() {
  return (
    <div
      className={cn(
        "bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)]",
        "p-8 flex flex-col items-center gap-4 text-center"
      )}
    >
      <div className="h-14 w-14 rounded-full bg-cream flex items-center justify-center">
        <CalendarDays size={24} className="text-teal-dark" />
      </div>
      <div>
        <p className="text-[15px] font-semibold text-ink mb-1">
          No tenés turnos próximos
        </p>
        <p className="text-[13px] text-ink3">
          Reservá un turno para comenzar el seguimiento.
        </p>
      </div>
      <Link
        to="/booking"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[12px] bg-teal-dark text-white text-[13px] font-semibold hover:opacity-90 transition-opacity"
      >
        <CalendarDays size={14} />
        Reservar turno
      </Link>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface HeroAppointmentCardProps {
  appointment: Appointment | null | undefined;
  loading?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HeroAppointmentCard({ appointment, loading }: HeroAppointmentCardProps) {
  if (loading) {
    return (
      <div className="bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] p-6 animate-pulse">
        <div className="flex items-start gap-5">
          <div className="h-16 w-14 bg-cream rounded-[12px] shrink-0" />
          <div className="flex-1 space-y-2.5">
            <div className="h-4 w-2/3 bg-cream rounded-full" />
            <div className="h-3 w-1/2 bg-cream rounded-full" />
            <div className="h-3 w-1/3 bg-cream rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!appointment) return <EmptyHero />;

  const { day, month, weekday } = formatDateLong(appointment.scheduled_date);
  const hasJoinLink = appointment.is_online && !!appointment.meeting_link && appointment.status === "CONFIRMED";

  return (
    <div
      className={cn(
        "bg-surface rounded-[20px] border border-teal/30 shadow-[var(--shadow-soft)]",
        "p-6 flex flex-col gap-5"
      )}
    >
      {/* Header row */}
      <div className="flex items-start gap-5">
        {/* Date block */}
        <div className="shrink-0 flex flex-col items-center justify-center bg-teal/10 rounded-[14px] h-16 w-14 text-center">
          <span className="text-[22px] font-bold text-teal-dark leading-none">{day}</span>
          <span className="text-[11px] font-semibold text-teal-dark uppercase tracking-wide mt-0.5">{month}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-teal-dark uppercase tracking-wide capitalize mb-1">
            {weekday}
          </p>
          <p className="text-[16px] font-semibold text-ink truncate flex items-center gap-2">
            <Stethoscope size={14} className="text-teal-dark shrink-0" />
            {appointment.service_name}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
            <span className="flex items-center gap-1.5 text-[12px] text-ink3">
              <Clock size={11} className="shrink-0" />
              {formatTime(appointment.start_time)}
              {appointment.end_time ? ` — ${formatTime(appointment.end_time)}` : ""}
            </span>
            <span className="flex items-center gap-1.5 text-[12px] text-ink3">
              <User size={11} className="shrink-0" />
              {appointment.patient_name}
            </span>
            <span className="flex items-center gap-1.5 text-[12px] text-ink3">
              {appointment.is_online ? (
                <>
                  <Wifi size={11} className="text-teal-dark shrink-0" />
                  <span className="text-teal-dark font-medium">Online</span>
                </>
              ) : (
                <>
                  <MapPin size={11} className="shrink-0" />
                  {appointment.location_name}
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-line">
        {hasJoinLink && (
          <a
            href={appointment.meeting_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-teal-dark text-white text-[12px] font-semibold hover:opacity-90 transition-opacity"
          >
            <ExternalLink size={13} />
            Unirme a la consulta
          </a>
        )}
        <Link
          to={`/portal/turnos/${appointment.id}`}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-[10px] text-[12px] font-semibold transition-colors",
            "bg-cream border border-line text-ink hover:border-teal/40"
          )}
        >
          Ver detalle
          <ChevronRight size={13} />
        </Link>
      </div>
    </div>
  );
}
