import { useMemo } from "react";
import { useBookingStore } from "../store/bookingStore";
import { useLocations, useServices, useMyPatients } from "../hooks/useBookingQueries";
import { useBookAppointment } from "../hooks/useBookingMutations";
import { useAuthStore } from "@/stores/auth";
import { formatDisplayDate, formatTime, formatPrice } from "../utils";
import type { BookingRequest } from "@/types/api";

const PRACTICE_ID = 1;
const DOCTOR_ID = 1;

// ─── Detail row ──────────────────────────────────────────────────────────────

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[13px] text-ink2 shrink-0">
        {icon} {label}
      </span>
      <span className="text-[13px] font-semibold text-ink text-right">{value}</span>
    </div>
  );
}

// ─── Cancellation policy ─────────────────────────────────────────────────────

function CancellationPolicy() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-[16px] p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[16px]">📋</span>
        <h3 className="font-semibold text-[14px] text-ink">Política de cancelación</h3>
      </div>
      <ul className="space-y-2 text-[13px] text-ink2">
        <li className="flex items-start gap-2">
          <span className="text-green-600 font-semibold shrink-0">Más de 24h:</span>
          <span>Reembolso 100%</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-amber-600 font-semibold shrink-0">Entre 12 y 24h:</span>
          <span>Reembolso 50%</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-red-600 font-semibold shrink-0">Menos de 12h:</span>
          <span>Sin reembolso</span>
        </li>
      </ul>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function StepSummary() {
  const {
    locationId,
    serviceId,
    selectedDate,
    selectedSlot,
    patientId,
    notes,
    acceptedPolicy,
    acceptedTerms,
    setNotes,
    setAcceptedPolicy,
    setAcceptedTerms,
    setStep,
    setBookingResult,
  } = useBookingStore();

  const { user } = useAuthStore();

  const { data: locationsResp } = useLocations();
  const { data: servicesResp } = useServices();
  const { data: patients } = useMyPatients();

  const locations = locationsResp?.results ?? [];
  const services = servicesResp?.results ?? [];

  const selectedLocation = useMemo(
    () =>
      locationId === "online"
        ? { id: "online" as const, name: "Atención Online", address: "Videollamada", city: "" }
        : locations.find((l) => l.id === locationId) ?? null,
    [locations, locationId]
  );

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId) ?? null,
    [services, serviceId]
  );

  const selectedPatient = useMemo(
    () => patients?.find((p) => p.id === patientId) ?? null,
    [patients, patientId]
  );

  const bookingMutation = useBookAppointment();

  const canConfirm = acceptedPolicy && acceptedTerms && patientId && !bookingMutation.isPending;

  function handleConfirmBooking() {
    if (!patientId || !selectedSlot || !selectedDate || !serviceId) return;

    const isOnline = locationId === "online";

    const payload: BookingRequest = {
      practice: PRACTICE_ID,
      patient: patientId,
      service: serviceId,
      location: isOnline ? null : (locationId as number),
      doctor: DOCTOR_ID,
      scheduled_date: selectedDate,
      start_time: selectedSlot.start_time,
      is_online: isOnline,
      notes,
    };

    bookingMutation.mutate(payload, {
      onSuccess: (result) => {
        setBookingResult(result);
        setStep(8);
      },
    });
  }

  function getErrorMessage(): string {
    if (!bookingMutation.isError) return "";
    const err = bookingMutation.error as { response?: { status?: number; data?: Record<string, unknown> } };
    const status = err?.response?.status;
    if (status === 409) return "El horario seleccionado ya no está disponible. Volvé atrás y elegí otro horario.";
    if (status === 401) return "Tu sesión expiró. Por favor, iniciá sesión de nuevo.";
    const data = err?.response?.data;
    if (data && typeof data === "object") {
      const msgs = Object.values(data).flat().filter(Boolean);
      if (msgs.length > 0) return msgs.join(" ");
    }
    return "No se pudo confirmar el turno. Intentá de nuevo o contactanos por teléfono.";
  }

  return (
    <div className="space-y-6">
      {/* Volver */}
      <button
        onClick={() => setStep(5)}
        className="flex items-center gap-1.5 text-[13px] text-ink2 hover:text-ink transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Volver
      </button>

      {/* Summary card */}
      <div className="bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] p-6">
        <h2 className="font-display text-[20px] font-semibold text-ink mb-4">
          Resumen de tu turno
        </h2>
        <div className="space-y-3">
          <DetailRow icon="📍" label="Sede" value={selectedLocation?.name ?? ""} />
          <DetailRow icon="🩺" label="Servicio" value={selectedService?.name ?? ""} />
          <DetailRow
            icon="📅"
            label="Fecha"
            value={selectedDate ? formatDisplayDate(selectedDate) : ""}
          />
          <DetailRow
            icon="⏰"
            label="Hora"
            value={
              selectedSlot
                ? `${formatTime(selectedSlot.start_time)} - ${formatTime(selectedSlot.end_time)}`
                : ""
            }
          />
          <DetailRow icon="👶" label="Paciente" value={selectedPatient?.full_name ?? ""} />
          {user && (
            <DetailRow icon="👤" label="Tutor" value={user.full_name} />
          )}
          <div className="border-t border-line pt-3 mt-3">
            <div className="flex items-start justify-between gap-4">
              <span className="text-[14px] font-semibold text-ink">Total a pagar</span>
              <span className="text-[16px] font-bold text-teal-dark">
                {selectedService ? formatPrice(selectedService.price_clp) : ""}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-[13px] font-semibold text-ink mb-1.5">
          Notas (opcional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Contanos el motivo de la consulta o cualquier detalle relevante..."
          className="w-full px-4 py-3 rounded-[12px] border border-line bg-bg text-ink text-[14px] resize-none focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
        />
      </div>

      {/* Cancellation policy */}
      <CancellationPolicy />

      {/* Checkboxes */}
      <div className="space-y-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={acceptedPolicy}
            onChange={(e) => setAcceptedPolicy(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-line text-teal focus:ring-teal/30"
          />
          <span className="text-[13px] text-ink2">
            Acepto los{" "}
            <a href="/terms" target="_blank" className="font-semibold text-teal-dark hover:underline">
              términos y condiciones
            </a>
          </span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-line text-teal focus:ring-teal/30"
          />
          <span className="text-[13px] text-ink2">
            Acepto la{" "}
            <a href="/privacy" target="_blank" className="font-semibold text-teal-dark hover:underline">
              política de privacidad
            </a>
          </span>
        </label>
      </div>

      {/* Error */}
      {bookingMutation.isError && (
        <div className="bg-coral/10 border border-coral/30 rounded-[12px] px-4 py-3">
          <p className="text-[13px] text-ink font-semibold">
            No se pudo confirmar el turno
          </p>
          <p className="text-[12px] text-ink2 mt-0.5">{getErrorMessage()}</p>
        </div>
      )}

      {/* Confirm button */}
      <button
        onClick={handleConfirmBooking}
        disabled={!canConfirm}
        className="w-full bg-teal-dark text-white rounded-[12px] px-6 py-3.5 font-semibold text-[15px] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-cta)] disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
      >
        {bookingMutation.isPending ? (
          "Confirmando..."
        ) : (
          <>
            Pagar {selectedService ? formatPrice(selectedService.price_clp) : ""} con MercadoPago
          </>
        )}
      </button>
      <p className="text-[12px] text-ink3 text-center">
        💳 Tarjeta de crédito · Débito · Transferencia
      </p>
    </div>
  );
}
