import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Stethoscope,
  MapPin,
  Video,
  X,
  ChevronLeft,
  ChevronRight,
  Bell,
  Clock,
  AlertCircle,
  Check,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Appointment, PaginatedResponse, WaitlistEntry, Patient, Service, Location } from "@/types/api";
import {
  Card,
  Btn,
  EmptyState,
  StatusBadge,
  Avatar,
  Modal,
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
              onClick={() => navigate(`/portal/turnos/${appointment.id}/reagendar`)}
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

// ─── Waitlist form ────────────────────────────────────────────────────────────

interface WaitlistFormFields {
  patient: number | "";
  service: number | "";
  location: number | null;
  preferred_date_start: string;
  timePref: "Mañana" | "Tarde" | "Indistinto";
  notifyChannel: "WhatsApp" | "Email";
}

const inputCls =
  "w-full h-9 px-3 rounded-[10px] border border-line bg-surface text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal/60 transition";

const labelCls = "block text-[11.5px] font-semibold text-ink2 uppercase tracking-wide mb-1.5";

function formatPatientAge(age: { years: number; months: number }): string {
  if (age.years >= 1) return `${age.years} año${age.years !== 1 ? "s" : ""}`;
  return `${age.months} mes${age.months !== 1 ? "es" : ""}`;
}

function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: T[];
}) {
  return (
    <div className="inline-flex p-1 rounded-[10px] bg-bg border border-line w-full">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn(
            "flex-1 px-2.5 py-1.5 rounded-[7px] text-[12px] font-semibold transition",
            value === o
              ? "bg-teal-dark text-white shadow-card"
              : "text-ink2 hover:bg-surface"
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function WaitlistFormModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const [fields, setFields] = useState<WaitlistFormFields>({
    patient: "",
    service: "",
    location: null,
    preferred_date_start: "",
    timePref: "Indistinto",
    notifyChannel: "Email",
  });

  const [error, setError] = useState<string | null>(null);

  // Fetch tutor's patients
  const { data: patientsData } = useQuery({
    queryKey: ["patients-for-waitlist"],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Patient>>("/patients/", {
        params: { page_size: 50 },
      });
      return res.data.results;
    },
    enabled: open,
  });

  // Fetch services
  const { data: servicesData } = useQuery({
    queryKey: ["services-for-waitlist"],
    queryFn: async () => {
      const res = await api.get<Service[]>("/services/");
      return res.data;
    },
    enabled: open,
  });

  // Fetch locations
  const { data: locationsData } = useQuery({
    queryKey: ["locations-for-waitlist"],
    queryFn: async () => {
      const res = await api.get<Location[]>("/locations/");
      return res.data;
    },
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: (body: {
      patient: number;
      service: number;
      location: number | null;
      preferred_date_start: string;
      notes: string;
      priority: "NORMAL";
    }) => api.post("/waitlist/", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waitlist-tutor"] });
      setFields({
        patient: "",
        service: "",
        location: null,
        preferred_date_start: "",
        timePref: "Indistinto",
        notifyChannel: "Email",
      });
      setError(null);
      onClose();
    },
    onError: () => {
      setError("No se pudo guardar. Revisá los datos e intentá de nuevo.");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!fields.patient || !fields.service || !fields.preferred_date_start) {
      setError("Completá los campos obligatorios.");
      return;
    }
    const notes = `Prefiere: ${fields.timePref}. Canal: ${fields.notifyChannel}`;
    createMutation.mutate({
      patient: fields.patient as number,
      service: fields.service as number,
      location: fields.location,
      preferred_date_start: fields.preferred_date_start,
      notes,
      priority: "NORMAL",
    });
  }

  function set<K extends keyof WaitlistFormFields>(key: K, value: WaitlistFormFields[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Lista de espera"
      subtitle="Avisame si se libera un cupo"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Info banner */}
        <div className="flex items-start gap-2.5 p-3 rounded-[12px] border"
          style={{ background: "rgba(212,168,50,0.12)", borderColor: "rgba(212,168,50,0.28)" }}>
          <Clock size={15} className="mt-0.5 shrink-0" style={{ color: "#8A6A1F" }} />
          <p className="text-[12px] text-ink2 leading-relaxed">
            Si se libera un cupo a partir de tu fecha ideal, te avisamos para
            que lo reserves primero. No perdés ningún turno ya reservado.
          </p>
        </div>

        {/* Child selector — card grid */}
        <div>
          <label className={labelCls}>¿Para quién? *</label>
          <div className="grid grid-cols-2 gap-2">
            {patientsData && patientsData.length > 0 ? (
              patientsData.map((p) => {
                const isSelected = fields.patient === p.id;
                const firstName = p.full_name.split(" ")[0] ?? p.full_name;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => set("patient", p.id)}
                    className={cn(
                      "flex items-center gap-2.5 p-2.5 rounded-[10px] border transition text-left",
                      isSelected
                        ? "bg-teal/10 border-teal"
                        : "bg-surface border-line hover:bg-bg"
                    )}
                  >
                    <Avatar name={firstName} childIndex={p.id % 4} size={30} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-bold text-ink truncate">{firstName}</div>
                      <div className="text-[10.5px] text-ink3">{formatPatientAge(p.age)}</div>
                    </div>
                    {isSelected && (
                      <Check size={14} className="text-teal-dark shrink-0" />
                    )}
                  </button>
                );
              })
            ) : (
              <p className="col-span-2 text-[12px] text-ink3 py-2">
                {patientsData ? "No tenés pacientes registrados." : "Cargando..."}
              </p>
            )}
          </div>
        </div>

        {/* Service + Sede row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Tipo de consulta *</label>
            <select
              value={fields.service}
              onChange={(e) => set("service", e.target.value ? Number(e.target.value) : "")}
              className={inputCls}
              required
            >
              <option value="">Seleccioná</option>
              {servicesData?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Modalidad / sede</label>
            <select
              value={fields.location ?? ""}
              onChange={(e) =>
                set("location", e.target.value && e.target.value !== "online" ? Number(e.target.value) : null)
              }
              className={inputCls}
            >
              <option value="">Cualquier sede</option>
              {locationsData?.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
              <option value="online">Online</option>
            </select>
          </div>
        </div>

        {/* Preferred date start */}
        <div>
          <label className={labelCls}>A partir de qué fecha *</label>
          <input
            type="date"
            value={fields.preferred_date_start}
            onChange={(e) => set("preferred_date_start", e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className={inputCls}
            required
          />
        </div>

        {/* Preferences row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Horario que preferís</label>
            <SegmentedControl
              value={fields.timePref}
              onChange={(v) => set("timePref", v)}
              options={["Mañana", "Tarde", "Indistinto"] as const}
            />
          </div>
          <div>
            <label className={labelCls}>Avisarme por</label>
            <SegmentedControl
              value={fields.notifyChannel}
              onChange={(v) => set("notifyChannel", v)}
              options={["WhatsApp", "Email"] as const}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-[12px] text-[#A85050]">
            <AlertCircle size={13} className="shrink-0" />
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <Btn variant="ghost" onClick={onClose} type="button">
            Cancelar
          </Btn>
          <Btn
            variant="primary"
            icon="Bell"
            type="submit"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Guardando..." : "Avisarme si se libera"}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}

// ─── Waitlist entry card ───────────────────────────────────────────────────────

function WaitlistCard({ entry }: { entry: WaitlistEntry }) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/waitlist/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waitlist-tutor"] });
    },
  });

  // Parse structured notes: "Prefiere: Mañana. Canal: Email"
  const timePref = entry.notes?.match(/Prefiere:\s*([^.]+)/)?.[1]?.trim();
  const channel = entry.notes?.match(/Canal:\s*([^.]+)/)?.[1]?.trim();

  return (
    <div
      className="rounded-[16px] p-5 border"
      style={{
        background: "linear-gradient(135deg, rgba(168,201,168,0.16), rgba(123,181,189,0.10))",
        borderColor: "rgba(123,181,189,0.4)",
      }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          {/* Icon */}
          <div
            className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0"
            style={{ background: "rgba(168,201,168,0.40)", color: "#3F7059" }}
          >
            <Check size={18} />
          </div>

          {/* Info */}
          <div className="min-w-0">
            <h3 className="font-display text-[16px] text-ink">Estás en lista de espera</h3>
            <p className="text-[12.5px] text-ink2 mt-1 leading-relaxed max-w-lg">
              Te avisamos por{" "}
              <span className="font-semibold text-ink">{channel ?? "Email"}</span>{" "}
              apenas se libere un cupo para{" "}
              <span className="font-semibold text-ink">{entry.patient_name}</span>{" "}
              ({entry.service_name})
              {entry.location_name ? ` en ${entry.location_name}` : ""}.
            </p>
            <div className="mt-2 flex items-center gap-3 flex-wrap text-[11.5px] text-ink3">
              {timePref && (
                <span className="inline-flex items-center gap-1">
                  <Clock size={11} />
                  Preferís {timePref.toLowerCase()}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Bell size={11} />
                Aviso activo
              </span>
              {entry.location_name && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={11} />
                  {entry.location_name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Leave button */}
        <button
          onClick={() => deleteMutation.mutate(entry.id)}
          disabled={deleteMutation.isPending}
          className="shrink-0 text-[12px] font-semibold text-ink3 hover:text-[#A85050] transition-colors disabled:opacity-50 flex items-center gap-1.5 border border-line/60 rounded-[10px] px-3 py-1.5 bg-surface/60 hover:border-[#A85050]/30"
          aria-label="Salir de la lista de espera"
        >
          <X size={13} />
          Salir de la lista
        </button>
      </div>
    </div>
  );
}

// ─── Waitlist section ─────────────────────────────────────────────────────────

function WaitlistSection() {
  const [modalOpen, setModalOpen] = useState(false);

  const { data: waitlistData, isLoading } = useQuery({
    queryKey: ["waitlist-tutor"],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<WaitlistEntry>>("/waitlist/", {
        params: { page_size: 20, status: "WAITING,NOTIFIED" },
      });
      return res.data.results;
    },
  });

  const activeEntries = waitlistData ?? [];
  const hasEntries = activeEntries.length > 0;

  return (
    <div className="mt-5">
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <div className="h-5 w-5 rounded-full border-2 border-line border-t-teal animate-spin" />
        </div>
      ) : hasEntries ? (
        /* Active entries — one or more status cards */
        <div className="space-y-2.5">
          {activeEntries.map((entry) => (
            <WaitlistCard key={entry.id} entry={entry} />
          ))}
        </div>
      ) : (
        /* CTA — no active entries */
        <div className="rounded-[16px] border border-dashed border-line bg-surface p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0"
                style={{ background: "rgba(212,168,50,0.22)", color: "#8A6A1F" }}
              >
                <Clock size={18} />
              </div>
              <div>
                <h3 className="font-display text-[16px] text-ink">
                  ¿No hay turno antes de lo que necesitás?
                </h3>
                <p className="text-[12.5px] text-ink2 mt-1 leading-relaxed max-w-lg">
                  Sumate a la lista de espera y te avisamos apenas se libere un
                  cupo antes de tu fecha ideal. Sin perder tu lugar en la agenda.
                </p>
              </div>
            </div>
            <Btn variant="primary" icon="Bell" onClick={() => setModalOpen(true)}>
              Avisarme si se libera
            </Btn>
          </div>
        </div>
      )}

      <WaitlistFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
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

  const cancelMutation = useMutation({
    mutationFn: (appointmentId: number) =>
      api.post(`/appointments/${appointmentId}/cancel/`),
    onSuccess: () => {
      setCancelTarget(null);
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["appointments-count"] });
      queryClient.invalidateQueries({ queryKey: ["appointments", "dashboard-upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
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
        <>
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
          {!isPast && <WaitlistSection />}
        </>
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

          {/* Waitlist + bottom CTA — only for upcoming tab */}
          {!isPast && (
            <>
              <WaitlistSection />
              <div className="mt-5 bg-surface border border-dashed border-line rounded-[14px] p-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[13.5px] font-bold text-ink">¿Necesitás otro turno?</p>
                  <p className="text-[12px] text-ink2 mt-0.5">Reservá presencial u online en menos de 2 minutos.</p>
                </div>
                <Link to="/booking">
                  <Btn variant="primary" size="sm" icon="Plus">
                    Reservar turno
                  </Btn>
                </Link>
              </div>
            </>
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
