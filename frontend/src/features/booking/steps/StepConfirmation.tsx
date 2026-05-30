import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useBookingStore } from "../store/bookingStore";
import { useLocations, useServices, useMyPatients } from "../hooks/useBookingQueries";
import { useBookAppointment } from "../hooks/useBookingMutations";
import PatientSelector from "../components/PatientSelector";
import HoldCountdown from "../components/HoldCountdown";
import { useAuthStore } from "@/stores/auth";
import { formatDisplayDate, formatTime, formatPrice } from "../utils";
import type { BookingRequest } from "@/types/api";

// ─── Constants ─────────────────────────────────────────────────────────────────

const PRACTICE_ID = 1;
const DOCTOR_ID = 1;

// ─── Detail row helper ──────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[13px] text-ink2 shrink-0">{label}</span>
      <span className="text-[13px] font-semibold text-ink text-right">{value}</span>
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function StepConfirmation() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const {
    locationId,
    serviceId,
    selectedDate,
    selectedSlot,
    patientId,
    notes,
    setPatient,
    setNotes,
    setStep,
    setBookingResult,
    checkoutUrl,
    holdExpiresAt,
  } = useBookingStore();

  const { data: locationsResp } = useLocations();
  const { data: servicesResp } = useServices();

  const locations = locationsResp?.results ?? [];
  const services = servicesResp?.results ?? [];

  const selectedLocation =
    locationId === "online"
      ? { id: "online" as const, name: "Consulta Online", address: "Videollamada", city: "" }
      : locations.find((l) => l.id === locationId) ?? null;

  const selectedService = services.find((s) => s.id === serviceId) ?? null;

  const { data: patients, isLoading: patientsLoading } = useMyPatients({
    enabled: isAuthenticated,
  });

  const bookingMutation = useBookAppointment();

  const saveBookingState = useCallback(() => {
    // bookingStore already persists locationId, serviceId, step via localStorage
  }, []);

  function handleAuthRedirect(path: string) {
    saveBookingState();
    navigate(path);
  }

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
      },
    });
  }

  // ── Hold countdown screen (after successful booking) ──────────────────────────

  if (bookingMutation.isSuccess && checkoutUrl && holdExpiresAt) {
    return (
      <HoldCountdown
        holdExpiresAt={holdExpiresAt}
        checkoutUrl={checkoutUrl}
      />
    );
  }

  // ── Error helper ─────────────────────────────────────────────────────────────

  function getErrorMessage(): string {
    if (!bookingMutation.isError) return "";
    const err = bookingMutation.error as { response?: { status?: number; data?: Record<string, unknown> } };
    const status = err?.response?.status;
    if (status === 409) {
      return "El horario seleccionado ya no está disponible. Volvé atrás y elegí otro horario.";
    }
    if (status === 401) {
      return "Tu sesión expiró. Por favor, iniciá sesión de nuevo.";
    }
    const data = err?.response?.data;
    if (data && typeof data === "object") {
      const msgs = Object.values(data).flat().filter(Boolean);
      if (msgs.length > 0) return msgs.join(" ");
    }
    return "No se pudo confirmar el turno. Intentá de nuevo o contactanos por teléfono.";
  }

  // ── Main step 3 layout ────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => setStep(2)}
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
          <DetailRow label="Sede" value={selectedLocation?.name ?? ""} />
          <DetailRow label="Servicio" value={selectedService?.name ?? ""} />
          <DetailRow
            label="Fecha"
            value={selectedDate ? formatDisplayDate(selectedDate) : ""}
          />
          <DetailRow
            label="Hora"
            value={selectedSlot ? formatTime(selectedSlot.start_time) : ""}
          />
          <DetailRow
            label="Precio"
            value={selectedService ? formatPrice(selectedService.price_clp) : ""}
          />
        </div>
      </div>

      {/* Auth gate */}
      {!isAuthenticated ? (
        <div className="bg-cream rounded-[16px] px-6 py-5">
          <p className="text-[14px] text-ink font-semibold mb-1">
            Iniciá sesión para confirmar tu reserva
          </p>
          <p className="text-[13px] text-ink2 mb-4">
            Necesitás una cuenta para reservar turnos.
          </p>
          <button
            onClick={() => handleAuthRedirect("/login?redirect=/booking")}
            className="inline-block bg-teal-dark text-white rounded-[12px] px-5 py-2.5 font-semibold text-[13px] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-cta)]"
          >
            Iniciar sesión
          </button>
          <span className="text-[13px] text-ink2 mx-3">o</span>
          <button
            onClick={() => handleAuthRedirect("/register?redirect=/booking")}
            className="inline text-[13px] font-semibold text-teal-dark hover:underline"
          >
            Crear cuenta
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Patient selector */}
          {user?.role === "TUTOR" && (
            <div>
              <label className="block text-[13px] font-semibold text-ink mb-1.5">
                Paciente
              </label>
              <PatientSelector
                patients={patients}
                isLoading={patientsLoading}
                selectedPatientId={patientId}
                onSelect={setPatient}
              />
            </div>
          )}

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
            disabled={
              bookingMutation.isPending ||
              (user?.role === "TUTOR" && !patientId)
            }
            className="w-full bg-teal-dark text-white rounded-[12px] px-6 py-3 font-semibold text-[14px] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-cta)] disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
          >
            {bookingMutation.isPending ? "Confirmando..." : "Confirmar reserva"}
          </button>
        </div>
      )}
    </div>
  );
}
