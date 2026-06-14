import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Stethoscope,
  MapPin,
  Video,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Appointment, PaginatedResponse } from "@/types/api";
import {
  Card,
  Btn,
  EmptyState,
  StatusBadge,
  Avatar,
} from "@/features/tutor/components/portal-ui";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 5;
const UPCOMING_STATUSES = "CONFIRMED,HOLD,PENDING";
const PAST_STATUSES = "COMPLETED,NO_SHOW,CANCELLED,EXPIRED";

// ─── Status mapping ───────────────────────────────────────────────────────────

/**
 * Maps API appointment status strings to the portal-ui StatusBadge format.
 * StatusBadge accepts: confirmado | asistencia | pendiente | cancelado | realizado
 */
function mapStatus(
  status: string,
  attendanceConfirmed?: boolean
): string {
  if (status === "CONFIRMED" && attendanceConfirmed) return "asistencia";
  switch (status) {
    case "CONFIRMED":
      return "confirmado";
    case "HOLD":
    case "PENDING":
      return "pendiente";
    case "CANCELLED":
    case "NO_SHOW":
    case "EXPIRED":
      return "cancelado";
    case "COMPLETED":
    case "RESCHEDULED":
    default:
      return "realizado";
  }
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function parseDateParts(dateStr: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateStr.split("-").map(Number);
  return { year, month, day };
}

function getLocalDate(dateStr: string): Date {
  const { year, month, day } = parseDateParts(dateStr);
  // Use noon to avoid DST boundary issues
  return new Date(year, month - 1, day, 12, 0, 0);
}

function formatDayOfWeek(dateStr: string): string {
  const date = getLocalDate(dateStr);
  return date
    .toLocaleDateString("es-CL", { weekday: "short" })
    .replace(".", "")
    .toUpperCase();
}

function formatDayNumber(dateStr: string): string {
  const { day } = parseDateParts(dateStr);
  return String(day);
}

function formatMonth(dateStr: string): string {
  const date = getLocalDate(dateStr);
  return date
    .toLocaleDateString("es-CL", { month: "short" })
    .replace(".", "")
    .toUpperCase();
}

function formatTime(timeStr: string): string {
  return timeStr.slice(0, 5);
}

function calcDurationMinutes(startTime: string, endTime: string): number | null {
  if (!endTime) return null;
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return diff > 0 ? diff : null;
}

// ─── Tab button ───────────────────────────────────────────────────────────────

function TabButton({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count?: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-[12.5px] font-semibold transition-all",
        active
          ? "bg-bg text-teal-dark shadow-card"
          : "text-ink3 hover:text-ink"
      )}
    >
      {children}
      {count !== undefined && (
        <span className="text-[10px] text-ink3 font-medium">{count}</span>
      )}
    </button>
  );
}

// ─── Appointment row ──────────────────────────────────────────────────────────

function ApptRow({
  appointment,
  isPast,
  onCancel,
}: {
  appointment: Appointment;
  isPast: boolean;
  onCancel: (id: number) => void;
}) {
  const navigate = useNavigate();
  const duration = calcDurationMinutes(appointment.start_time, appointment.end_time);
  const mappedStatus = mapStatus(appointment.status, appointment.attendance_confirmed);

  // Determine action buttons
  const isUnpaid = appointment.status === "HOLD" || appointment.status === "PENDING";
  const canCancel = ["CONFIRMED", "HOLD", "PENDING"].includes(appointment.status);
  const isOnlineConfirmed =
    appointment.is_online &&
    appointment.status === "CONFIRMED" &&
    !!appointment.meeting_link;

  // Patient name first word as avatar initial
  const patientFirstName = appointment.patient_name.split(" ")[0] ?? appointment.patient_name;

  return (
    <li className="grid grid-cols-1 md:grid-cols-[100px_1fr_auto] gap-4 items-center px-5 py-4 hover:bg-bg transition-colors">
      {/* Date column */}
      <Link
        to={`/portal/turnos/${appointment.id}`}
        className="text-center px-3 py-2 rounded-[10px] bg-bg border border-line self-start md:self-center w-fit md:w-auto mx-auto md:mx-0 hover:border-teal/40 transition-colors"
      >
        <p className="text-[10px] uppercase tracking-wider font-bold text-teal-dark leading-none">
          {formatDayOfWeek(appointment.scheduled_date)}
        </p>
        <p className="font-display text-[22px] font-medium text-ink leading-tight mt-0.5">
          {formatDayNumber(appointment.scheduled_date)}
        </p>
        <p className="text-[10px] text-ink2 font-medium leading-none mt-0.5">
          {formatMonth(appointment.scheduled_date)}
        </p>
      </Link>

      {/* Info column */}
      <Link to={`/portal/turnos/${appointment.id}`} className="flex flex-col gap-2 min-w-0">
        {/* Time + duration + status */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display text-[18px] font-medium text-ink leading-none">
            {formatTime(appointment.start_time)}
          </span>
          {duration !== null && (
            <span className="text-[11.5px] text-ink3">
              {duration} min
            </span>
          )}
          <StatusBadge status={mappedStatus} />
        </div>

        {/* Child + service + location */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Avatar name={patientFirstName} childIndex={appointment.patient % 4} size={22} />
            <span className="text-[12.5px] font-semibold text-ink truncate">
              {appointment.patient_name}
            </span>
          </div>
          <div className="flex items-center gap-1 text-ink3">
            <Stethoscope size={12} className="shrink-0" />
            <span className="text-[12px] truncate">{appointment.service_name}</span>
          </div>
          <div className="flex items-center gap-1 text-ink3">
            {appointment.is_online ? (
              <>
                <Video size={12} className="shrink-0 text-teal-dark" />
                <span className="text-[12px] text-teal-dark font-medium">Online</span>
              </>
            ) : (
              <>
                <MapPin size={12} className="shrink-0" />
                <span className="text-[12px] truncate">{appointment.location_name}</span>
              </>
            )}
          </div>
        </div>
      </Link>

      {/* Actions column */}
      <div className="flex items-center gap-1.5 justify-end">
        {isPast ? (
          <Link to={`/portal/turnos/${appointment.id}`}>
            <Btn variant="ghost" size="sm" icon="FileText">
              Ver detalle
            </Btn>
          </Link>
        ) : (
          <>
            {isOnlineConfirmed && (
              <a href={appointment.meeting_link} target="_blank" rel="noopener noreferrer">
                <Btn variant="primary" size="sm" icon="Video">
                  Unirme
                </Btn>
              </a>
            )}
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
            <Btn
              variant="ghost"
              size="sm"
              icon="RefreshCw"
              onClick={() => navigate(`/portal/turnos/${appointment.id}`)}
            >
              Reagendar
            </Btn>
            {canCancel && (
              <button
                onClick={() => onCancel(appointment.id)}
                aria-label="Cancelar turno"
                className="p-1.5 rounded-[8px] text-ink3 hover:text-[#A85050] hover:bg-destructive/10 transition-colors"
              >
                <X size={15} />
              </button>
            )}
          </>
        )}
      </div>
    </li>
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
    <div className="flex items-center justify-center gap-4 pt-2 pb-1">
      <button
        onClick={onPrev}
        disabled={page === 1}
        aria-label="Página anterior"
        className={cn(
          "flex items-center justify-center w-9 h-9 rounded-[10px] border border-line bg-surface text-ink transition-opacity",
          page === 1 ? "opacity-30 cursor-not-allowed" : "hover:opacity-70"
        )}
      >
        <ChevronLeft size={16} />
      </button>

      <span className="text-[12.5px] font-semibold text-ink2">
        {page} / {totalPages}
      </span>

      <button
        onClick={onNext}
        disabled={page === totalPages}
        aria-label="Página siguiente"
        className={cn(
          "flex items-center justify-center w-9 h-9 rounded-[10px] border border-line bg-surface text-ink transition-opacity",
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
  const [cancelTarget, setCancelTarget] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const cancelMutation = useMutation({
    mutationFn: (appointmentId: number) =>
      api.post(`/appointments/${appointmentId}/cancel/`),
    onSuccess: () => {
      setCancelTarget(null);
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["appointments-count"] });
    },
  });

  const isPast = activeTab === "past";
  const page = isPast ? pastPage : upcomingPage;
  const setPage = isPast ? setPastPage : setUpcomingPage;
  const statusFilter = isPast ? PAST_STATUSES : UPCOMING_STATUSES;
  const ordering = isPast
    ? "-scheduled_date,-start_time"
    : "scheduled_date,start_time";

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

  // Fetch upcoming count for tab badge (always, regardless of active tab)
  const { data: upcomingCountData } = useQuery({
    queryKey: ["appointments-count", "upcoming"],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Appointment>>(
        "/appointments/",
        {
          params: {
            status: UPCOMING_STATUSES,
            page: 1,
            page_size: 1,
          },
        }
      );
      return response.data.count;
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
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        {/* Tab switcher */}
        <div className="inline-flex p-1 rounded-[12px] bg-surface border border-line">
          <TabButton
            active={activeTab === "upcoming"}
            count={upcomingCountData}
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

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <Link to="/portal/calendario">
            <Btn variant="ghost" size="sm" icon="Calendar">
              Ver calendario
            </Btn>
          </Link>
          <Link to="/booking">
            <Btn variant="primary" size="sm" icon="Plus">
              Reservar turno
            </Btn>
          </Link>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <Card>
          <div className="px-6 py-10 text-center">
            <p className="text-[13px] font-semibold text-[#A85050] mb-1">
              No se pudieron cargar los turnos
            </p>
            <p className="text-[12px] text-ink3">
              Intentá recargar la página. Si el problema persiste, contactanos.
            </p>
          </div>
        </Card>
      ) : results.length === 0 ? (
        <Card padding={false}>
          <EmptyState
            icon={isPast ? "FileText" : "Calendar"}
            title={
              isPast ? "No hay turnos anteriores" : "No tenés turnos próximos"
            }
            text={
              isPast
                ? "Tus turnos pasados van a aparecer acá."
                : "Cuando reserves un turno, va a aparecer acá."
            }
            action={
              !isPast ? (
                <Link to="/booking">
                  <Btn variant="primary" size="sm" icon="Plus">
                    Reservar turno
                  </Btn>
                </Link>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <>
          <Card padding={false}>
            <ul className="divide-y divide-line/60">
              {results.map((appointment) => (
                <ApptRow
                  key={appointment.id}
                  appointment={appointment}
                  isPast={isPast}
                  onCancel={(id) => setCancelTarget(id)}
                />
              ))}
            </ul>
          </Card>

          <div className="mt-3">
            <PaginationControls
              page={page}
              totalPages={totalPages}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
            />
          </div>

          {/* Bottom CTA — only for upcoming tab */}
          {!isPast && (
            <div className="mt-5 bg-surface border border-dashed border-line rounded-[14px] p-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[13px] font-semibold text-ink">
                ¿Necesitás otro turno?
              </p>
              <Link to="/booking">
                <Btn variant="primary" size="sm" icon="Plus">
                  Reservar turno
                </Btn>
              </Link>
            </div>
          )}
        </>
      )}

      {/* Cancel confirmation dialog */}
      {cancelTarget !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={() => setCancelTarget(null)}
          />
          <div className="relative bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] p-6 w-full max-w-[380px]">
            <button
              onClick={() => setCancelTarget(null)}
              className="absolute top-4 right-4 text-ink3 hover:text-ink transition-colors"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>

            <div className="h-12 w-12 rounded-full bg-coral/10 flex items-center justify-center mb-4">
              <X size={22} className="text-coral" />
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
                onClick={() => setCancelTarget(null)}
                disabled={cancelMutation.isPending}
                className={cn(
                  "flex-1 h-10 rounded-[12px] border border-line text-[13px] font-semibold text-ink2",
                  "hover:bg-cream transition-colors disabled:opacity-50"
                )}
              >
                Volver
              </button>
              <button
                onClick={() => cancelMutation.mutate(cancelTarget)}
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
    </div>
  );
}
