import { useMemo, useEffect } from "react";
import React from "react";
import { ArrowLeft, MapPin, Stethoscope, CalendarDays, Clock, Timer, Baby, UserCircle, Video, ScrollText } from "lucide-react";
import { useBookingStore } from "../store/bookingStore";
import { useLocations, useServices, useMyPatients, usePractice } from "../hooks/useBookingQueries";
import { useBookAppointment } from "../hooks/useBookingMutations";
import { useAuthStore } from "@/stores/auth";
import { formatDisplayDate, formatTime, formatPrice } from "../utils";
import PaymentMethodSelector from "../components/PaymentMethodSelector";
import type { BookingRequest } from "@/types/api";

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
        <ScrollText size={16} className="text-amber-600 shrink-0" />
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
    paymentMethod,
    setCallPlatform,
    setNotes,
    setAcceptedPolicy,
    setAcceptedTerms,
    setPaymentMethod,
    setStep,
    setBookingResult,
  } = useBookingStore();

  const { user } = useAuthStore();

  const { data: practice, isLoading: practiceLoading } = usePractice();
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

  if (!hasCriticalData || practiceLoading) return null;

  const isOnlineBooking = locationId === "online";
  const canConfirm = acceptedPolicy && acceptedTerms && patientId && !bookingMutation.isPending && !practiceLoading && practice?.id && (!isOnlineBooking || callPlatform);

  function handleConfirmBooking() {
    if (!patientId || !selectedSlot || !selectedDate || !serviceId || !practice?.id) return;

    const payload: BookingRequest = {
      practice: practice.id,
      patient: patientId,
      service: serviceId,
      location: isOnlineBooking ? null : (locationId as number),
      doctor: practice.owner_id,
      scheduled_date: selectedDate,
      start_time: selectedSlot.start_time,
      is_online: isOnlineBooking,
      call_platform: isOnlineBooking ? callPlatform : "",
      notes,
      payment_method: paymentMethod,
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
        <ArrowLeft size={16} className="text-ink2" />
        Volver
      </button>

      {/* Summary card */}
      <div className="bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] p-6">
        <h2 className="font-display text-[20px] font-semibold text-ink mb-4">
          Resumen de tu turno
        </h2>
        <div className="space-y-3">
          <DetailRow icon={<MapPin size={16} className="shrink-0 text-teal-dark" />} label="Sede" value={selectedLocation?.name ?? ""} />
          <DetailRow icon={<Stethoscope size={16} className="shrink-0 text-teal-dark" />} label="Servicio" value={selectedService?.name ?? ""} />
          <DetailRow
            icon={<CalendarDays size={16} className="shrink-0 text-teal-dark" />}
            label="Fecha"
            value={selectedDate ? formatDisplayDate(selectedDate) : ""}
          />
          <DetailRow
            icon={<Clock size={16} className="shrink-0 text-teal-dark" />}
            label="Hora"
            value={
              selectedSlot
                ? `${formatTime(selectedSlot.start_time)} - ${formatTime(selectedSlot.end_time)}`
                : ""
            }
          />
          <DetailRow
            icon={<Timer size={16} className="shrink-0 text-teal-dark" />}
            label="Duración"
            value={selectedService ? `${selectedService.duration_minutes} minutos` : ""}
          />
          <DetailRow icon={<Baby size={16} className="shrink-0 text-teal-dark" />} label="Paciente" value={selectedPatient?.full_name ?? ""} />
          {isOnlineBooking && callPlatform && (
            <DetailRow
              icon={<Video size={16} className="shrink-0 text-teal-dark" />}
              label="Plataforma"
              value={callPlatform === "WHATSAPP" ? "WhatsApp" : "Zoom"}
            />
          )}
          {user && (
            <DetailRow icon={<UserCircle size={16} className="shrink-0 text-teal-dark" />} label="Tutor" value={user.full_name} />
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

      {/* Payment method selector */}
      <PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} />

      {/* Confirm button */}
      <button
        onClick={handleConfirmBooking}
        disabled={!canConfirm}
        className="w-full bg-teal-dark text-white rounded-[12px] px-6 py-3.5 font-semibold text-[15px] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-cta)] disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
      >
        {bookingMutation.isPending ? (
          "Confirmando..."
        ) : paymentMethod === "TRANSFER" ? (
          <>
            Reservar y pagar por transferencia
          </>
        ) : (
          <>
            Pagar {selectedService ? formatPrice(selectedService.price_clp) : ""} con MercadoPago
          </>
        )}
      </button>
    </div>
  );
}
