import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, MapPin, Wifi, Clock, User, Stethoscope } from "lucide-react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Appointment, PaginatedResponse } from "@/types/api";

// ─── Date helpers ─────────────────────────────────────────────────────────────

const DATE_FORMATTER = new Intl.DateTimeFormat("es-CL", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Santiago",
});

function formatDate(dateStr: string): string {
  // dateStr is "YYYY-MM-DD" — parse as local noon to avoid UTC offset drift
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  const formatted = DATE_FORMATTER.format(date);
  // Capitalize first letter
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function formatTime(timeStr: string): string {
  // timeStr is "HH:MM:SS" or "HH:MM"
  return timeStr.slice(0, 5);
}

function todayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; classes: string }
> = {
  CONFIRMED: {
    label: "Confirmado",
    classes: "bg-teal/10 text-teal-dark border border-teal/20",
  },
  COMPLETED: {
    label: "Completado",
    classes: "bg-green-50 text-green-700 border border-green-200",
  },
  CANCELLED: {
    label: "Cancelado",
    classes: "bg-gray-100 text-gray-500 border border-gray-200",
  },
  NO_SHOW: {
    label: "No asistió",
    classes: "bg-coral/10 text-coral border border-coral/20",
  },
  HOLD: {
    label: "Reserva pendiente",
    classes: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  EXPIRED: {
    label: "Expirado",
    classes: "bg-gray-100 text-gray-400 border border-gray-200",
  },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    classes: "bg-gray-100 text-gray-500 border border-gray-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold",
        config.classes
      )}
    >
      {config.label}
    </span>
  );
}

// ─── Appointment card ─────────────────────────────────────────────────────────

function AppointmentCard({ appointment }: { appointment: Appointment }) {
  return (
    <div className="bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] p-5 flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold text-ink leading-snug">
            {formatDate(appointment.scheduled_date)}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <Clock size={12} className="text-ink3 shrink-0" />
            <span className="text-[12px] text-ink3">
              {formatTime(appointment.start_time)}
              {appointment.end_time
                ? ` — ${formatTime(appointment.end_time)}`
                : ""}
            </span>
          </div>
        </div>
        <StatusBadge status={appointment.status} />
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 gap-2">
        <div className="flex items-center gap-2">
          <Stethoscope size={13} className="text-teal-dark shrink-0" />
          <span className="text-[13px] text-ink">{appointment.service_name}</span>
        </div>

        <div className="flex items-center gap-2">
          <User size={13} className="text-ink3 shrink-0" />
          <span className="text-[13px] text-ink2">{appointment.patient_name}</span>
        </div>

        <div className="flex items-center gap-2">
          {appointment.is_online ? (
            <>
              <Wifi size={13} className="text-teal-dark shrink-0" />
              <span className="text-[13px] text-teal-dark font-medium">Online</span>
            </>
          ) : (
            <>
              <MapPin size={13} className="text-ink3 shrink-0" />
              <span className="text-[13px] text-ink2">{appointment.location_name}</span>
            </>
          )}
        </div>
      </div>

      {/* Online meeting link */}
      {appointment.is_online && appointment.meeting_link && appointment.status === "CONFIRMED" && (
        <a
          href={appointment.meeting_link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-teal-dark underline underline-offset-2"
        >
          <Wifi size={12} />
          Unirse a la consulta online
        </a>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: "upcoming" | "past" }) {
  return (
    <div className="bg-surface border border-line rounded-[20px] p-10 flex flex-col items-center gap-4 text-center shadow-[var(--shadow-soft)]">
      <div className="h-14 w-14 rounded-full bg-cream flex items-center justify-center">
        <CalendarDays size={24} className="text-teal-dark" />
      </div>
      <div>
        <p className="text-[14px] font-semibold text-ink mb-1">
          {tab === "upcoming" ? "No tenés turnos próximos" : "No hay turnos anteriores"}
        </p>
        <p className="text-[13px] text-ink3">
          {tab === "upcoming"
            ? "Cuando reserves un turno, va a aparecer acá."
            : "Tus turnos pasados van a aparecer acá."}
        </p>
      </div>
    </div>
  );
}

// ─── Loading spinner ──────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-8 w-8 rounded-full border-2 border-line border-t-teal animate-spin" />
    </div>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-[12px] text-[13px] font-semibold transition-colors",
        active
          ? "bg-teal text-white shadow-sm"
          : "text-ink3 hover:text-ink hover:bg-cream"
      )}
    >
      {children}
      {count !== undefined && count > 0 && (
        <span
          className={cn(
            "inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[11px] font-bold",
            active ? "bg-white/20 text-white" : "bg-cream text-ink3"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const UPCOMING_STATUSES = new Set(["CONFIRMED", "HOLD"]);
const PAST_STATUSES = new Set(["COMPLETED", "NO_SHOW", "CANCELLED", "EXPIRED"]);

export default function MyAppointments() {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Appointment>>("/appointments/");
      return response.data;
    },
  });

  const today = todayDateString();

  const upcoming = (data?.results ?? [])
    .filter(
      (a) =>
        UPCOMING_STATUSES.has(a.status) && a.scheduled_date >= today
    )
    .sort((a, b) => {
      const dateCmp = a.scheduled_date.localeCompare(b.scheduled_date);
      return dateCmp !== 0 ? dateCmp : a.start_time.localeCompare(b.start_time);
    });

  const past = (data?.results ?? [])
    .filter((a) => PAST_STATUSES.has(a.status) || a.scheduled_date < today)
    .filter((a) => !upcoming.includes(a))
    .sort((a, b) => {
      const dateCmp = b.scheduled_date.localeCompare(a.scheduled_date);
      return dateCmp !== 0 ? dateCmp : b.start_time.localeCompare(a.start_time);
    });

  const displayed = activeTab === "upcoming" ? upcoming : past;

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-[28px] font-semibold text-ink mb-1">
            Mis Turnos
          </h1>
          <p className="text-[14px] text-ink3">
            Revisá y gestioná tus turnos reservados.
          </p>
        </div>
        <Link
          to="/booking"
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-[12px] bg-teal text-white text-[13px] font-semibold hover:bg-teal-dark transition-colors shadow-sm"
        >
          <CalendarDays size={15} />
          Reservar turno
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-5 p-1 bg-cream rounded-[14px] w-fit">
        <TabButton
          active={activeTab === "upcoming"}
          onClick={() => setActiveTab("upcoming")}
          count={upcoming.length}
        >
          Próximos
        </TabButton>
        <TabButton
          active={activeTab === "past"}
          onClick={() => setActiveTab("past")}
          count={past.length}
        >
          Anteriores
        </TabButton>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <div className="bg-surface border border-line rounded-[20px] p-8 text-center shadow-[var(--shadow-soft)]">
          <p className="text-[13px] text-coral font-semibold mb-1">
            No se pudieron cargar los turnos
          </p>
          <p className="text-[12px] text-ink3">
            Intentá recargar la página. Si el problema persiste, contactanos.
          </p>
        </div>
      ) : displayed.length === 0 ? (
        <EmptyState tab={activeTab} />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {displayed.map((appointment) => (
            <AppointmentCard key={appointment.id} appointment={appointment} />
          ))}
        </div>
      )}
    </div>
  );
}
