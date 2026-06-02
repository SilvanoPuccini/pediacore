import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  CalendarDays,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  CalendarClock,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type TokenAction = "CONFIRM" | "CANCEL" | "RESCHEDULE";

interface TokenResolveResponse {
  action: TokenAction;
  appointment_id: number;
  patient_first_name: string;
  scheduled_date: string;
  start_time: string;
  location_name: string;
  action_available: boolean;
}

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

// ─── API calls (no auth — AllowAny endpoints) ─────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL ?? "";

async function resolveToken(token: string): Promise<TokenResolveResponse> {
  const res = await fetch(`${API_BASE}/appointments/resolve/${token}/`);
  if (res.status === 404) throw new TokenError(404, "Token no encontrado.");
  if (res.status === 410) throw new TokenError(410, "Este enlace ya fue utilizado o ha expirado.");
  if (!res.ok) throw new TokenError(res.status, "Ocurrió un error inesperado.");
  return res.json();
}

async function executeAction(token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/appointments/action/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (res.status === 404) throw new TokenError(404, "Token no encontrado.");
  if (res.status === 410) throw new TokenError(410, "Este enlace ya fue utilizado o ha expirado.");
  if (!res.ok) throw new TokenError(res.status, "Ocurrió un error al procesar la solicitud.");
}

class TokenError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
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
        <p className="text-[11px] font-medium text-ink3 uppercase tracking-wide">{label}</p>
        <p className="text-[14px] font-semibold text-ink">{value}</p>
      </div>
    </div>
  );
}

function CancelModal({
  patientName,
  onConfirm,
  onClose,
  loading,
}: {
  patientName: string;
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-surface rounded-[20px] shadow-[var(--shadow-soft)] w-full max-w-sm p-6 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-coral/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-coral" />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-ink">¿Cancelar el turno?</h3>
            <p className="text-[13px] text-ink3">
              Se cancelará la consulta de <span className="font-semibold capitalize">{patientName}</span>.
            </p>
          </div>
        </div>

        <p className="text-[13px] text-ink2 leading-relaxed">
          Esta acción no se puede deshacer. Si hay un pago asociado, se procesará el reembolso
          según la política de cancelación del consultorio.
        </p>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-[12px] border border-line text-[13px] font-semibold text-ink2 hover:bg-cream transition-colors disabled:opacity-50"
          >
            Volver
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-[12px] bg-coral text-white text-[13px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Cancelar turno
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Error states ─────────────────────────────────────────────────────────────

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
            {is410 ? "Enlace expirado" : "Enlace no válido"}
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

// ─── Success state ────────────────────────────────────────────────────────────

function SuccessCard({
  action,
  patientName,
}: {
  action: TokenAction;
  patientName: string;
}) {
  const isCancel = action === "CANCEL";
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="bg-surface rounded-[20px] shadow-[var(--shadow-soft)] w-full max-w-md p-8 flex flex-col items-center gap-5 text-center">
        <div
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center",
            isCancel ? "bg-coral/10" : "bg-teal/10"
          )}
        >
          {isCancel ? (
            <XCircle className="w-7 h-7 text-coral" />
          ) : (
            <CheckCircle2 className="w-7 h-7 text-teal" />
          )}
        </div>
        <div>
          <h2 className="text-[18px] font-bold text-ink mb-1">
            {isCancel ? "Turno cancelado" : "¡Asistencia confirmada!"}
          </h2>
          <p className="text-[14px] text-ink2 leading-relaxed">
            {isCancel
              ? `El turno de ${patientName} ha sido cancelado. Si corresponde, el reembolso se procesará en los próximos días.`
              : `Gracias por confirmar. Esperamos ver a ${patientName} en la consulta.`}
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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TokenAction() {
  const { token } = useParams<{ token: string }>();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [actionDone, setActionDone] = useState(false);

  const {
    data,
    isLoading,
    error,
  } = useQuery<TokenResolveResponse, TokenError>({
    queryKey: ["token-resolve", token],
    queryFn: () => resolveToken(token!),
    enabled: !!token,
    retry: false,
  });

  const mutation = useMutation<void, TokenError>({
    mutationFn: () => executeAction(token!),
    onSuccess: () => {
      setShowCancelModal(false);
      setActionDone(true);
    },
  });

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal animate-spin" />
      </div>
    );
  }

  // ── Resolve error ──
  if (error) {
    return <ErrorCard status={error.status} message={error.message} />;
  }

  // ── Action error (after mutation) ──
  if (mutation.error) {
    return (
      <ErrorCard status={mutation.error.status} message={mutation.error.message} />
    );
  }

  if (!data) return null;

  // ── Success state ──
  if (actionDone) {
    return <SuccessCard action={data.action} patientName={data.patient_first_name} />;
  }

  const { action, patient_first_name, scheduled_date, start_time, location_name, action_available } = data;

  // ─── Action config ─────────────────────────────────────────────────────────

  const actionMeta: Record<
    TokenAction,
    { label: string; icon: React.ReactNode; badgeClasses: string; badgeLabel: string }
  > = {
    CONFIRM: {
      label: "Confirmar asistencia",
      icon: <CheckCircle2 className="w-4 h-4" />,
      badgeClasses: "bg-teal/10 text-teal-dark border border-teal/20",
      badgeLabel: "Confirmar turno",
    },
    CANCEL: {
      label: "Cancelar turno",
      icon: <XCircle className="w-4 h-4" />,
      badgeClasses: "bg-coral/10 text-coral border border-coral/20",
      badgeLabel: "Cancelar turno",
    },
    RESCHEDULE: {
      label: "Reagendar",
      icon: <CalendarClock className="w-4 h-4" />,
      badgeClasses: "bg-amber-50 text-amber-700 border border-amber-200",
      badgeLabel: "Reagendar turno",
    },
  };

  const meta = actionMeta[action];

  return (
    <>
      {showCancelModal && (
        <CancelModal
          patientName={patient_first_name}
          onConfirm={() => mutation.mutate()}
          onClose={() => setShowCancelModal(false)}
          loading={mutation.isPending}
        />
      )}

      <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md flex flex-col gap-4">

          {/* Header */}
          <div className="text-center mb-2">
            <p className="text-[13px] text-ink3 font-medium">Consultorio Dra. Estefanía Ortigosa</p>
            <h1 className="text-[22px] font-bold text-ink mt-1">Tu turno</h1>
          </div>

          {/* Appointment card */}
          <div className="bg-surface rounded-[20px] shadow-[var(--shadow-soft)] p-6 flex flex-col gap-5">

            {/* Action badge */}
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold",
                  meta.badgeClasses
                )}
              >
                {meta.icon}
                {meta.badgeLabel}
              </span>
            </div>

            {/* Patient name */}
            <div>
              <p className="text-[12px] text-ink3 uppercase tracking-wide font-medium mb-0.5">Paciente</p>
              <p className="text-[20px] font-bold text-ink capitalize">{patient_first_name}</p>
            </div>

            <div className="h-px bg-line" />

            {/* Details */}
            <div className="flex flex-col gap-4">
              <InfoRow
                icon={<CalendarDays className="w-4 h-4" />}
                label="Fecha"
                value={formatDate(scheduled_date)}
              />
              <InfoRow
                icon={<Clock className="w-4 h-4" />}
                label="Hora"
                value={formatTime(start_time)}
              />
              <InfoRow
                icon={<MapPin className="w-4 h-4" />}
                label="Lugar"
                value={location_name}
              />
            </div>

            {/* Action area */}
            {action_available ? (
              <div className="pt-2">
                {action === "CONFIRM" && (
                  <button
                    onClick={() => mutation.mutate()}
                    disabled={mutation.isPending}
                    className="w-full py-3 rounded-[12px] bg-teal text-white text-[13px] font-semibold hover:bg-teal-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {mutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    Confirmar asistencia
                  </button>
                )}

                {action === "CANCEL" && (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    disabled={mutation.isPending}
                    className="w-full py-3 rounded-[12px] bg-coral text-white text-[13px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Cancelar turno
                  </button>
                )}
              </div>
            ) : action === "RESCHEDULE" ? (
              <div className="pt-2 flex flex-col gap-3">
                <p className="text-[13px] text-ink2 leading-relaxed">
                  Elegí una nueva fecha y horario para tu consulta. Tu turno actual
                  se cancelará automáticamente al confirmar el nuevo.
                </p>
                <Link
                  to={`/a/${token}/reschedule`}
                  className="w-full py-3 rounded-[12px] bg-teal text-white text-[13px] font-semibold hover:bg-teal-dark transition-colors flex items-center justify-center gap-2"
                >
                  <CalendarClock className="w-4 h-4" />
                  Elegir nueva fecha
                </Link>
              </div>
            ) : (
              <p className="text-[13px] text-ink3 text-center pt-2">
                Esta acción ya no está disponible.
              </p>
            )}
          </div>

          {/* Footer note */}
          <p className="text-center text-[12px] text-ink3 px-4">
            ¿Necesitás ayuda? Escribinos a{" "}
            <a
              href="mailto:contacto@estefipediatra.com"
              className="text-teal font-medium hover:underline"
            >
              contacto@estefipediatra.com
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
