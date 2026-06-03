import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  MapPin,
  Wifi,
  Clock,
  User,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Appointment, PaginatedResponse } from "@/types/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 5;
const UPCOMING_STATUSES = "CONFIRMED,HOLD";
const PAST_STATUSES = "COMPLETED,NO_SHOW,CANCELLED,EXPIRED";

// ─── Date helpers ─────────────────────────────────────────────────────────────

const DATE_FORMATTER = new Intl.DateTimeFormat("es-CL", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Santiago",
});

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  const formatted = DATE_FORMATTER.format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function formatTime(timeStr: string): string {
  return timeStr.slice(0, 5);
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  CONFIRMED: {
    label: "Confirmado",
    classes: "bg-teal/10 text-teal-dark border border-teal/20",
  },
  CONFIRMED_ATTENDANCE: {
    label: "Asistencia confirmada",
    classes: "bg-green-50 text-green-700 border border-green-200",
  },
  COMPLETED: {
    label: "Atendido",
    classes: "bg-green-50 text-green-700 border border-green-200",
  },
  CANCELLED: {
    label: "Cancelado",
    classes: "bg-gray-100 text-gray-500 border border-gray-200",
  },
  NO_SHOW: {
    label: "No se presentó",
    classes: "bg-coral/10 text-coral border border-coral/20",
  },
  HOLD: {
    label: "Reservado",
    classes: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  EXPIRED: {
    label: "Expirado",
    classes: "bg-gray-100 text-gray-400 border border-gray-200",
  },
  RESCHEDULED: {
    label: "Reagendado",
    classes: "bg-blue-50 text-blue-600 border border-blue-200",
  },
};

function StatusBadge({
  status,
  attendanceConfirmed,
}: {
  status: string;
  attendanceConfirmed?: boolean;
}) {
  const key =
    status === "CONFIRMED" && attendanceConfirmed
      ? "CONFIRMED_ATTENDANCE"
      : status;
  const config = STATUS_CONFIG[key] ?? {
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
    <Link
      to={`/portal/turnos/${appointment.id}`}
      className="group block bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] p-5 flex flex-col gap-4 hover:border-teal/40 hover:shadow-md transition-all"
    >
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
        <div className="flex items-center gap-2">
          <StatusBadge
            status={appointment.status}
            attendanceConfirmed={appointment.attendance_confirmed}
          />
          <ChevronRight
            size={15}
            className="text-ink3 group-hover:text-teal-dark transition-colors shrink-0"
          />
        </div>
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

      {/* Online meeting link indicator */}
      {appointment.is_online &&
        appointment.meeting_link &&
        appointment.status === "CONFIRMED" && (
          <div className="flex items-center gap-1.5">
            <Wifi size={12} className="text-teal-dark" />
            <span className="text-[12px] font-semibold text-teal-dark">
              Consulta online disponible
            </span>
          </div>
        )}
    </Link>
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
          {tab === "upcoming"
            ? "No tenés turnos próximos"
            : "No hay turnos anteriores"}
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
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
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
    </button>
  );
}

// ─── Pagination controls ──────────────────────────────────────────────────────

function PaginationControls({
  page,
  totalPages,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-4 pt-2">
      <button
        onClick={onPrev}
        disabled={page === 1}
        aria-label="Página anterior"
        className={cn(
          "flex items-center justify-center w-9 h-9 rounded-[12px] border border-line bg-surface text-ink transition-opacity",
          page === 1 ? "opacity-30 cursor-not-allowed" : "hover:opacity-70"
        )}
      >
        <ChevronLeft size={16} />
      </button>

      <span className="text-[13px] font-semibold text-ink2">
        Página {page} de {totalPages}
      </span>

      <button
        onClick={onNext}
        disabled={page === totalPages}
        aria-label="Página siguiente"
        className={cn(
          "flex items-center justify-center w-9 h-9 rounded-[12px] border border-line bg-surface text-ink transition-opacity",
          page === totalPages
            ? "opacity-30 cursor-not-allowed"
            : "hover:opacity-70"
        )}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MyAppointments() {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [pastPage, setPastPage] = useState(1);

  const page = activeTab === "upcoming" ? upcomingPage : pastPage;
  const setPage = activeTab === "upcoming" ? setUpcomingPage : setPastPage;
  const statusFilter =
    activeTab === "upcoming" ? UPCOMING_STATUSES : PAST_STATUSES;
  // Upcoming: oldest first (next appointment at top); past: newest first
  const ordering =
    activeTab === "upcoming"
      ? "scheduled_date,start_time"
      : "-scheduled_date,-start_time";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["appointments", activeTab, page],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Appointment>>(
        "/appointments/",
        {
          params: {
            status: statusFilter,
            ordering,
            page,
            page_size: PAGE_SIZE,
          },
        }
      );
      return response.data;
    },
  });

  const results = data?.results ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  function handleTabChange(tab: "upcoming" | "past") {
    setActiveTab(tab);
  }

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
          onClick={() => handleTabChange("upcoming")}
        >
          Próximos
        </TabButton>
        <TabButton
          active={activeTab === "past"}
          onClick={() => handleTabChange("past")}
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
      ) : results.length === 0 ? (
        <EmptyState tab={activeTab} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3">
            {results.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))}
          </div>

          <div className="mt-4">
            <PaginationControls
              page={page}
              totalPages={totalPages}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
            />
          </div>
        </>
      )}
    </div>
  );
}
