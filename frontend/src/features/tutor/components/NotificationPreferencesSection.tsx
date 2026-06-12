import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  DEFAULT_PREFERENCES,
} from "@/features/tutor/hooks/useNotificationPreferences";
import type { NotificationPreference } from "@/types/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type PrefKey = keyof Omit<NotificationPreference, "id" | "created_at" | "updated_at">;

interface ToggleConfig {
  key: PrefKey;
  label: string;
  description: string;
}

// ─── Toggle configs ───────────────────────────────────────────────────────────

const TOGGLES: ToggleConfig[] = [
  {
    key: "email_appointment_reminder",
    label: "Recordatorios de turnos",
    description: "Recibí un email antes de tu turno como recordatorio.",
  },
  {
    key: "email_appointment_confirmed",
    label: "Confirmación de reserva",
    description: "Notificaciones cuando un turno queda confirmado.",
  },
  {
    key: "email_appointment_cancelled",
    label: "Cancelaciones",
    description: "Avisos cuando un turno es cancelado o modificado.",
  },
  {
    key: "email_waitlist_available",
    label: "Lista de espera",
    description: "Te avisamos cuando se libera un turno que estabas esperando.",
  },
  {
    key: "email_payment_received",
    label: "Pagos confirmados",
    description: "Recibís un email cada vez que se procesa un pago.",
  },
  {
    key: "email_blog_posts",
    label: "Notas del blog",
    description: "Tips de pediatría escritos por la Dra. Estefi.",
  },
];

// ─── Toggle switch ────────────────────────────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
  disabled,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  id: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      id={id}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent",
        "transition-colors focus:outline-none focus:ring-2 focus:ring-teal/30 focus:ring-offset-1",
        checked ? "bg-teal-dark" : "bg-line",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 rounded-full bg-white shadow-sm",
          "transition-transform",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NotificationPreferencesSection() {
  const { data: prefs, isLoading, isError } = useNotificationPreferences();
  const mutation = useUpdateNotificationPreferences();

  const current = prefs ?? DEFAULT_PREFERENCES;

  function handleToggle(key: PrefKey, value: boolean) {
    mutation.mutate({ [key]: value });
  }

  if (isLoading) {
    return (
      <div className="bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] p-8 mt-8">
        <div className="h-5 w-48 bg-cream rounded-full mb-6 animate-pulse" />
        <div className="space-y-4">
          {TOGGLES.map((t) => (
            <div key={t.key} className="flex items-start justify-between gap-4 py-3 border-b border-line last:border-0 animate-pulse">
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-40 bg-cream rounded-full" />
                <div className="h-3 w-56 bg-cream rounded-full" />
              </div>
              <div className="h-6 w-11 rounded-full bg-cream shrink-0" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] p-8 mt-8">
      {/* Section header */}
      <div className="mb-6 pb-6 border-b border-line">
        <p className="text-[16px] font-semibold text-ink leading-tight">
          Preferencias de notificaciones
        </p>
        <p className="text-[13px] text-ink3 mt-0.5">
          Elegí qué emails querés recibir de parte de la consulta.
        </p>
      </div>

      {/* Error banner */}
      {(isError || mutation.isError) && (
        <div className="flex items-center gap-2.5 bg-coral/10 border border-coral/30 text-coral rounded-[12px] px-4 py-3 mb-6 text-[13px] font-medium">
          <AlertCircle size={16} className="shrink-0" />
          {isError
            ? "No se pudieron cargar tus preferencias. Mostrando valores por defecto."
            : "No se pudo guardar el cambio. Intentá de nuevo."}
        </div>
      )}

      {/* Toggles */}
      <div className="divide-y divide-line">
        {TOGGLES.map((toggle) => {
          const value = (current as Record<string, boolean>)[toggle.key] ?? true;
          const toggleId = `pref-${toggle.key}`;
          return (
            <div key={toggle.key} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
              <label htmlFor={toggleId} className="flex-1 cursor-pointer">
                <p className="text-[14px] font-semibold text-ink">{toggle.label}</p>
                <p className="text-[12px] text-ink3 mt-0.5">{toggle.description}</p>
              </label>
              <ToggleSwitch
                id={toggleId}
                checked={value}
                onChange={(v) => handleToggle(toggle.key, v)}
                disabled={mutation.isPending}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
