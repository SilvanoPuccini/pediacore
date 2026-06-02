import { useMemo, useEffect } from "react";
import React from "react";
import { useBookingStore } from "../store/bookingStore";
import { useLocations, useServices, useMyPatients } from "../hooks/useBookingQueries";
import { useBookAppointment } from "../hooks/useBookingMutations";
import { useAuthStore } from "@/stores/auth";
import { formatDisplayDate, formatTime, formatPrice } from "../utils";
import type { BookingRequest } from "@/types/api";

const PRACTICE_ID = 1;
const DOCTOR_ID = 1;

// ─── Detail row ──────────────────────────────────────────────────────────────

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[13px] text-ink2 shrink-0 flex items-center gap-1.5">
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
        <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
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
    callPlatform,
    notes,
    acceptedPolicy,
    acceptedTerms,
    setCallPlatform,
    setNotes,
    setAcceptedPolicy,
    setAcceptedTerms,
    setStep,
    setBookingResult,
  } = useBookingStore();

  const { user } = useAuthStore();

  const { data: locationsResp } = useLocations();
  const { data: servicesResp } = useServices();
  const { data: patientsResp } = useMyPatients();

  const locations = locationsResp?.results ?? [];
  const services = servicesResp?.results ?? [];
  const patients = patientsResp?.results ?? [];

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
    () => patients.find((p) => p.id === patientId) ?? null,
    [patients, patientId]
  );

  const bookingMutation = useBookAppointment();

  // Guard: if critical data is missing, redirect back to the appropriate step
  const hasCriticalData = locationId !== null && serviceId !== null && selectedDate && selectedSlot && patientId;

  useEffect(() => {
    if (!hasCriticalData) {
      // Missing data — go back to step 1 to restart
      setStep(1);
    }
  }, [hasCriticalData, setStep]);

  if (!hasCriticalData) return null;

  const isOnlineBooking = locationId === "online";
  const canConfirm = acceptedPolicy && acceptedTerms && patientId && !bookingMutation.isPending && (!isOnlineBooking || callPlatform);

  function handleConfirmBooking() {
    if (!patientId || !selectedSlot || !selectedDate || !serviceId) return;

    const payload: BookingRequest = {
      practice: PRACTICE_ID,
      patient: patientId,
      service: serviceId,
      location: isOnlineBooking ? null : (locationId as number),
      doctor: DOCTOR_ID,
      scheduled_date: selectedDate,
      start_time: selectedSlot.start_time,
      is_online: isOnlineBooking,
      call_platform: isOnlineBooking ? callPlatform : "",
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
          <DetailRow icon={<svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>} label="Sede" value={selectedLocation?.name ?? ""} />
          <DetailRow icon={<svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>} label="Servicio" value={selectedService?.name ?? ""} />
          <DetailRow
            icon={<svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>}
            label="Fecha"
            value={selectedDate ? formatDisplayDate(selectedDate) : ""}
          />
          <DetailRow
            icon={<svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            label="Hora"
            value={
              selectedSlot
                ? `${formatTime(selectedSlot.start_time)} - ${formatTime(selectedSlot.end_time)}`
                : ""
            }
          />
          <DetailRow
            icon={<svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            label="Duración"
            value={selectedService ? `${selectedService.duration_minutes} minutos` : ""}
          />
          <DetailRow icon={<svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>} label="Paciente" value={selectedPatient?.full_name ?? ""} />
          {isOnlineBooking && callPlatform && (
            <DetailRow
              icon={<svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg>}
              label="Plataforma"
              value={callPlatform === "WHATSAPP" ? "WhatsApp" : "Zoom"}
            />
          )}
          {user && (
            <DetailRow icon={<svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>} label="Tutor" value={user.full_name} />
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

      {/* Call platform selector (online only) */}
      {locationId === "online" && (
        <div>
          <label className="block text-[13px] font-semibold text-ink mb-2">
            ¿Por qué plataforma preferís la consulta?
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setCallPlatform("WHATSAPP")}
              className={[
                "flex items-center gap-2.5 px-4 py-3 rounded-[12px] border text-[14px] font-medium transition-all",
                callPlatform === "WHATSAPP"
                  ? "border-teal bg-teal/5 text-teal-dark ring-2 ring-teal/20"
                  : "border-line bg-surface text-ink2 hover:border-ink3",
              ].join(" ")}
            >
              <svg className="w-5 h-5 text-green-600 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </button>
            <button
              type="button"
              onClick={() => setCallPlatform("ZOOM")}
              className={[
                "flex items-center gap-2.5 px-4 py-3 rounded-[12px] border text-[14px] font-medium transition-all",
                callPlatform === "ZOOM"
                  ? "border-teal bg-teal/5 text-teal-dark ring-2 ring-teal/20"
                  : "border-line bg-surface text-ink2 hover:border-ink3",
              ].join(" ")}
            >
              <svg className="w-5 h-5 text-blue-600 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4.585 15.834a2.59 2.59 0 01-2.586-2.586V7.753a2.59 2.59 0 012.586-2.586h8.167a2.59 2.59 0 012.586 2.586v5.495a2.59 2.59 0 01-2.586 2.586H4.585zM16.862 13.142l4.552 3.135V7.723l-4.552 3.135v2.284z"/>
              </svg>
              Zoom
            </button>
          </div>
          {callPlatform === "WHATSAPP" && (
            <p className="text-[12px] text-ink3 mt-2">
              La doctora te contactará por videollamada de WhatsApp al número registrado.
            </p>
          )}
          {callPlatform === "ZOOM" && (
            <p className="text-[12px] text-ink3 mt-2">
              Recibirás un enlace de Zoom por email después del pago.
            </p>
          )}
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
      <p className="text-[12px] text-ink3 text-center flex items-center justify-center gap-1.5">
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>
        Tarjeta de crédito · Débito · Transferencia
      </p>
    </div>
  );
}
