import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  MapPin,
  Stethoscope,
  User,
  Wifi,
  X,
  FileText,
  AlertCircle,
} from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import type { AppointmentDetail as AppointmentDetailType } from "@/types/api";

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
        "inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold",
        config.classes
      )}
    >
      {config.label}
    </span>
  );
}

// ─── Detail row ───────────────────────────────────────────────────────────────

function DetailRow({
  icon: Icon,
  label,
  value,
  valueClassName,
  children,
}: {
  icon: React.ElementType;
  label: string;
  value?: string;
  valueClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-line last:border-0">
      <div className="h-8 w-8 rounded-[10px] bg-cream flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={14} className="text-teal-dark" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-ink3 uppercase tracking-wide mb-0.5">
          {label}
        </p>
        {value && (
          <p className={cn("text-[14px] text-ink", valueClassName)}>{value}</p>
        )}
        {children}
      </div>
    </div>
  );
}

// ─── Cancel confirm modal ─────────────────────────────────────────────────────

interface CancelModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}

function CancelModal({ onConfirm, onCancel, isPending }: CancelModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] p-6 w-full max-w-[380px]">
        <button
          onClick={onCancel}
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
            onClick={onCancel}
            disabled={isPending}
            className={cn(
              "flex-1 h-10 rounded-[12px] border border-line text-[13px] font-semibold text-ink2",
              "hover:bg-cream transition-colors disabled:opacity-50"
            )}
          >
            Volver
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className={cn(
              "flex-1 h-10 rounded-[12px] bg-coral text-[13px] font-semibold text-white",
              "hover:opacity-90 transition-opacity disabled:opacity-50"
            )}
          >
            {isPending ? "Cancelando..." : "Cancelar turno"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="max-w-xl animate-pulse space-y-4">
      <div className="h-6 w-32 bg-cream rounded-full" />
      <div className="bg-surface rounded-[20px] border border-line p-6 space-y-4">
        <div className="h-5 w-24 bg-cream rounded-full" />
        <div className="h-4 w-48 bg-cream rounded-full" />
        <div className="h-4 w-40 bg-cream rounded-full" />
        <div className="h-4 w-36 bg-cream rounded-full" />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AppointmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCancelModal, setShowCancelModal] = useState(false);

  const { data: appointment, isLoading, isError } = useQuery({
    queryKey: ["appointments", id],
    queryFn: () =>
      api
        .get<AppointmentDetailType>(`/appointments/${id}/`)
        .then((r) => r.data),
    enabled: !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.post(`/appointments/${id}/cancel/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      navigate("/portal/turnos");
    },
  });

  const confirmAttendanceMutation = useMutation({
    mutationFn: () => api.post(`/appointments/${id}/confirm-attendance/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments", id] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });

  if (isLoading) return <LoadingSkeleton />;

  if (isError || !appointment) {
    return (
      <div className="max-w-xl">
        <Link
          to="/portal/turnos"
          className="inline-flex items-center gap-1.5 text-[13px] text-ink3 hover:text-ink transition-colors mb-6"
        >
          <ArrowLeft size={14} />
          Volver a mis turnos
        </Link>
        <div className="bg-surface border border-line rounded-[20px] p-8 text-center shadow-[var(--shadow-soft)]">
          <p className="text-[13px] text-coral font-semibold mb-1">
            No se pudo cargar el turno
          </p>
          <p className="text-[12px] text-ink3">
            Intentá recargar la página. Si el problema persiste, contactanos.
          </p>
        </div>
      </div>
    );
  }

  const isConfirmed = appointment.status === "CONFIRMED";
  const isCancelled = appointment.status === "CANCELLED";

  return (
    <>
      <div className="max-w-xl">
        {/* Back */}
        <Link
          to="/portal/turnos"
          className="inline-flex items-center gap-1.5 text-[13px] text-ink3 hover:text-ink transition-colors mb-6"
        >
          <ArrowLeft size={14} />
          Volver a mis turnos
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <h1 className="font-display text-[28px] font-semibold text-ink">
            Detalle del turno
          </h1>
          <StatusBadge status={appointment.status} />
        </div>

        {/* Main card */}
        <div className="bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] px-5 py-2 mb-4">
          <DetailRow
            icon={CalendarDays}
            label="Fecha"
            value={formatDate(appointment.scheduled_date)}
          />

          <DetailRow icon={Clock} label="Horario">
            <p className="text-[14px] text-ink">
              {formatTime(appointment.start_time)}
              {appointment.end_time
                ? ` — ${formatTime(appointment.end_time)}`
                : ""}
            </p>
          </DetailRow>

          <DetailRow
            icon={Stethoscope}
            label="Servicio"
            value={appointment.service_name}
          />

          <DetailRow icon={User} label="Paciente" value={appointment.patient_name} />

          <DetailRow
            icon={appointment.is_online ? Wifi : MapPin}
            label="Modalidad"
          >
            {appointment.is_online ? (
              <div>
                <p className="text-[14px] text-teal-dark font-medium">Online</p>
                {appointment.meeting_link && isConfirmed && (
                  <a
                    href={appointment.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-teal-dark underline underline-offset-2 mt-1"
                  >
                    <Wifi size={11} />
                    Unirse a la consulta
                  </a>
                )}
              </div>
            ) : (
              <p className="text-[14px] text-ink">{appointment.location_name}</p>
            )}
          </DetailRow>

          {appointment.notes && (
            <DetailRow icon={FileText} label="Notas" value={appointment.notes} />
          )}

          {isCancelled && appointment.cancellation_reason && (
            <DetailRow
              icon={AlertCircle}
              label="Motivo de cancelación"
              value={appointment.cancellation_reason}
              valueClassName="text-coral"
            />
          )}
        </div>

        {/* Actions */}
        {isConfirmed && (
          <div className="flex flex-col gap-3">
            {!appointment.attendance_confirmed && (
              <button
                onClick={() => confirmAttendanceMutation.mutate()}
                disabled={confirmAttendanceMutation.isPending}
                className={cn(
                  "w-full h-11 rounded-[12px] bg-teal-dark text-[13px] font-semibold text-white",
                  "hover:opacity-90 transition-opacity disabled:opacity-50"
                )}
              >
                {confirmAttendanceMutation.isPending
                  ? "Confirmando..."
                  : "Confirmar asistencia"}
              </button>
            )}

            <button
              onClick={() => setShowCancelModal(true)}
              className={cn(
                "w-full h-11 rounded-[12px] border border-coral/40 bg-coral/5 text-[13px] font-semibold text-coral",
                "hover:bg-coral/10 transition-colors"
              )}
            >
              Cancelar turno
            </button>
          </div>
        )}
      </div>

      {/* Cancel modal */}
      {showCancelModal && (
        <CancelModal
          onConfirm={() => cancelMutation.mutate()}
          onCancel={() => setShowCancelModal(false)}
          isPending={cancelMutation.isPending}
        />
      )}
    </>
  );
}
