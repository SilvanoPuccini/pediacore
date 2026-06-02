import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  CalendarDays,
  Clock,
  MapPin,
  CheckCircle2,
  CalendarClock,
  AlertTriangle,
  XCircle,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AvailableSlot } from "@/types/api";
import MiniCalendar from "@/features/booking/components/MiniCalendar";
import TimeSlotGrid from "@/features/booking/components/TimeSlotGrid";
import { useAvailableDays, useSlots } from "@/features/booking/hooks/useBookingQueries";
import { formatTime } from "@/features/booking/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TokenResolveResponse {
  action: string;
  appointment_id: number;
  patient_first_name: string;
  scheduled_date: string;
  start_time: string;
  location_name: string;
  action_available: boolean;
  service_id: number;
  location_id: number | null;
  practice_slug: string;
  is_online: boolean;
}

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

// ─── API calls ────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL ?? "";

class TokenError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function resolveToken(token: string): Promise<TokenResolveResponse> {
  const res = await fetch(`${API_BASE}/appointments/resolve/${token}/`);
  if (res.status === 404) throw new TokenError(404, "Token no encontrado.");
  if (res.status === 410)
    throw new TokenError(410, "Este enlace ya fue utilizado o ha expirado.");
  if (!res.ok) throw new TokenError(res.status, "Ocurrio un error inesperado.");
  return res.json();
}

async function rescheduleViaToken(
  token: string,
  scheduledDate: string,
  startTime: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/appointments/reschedule-via-token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      scheduled_date: scheduledDate,
      start_time: startTime,
    }),
  });
  if (res.status === 404) throw new TokenError(404, "Token no encontrado.");
  if (res.status === 410)
    throw new TokenError(410, "Este enlace ya fue utilizado o ha expirado.");
  if (res.status === 409)
    throw new TokenError(409, "El horario seleccionado ya no esta disponible. Elegi otro.");
  if (!res.ok)
    throw new TokenError(res.status, "Ocurrio un error al procesar el reagendamiento.");
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-teal shrink-0">{icon}</div>
      <div>
        <p className="text-[11px] font-medium text-ink3 uppercase tracking-wide">
          {label}
        </p>
        <p className="text-[14px] font-semibold text-ink">{value}</p>
      </div>
    </div>
  );
}

function ErrorCard({ status, message }: { status: number; message: string }) {
  const is410 = status === 410;
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="bg-surface rounded-[20px] shadow-[var(--shadow-soft)] w-full max-w-md p-8 flex flex-col items-center gap-5 text-center">
        <div
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center",
            is410 ? "bg-amber-50" : "bg-coral/10"
          )}
        >
          {is410 ? (
            <AlertTriangle className="w-7 h-7 text-amber-500" />
          ) : (
            <XCircle className="w-7 h-7 text-coral" />
          )}
        </div>
        <div>
          <h2 className="text-[18px] font-bold text-ink mb-1">
            {is410 ? "Enlace expirado" : "Enlace no valido"}
          </h2>
          <p className="text-[14px] text-ink2 leading-relaxed">{message}</p>
        </div>
        <Link
          to="/"
          className="mt-2 px-5 py-2.5 rounded-[12px] bg-teal text-white text-[13px] font-semibold hover:bg-teal-dark transition-colors"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RescheduleFromToken() {
  const { token } = useParams<{ token: string }>();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [done, setDone] = useState(false);

  // 1. Resolve token
  const {
    data,
    isLoading: resolving,
    error: resolveError,
  } = useQuery<TokenResolveResponse, TokenError>({
    queryKey: ["token-resolve", token],
    queryFn: () => resolveToken(token!),
    enabled: !!token,
    retry: false,
  });

  // 2. Fetch allowed days (working hours)
  const locationForQuery = data
    ? data.is_online
      ? ("online" as const)
      : data.location_id
    : null;

  const { data: allowedDays } = useAvailableDays(
    locationForQuery,
    data?.service_id ?? null
  );

  // 3. Fetch slots for selected date
  const { data: slots, isLoading: loadingSlots } = useSlots({
    locationId: locationForQuery,
    serviceId: data?.service_id ?? null,
    date: selectedDate,
  });

  // 4. Reschedule mutation
  const mutation = useMutation<void, TokenError>({
    mutationFn: () =>
      rescheduleViaToken(token!, selectedDate!, selectedSlot!.start_time),
    onSuccess: () => setDone(true),
  });

  // ── Loading ──
  if (resolving) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal animate-spin" />
      </div>
    );
  }

  // ── Resolve error ──
  if (resolveError) {
    return (
      <ErrorCard status={resolveError.status} message={resolveError.message} />
    );
  }

  if (!data) return null;

  // ── Verify it's a RESCHEDULE token ──
  if (data.action !== "RESCHEDULE") {
    return (
      <ErrorCard status={400} message="Este enlace no es para reagendar." />
    );
  }

  // ── Success state ──
  if (done) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="bg-surface rounded-[20px] shadow-[var(--shadow-soft)] w-full max-w-md p-8 flex flex-col items-center gap-5 text-center">
          <div className="w-14 h-14 rounded-full bg-teal/10 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-teal" />
          </div>
          <div>
            <h2 className="text-[18px] font-bold text-ink mb-1">
              Turno reagendado
            </h2>
            <p className="text-[14px] text-ink2 leading-relaxed">
              La consulta de{" "}
              <span className="font-semibold capitalize">
                {data.patient_first_name}
              </span>{" "}
              fue reagendada para el{" "}
              <strong>{formatDisplayDate(selectedDate!)}</strong> a las{" "}
              <strong>{formatTime(selectedSlot!.start_time)}</strong>. Te
              enviamos un email con los detalles.
            </p>
          </div>
          <Link
            to="/"
            className="mt-2 px-5 py-2.5 rounded-[12px] bg-teal text-white text-[13px] font-semibold hover:bg-teal-dark transition-colors"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    );
  }

  // ── Mutation error ──
  const mutationError = mutation.error;

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md flex flex-col gap-4">
        {/* Back link */}
        <Link
          to={`/a/${token}`}
          className="inline-flex items-center gap-1.5 text-[13px] text-ink3 hover:text-teal transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver
        </Link>

        {/* Header */}
        <div className="text-center mb-2">
          <h1 className="text-[22px] font-bold text-ink">
            Reagendar turno
          </h1>
          <p className="text-[13px] text-ink3 mt-1">
            Elegi una nueva fecha y horario para la consulta de{" "}
            <span className="font-semibold capitalize">
              {data.patient_first_name}
            </span>
          </p>
        </div>

        {/* Current appointment info */}
        <div className="bg-surface rounded-[20px] shadow-[var(--shadow-soft)] p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <CalendarClock className="w-3.5 h-3.5" />
              Turno actual
            </span>
          </div>
          <div className="flex flex-col gap-2.5 text-[13px]">
            <InfoRow
              icon={<CalendarDays className="w-4 h-4" />}
              label="Fecha actual"
              value={formatDisplayDate(data.scheduled_date)}
            />
            <InfoRow
              icon={<Clock className="w-4 h-4" />}
              label="Hora actual"
              value={formatTime(data.start_time)}
            />
            <InfoRow
              icon={<MapPin className="w-4 h-4" />}
              label="Lugar"
              value={data.location_name}
            />
          </div>
        </div>

        {/* Date picker */}
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-semibold text-ink">Nueva fecha</p>
          <MiniCalendar
            selectedDate={selectedDate}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setSelectedSlot(null);
            }}
            allowedDaysOfWeek={allowedDays ?? null}
          />
        </div>

        {/* Time slot picker */}
        {selectedDate && (
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-semibold text-ink">
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
        {mutationError && (
          <div className="bg-coral/10 border border-coral/20 rounded-[12px] px-4 py-3 text-[13px] text-coral font-medium">
            {mutationError.message}
          </div>
        )}

        {/* Confirm button */}
        {selectedSlot && (
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="w-full py-3 rounded-[12px] bg-teal text-white text-[14px] font-semibold hover:bg-teal-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {mutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Confirmar reagendamiento
          </button>
        )}

        {/* Footer */}
        <p className="text-center text-[12px] text-ink3 px-4">
          Tu turno actual se cancelara automaticamente al confirmar el nuevo.
        </p>
      </div>
    </div>
  );
}
