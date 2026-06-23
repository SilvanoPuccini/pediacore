import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Clock,
  MapPin,
  CheckCircle2,
  CalendarClock,
  Loader2,
  ArrowLeft,
  Video,
  Stethoscope,
} from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import type { AppointmentDetail, AvailableSlot } from "@/types/api";
import MiniCalendar from "@/features/booking/components/MiniCalendar";
import TimeSlotGrid from "@/features/booking/components/TimeSlotGrid";
import { useAvailableDays, useSlots } from "@/features/booking/hooks/useBookingQueries";
import { Avatar } from "@/features/tutor/components/portal-ui";

// ─── Date helpers ─────────────────────────────────────────────────────────────

const DATE_FORMATTER = new Intl.DateTimeFormat("es-CL", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Santiago",
});

function formatDisplayDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  const formatted = DATE_FORMATTER.format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function formatTime(t: string): string {
  return t.slice(0, 5);
}

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-teal shrink-0">{icon}</div>
      <div>
        <p className="text-[11px] font-medium text-ink3 uppercase tracking-wide">{label}</p>
        <p className="text-[14px] font-semibold text-ink">{value}</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RescheduleAppointment() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [done, setDone] = useState(false);

  // Fetch appointment details
  const { data: appointment, isLoading, isError } = useQuery({
    queryKey: ["appointments", id],
    queryFn: () =>
      api.get<AppointmentDetail>(`/appointments/${id}/`).then((r) => r.data),
    enabled: !!id,
  });

  // Determine location for slot queries
  const locationForQuery = appointment
    ? appointment.is_online
      ? ("online" as const)
      : appointment.location
    : null;

  // Fetch available days
  const { data: allowedDays } = useAvailableDays(
    locationForQuery,
    appointment?.service ?? null
  );

  // Fetch slots for selected date
  const { data: slots, isLoading: loadingSlots } = useSlots({
    locationId: locationForQuery,
    serviceId: appointment?.service ?? null,
    date: selectedDate,
  });

  // Reschedule mutation
  const mutation = useMutation({
    mutationFn: () =>
      api.post(`/appointments/${id}/reschedule/`, {
        scheduled_date: selectedDate,
        start_time: selectedSlot!.start_time,
      }),
    onSuccess: () => {
      setDone(true);
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["appointments-count"] });
      queryClient.invalidateQueries({ queryKey: ["appointments", "dashboard-upcoming"] });
    },
  });

  // Loading
  if (isLoading) {
    return (
      <div className="max-w-md mx-auto flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-teal animate-spin" />
      </div>
    );
  }

  // Error
  if (isError || !appointment) {
    return (
      <div className="max-w-md mx-auto">
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
            Intentá recargar la página.
          </p>
        </div>
      </div>
    );
  }

  // Can't reschedule cancelled/completed appointments
  const canReschedule = ["CONFIRMED", "HOLD", "PENDING"].includes(appointment.status);

  // Can't reschedule less than 12 hours before appointment
  const tooLate = (() => {
    if (!canReschedule) return false;
    const [y, m, d] = appointment.scheduled_date.split("-").map(Number);
    const [hh, mm] = appointment.start_time.split(":").map(Number);
    const apptMs = new Date(y, m - 1, d, hh, mm).getTime();
    return (apptMs - Date.now()) / 3_600_000 < 12;
  })();

  if (!canReschedule || tooLate) {
    return (
      <div className="max-w-md mx-auto">
        <Link
          to={`/portal/turnos/${id}`}
          className="inline-flex items-center gap-1.5 text-[13px] text-ink3 hover:text-ink transition-colors mb-6"
        >
          <ArrowLeft size={14} />
          Volver al detalle
        </Link>
        <div className="bg-surface border border-line rounded-[20px] p-8 text-center shadow-[var(--shadow-soft)]">
          <p className="text-[13px] text-ink font-semibold mb-1">
            Este turno no se puede reagendar
          </p>
          <p className="text-[12px] text-ink3">
            {tooLate
              ? "No se puede reagendar con menos de 12 horas de anticipación. Si necesitás cancelar, podés hacerlo pero se aplica la política de cancelación."
              : "Solo se pueden reagendar turnos confirmados o pendientes."}
          </p>
        </div>
      </div>
    );
  }

  // Success
  if (done) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-surface rounded-[20px] shadow-[var(--shadow-soft)] border border-line p-8 flex flex-col items-center gap-5 text-center">
          <div className="w-14 h-14 rounded-full bg-teal/10 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-teal" />
          </div>
          <div>
            <h2 className="text-[18px] font-bold text-ink mb-1">
              Turno reagendado
            </h2>
            <p className="text-[14px] text-ink2 leading-relaxed">
              La consulta de{" "}
              <span className="font-semibold">{appointment.patient_name}</span>{" "}
              fue reagendada para el{" "}
              <strong>{formatDisplayDate(selectedDate!)}</strong> a las{" "}
              <strong>{formatTime(selectedSlot!.start_time)}</strong>.
            </p>
          </div>
          <button
            onClick={() => navigate("/portal/turnos")}
            className="px-5 py-2.5 rounded-[12px] bg-teal-dark text-white text-[13px] font-semibold hover:opacity-90 transition-opacity"
          >
            Volver a mis turnos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      {/* Back */}
      <Link
        to={`/portal/turnos/${id}`}
        className="inline-flex items-center gap-1.5 text-[13px] text-ink3 hover:text-ink transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Volver al detalle
      </Link>

      <h1 className="font-display text-[24px] font-semibold text-ink mb-2">
        Reagendar turno
      </h1>
      <p className="text-[13px] text-ink3 mb-5">
        Elegí una nueva fecha y horario para la consulta.
      </p>

      {/* Current appointment info */}
      <div className="bg-surface rounded-[16px] shadow-[var(--shadow-soft)] border border-line p-5 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <span className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold",
            "bg-amber-50 text-amber-700 border border-amber-200"
          )}>
            <CalendarClock className="w-3.5 h-3.5" />
            Turno actual
          </span>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <Avatar name={appointment.patient_name} childIndex={0} size={32} />
          <div>
            <p className="text-[13.5px] font-semibold text-ink">{appointment.patient_name}</p>
            <p className="text-[11.5px] text-ink3 flex items-center gap-1">
              <Stethoscope size={11} />
              {appointment.service_name}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <InfoRow
            icon={<CalendarDays className="w-4 h-4" />}
            label="Fecha actual"
            value={formatDisplayDate(appointment.scheduled_date)}
          />
          <InfoRow
            icon={<Clock className="w-4 h-4" />}
            label="Hora actual"
            value={formatTime(appointment.start_time)}
          />
          <InfoRow
            icon={appointment.is_online ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
            label="Modalidad"
            value={appointment.is_online ? "Online" : (appointment.location_name ?? "Presencial")}
          />
        </div>
      </div>

      {/* Date picker */}
      <div className="mb-4">
        <p className="text-[13px] font-semibold text-ink mb-2">Nueva fecha</p>
        <MiniCalendar
          selectedDate={selectedDate}
          onSelectDate={(date) => {
            setSelectedDate(date);
            setSelectedSlot(null);
          }}
          allowedDaysOfWeek={allowedDays ?? null}
        />
      </div>

      {/* Time slots */}
      {selectedDate && (
        <div className="mb-4">
          <p className="text-[13px] font-semibold text-ink mb-2">
            Horarios disponibles — {formatDisplayDate(selectedDate)}
          </p>
          <TimeSlotGrid
            slots={slots}
            isLoading={loadingSlots}
            selectedSlot={selectedSlot}
            onSelect={setSelectedSlot}
          />
        </div>
      )}

      {/* Mutation error */}
      {mutation.error && (
        <div className="bg-coral/10 border border-coral/20 rounded-[12px] px-4 py-3 mb-4 text-[13px] text-coral font-medium">
          {(mutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail
            ?? "No se pudo reagendar. Intentá de nuevo."}
        </div>
      )}

      {/* Confirm */}
      {selectedSlot && (
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="w-full py-3 rounded-[12px] bg-teal-dark text-white text-[14px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 mb-3"
        >
          {mutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          Confirmar reagendamiento
        </button>
      )}

      <p className="text-center text-[12px] text-ink3 px-4">
        Tu turno actual se cancelará automáticamente al confirmar el nuevo.
      </p>
    </div>
  );
}
