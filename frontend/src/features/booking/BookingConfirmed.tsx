import { useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MapPin, CalendarDays, Baby, CheckCircle2, ClipboardEdit, Clock, X } from "lucide-react";
import SEOHead from "@/components/seo/SEOHead";
import api from "@/lib/api";
import { useBookingStore } from "./store/bookingStore";
import { useLocations, useServices, useMyPatients } from "./hooks/useBookingQueries";
import { formatDisplayDate, formatTime } from "./utils";
import type { Appointment } from "@/types/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function BookingConfirmed() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const {
    locationId,
    serviceId,
    selectedDate,
    selectedSlot,
    patientId,
    appointmentId: storeAppointmentId,
    reset,
  } = useBookingStore();

  // MercadoPago redirect params
  const mpStatus = searchParams.get("collection_status") ?? searchParams.get("status");
  const isFromMP = !!searchParams.get("payment_id") || !!searchParams.get("collection_id");

  // Try URL appointment_id first (MP redirect), fall back to store
  const appointmentIdFromUrl = searchParams.get("appointment_id");
  const effectiveAppointmentId = appointmentIdFromUrl
    ? Number(appointmentIdFromUrl)
    : storeAppointmentId;

  const { data: locationsResp } = useLocations();
  const { data: servicesResp } = useServices();
  const { data: patientsResp } = useMyPatients();

  const locations = locationsResp?.results ?? [];
  const services = servicesResp?.results ?? [];
  const patients = patientsResp?.results ?? [];

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId) ?? null,
    [services, serviceId]
  );

  const selectedLocation = useMemo(
    () =>
      locationId === "online"
        ? { name: "Atención Online", address: "Videollamada por Google Meet", city: "" }
        : locations.find((l) => l.id === locationId) ?? null,
    [locations, locationId]
  );

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === patientId) ?? null,
    [patients, patientId]
  );

  // Fallback: fetch appointment from API if store is empty (e.g. fresh page load after MP redirect)
  const { data: appointmentData } = useQuery({
    queryKey: ["appointment-confirmed", effectiveAppointmentId],
    queryFn: () =>
      api.get<Appointment>(`/appointments/${effectiveAppointmentId}/`).then((r) => r.data),
    enabled: !!effectiveAppointmentId && !selectedDate,
  });

  const displayDate = selectedDate ?? appointmentData?.scheduled_date ?? null;
  const displaySlot = selectedSlot ?? (appointmentData ? { start_time: appointmentData.start_time, end_time: appointmentData.end_time ?? "" } : null);
  const displayPatient = selectedPatient ?? (appointmentData ? { full_name: appointmentData.patient_name, first_name: appointmentData.patient_name?.split(" ")[0] ?? "" } : null);
  const displayLocation = selectedLocation ?? (appointmentData ? { name: appointmentData.location_name } : null);

  // Scroll to top + invalidate appointments cache on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    queryClient.invalidateQueries({ queryKey: ["appointments"] });
  }, [queryClient]);

  // If no appointment AND not coming from MercadoPago, redirect to booking
  useEffect(() => {
    if (!effectiveAppointmentId && !isFromMP && !selectedDate && !appointmentIdFromUrl) {
      navigate("/booking");
    }
  }, [effectiveAppointmentId, isFromMP, selectedDate, appointmentIdFromUrl, navigate]);

  const isApproved = !mpStatus || mpStatus === "approved";
  const isPending = mpStatus === "pending" || mpStatus === "in_process";
  const isFailed = mpStatus && !isApproved && !isPending;

  function handleNewBooking() {
    reset();
    navigate("/booking");
  }

  function getCalendarUrl(): string {
    if (!displayDate || !displaySlot?.start_time) return "#";
    const [y, m, d] = displayDate.split("-");
    const [sh, sm] = displaySlot.start_time.split(":");
    const endTime = displaySlot.end_time || displaySlot.start_time;
    const [eh, em] = endTime.split(":");
    const start = `${y}${m}${d}T${sh}${sm}00`;
    const end = `${y}${m}${d}T${eh}${em}00`;
    const title = encodeURIComponent(`Pediatra - ${selectedService?.name ?? "Consulta"}`);
    const location = encodeURIComponent(displayLocation?.name ?? "");
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&location=${location}`;
  }

  // Failed payment
  if (isFailed) {
    return (
    <div className="max-w-[560px] mx-auto px-4 pt-[110px] pb-12">
        <SEOHead title="Pago no completado" description="El pago no se pudo completar." url="https://estefipediatra.com/booking/confirmed" />
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-coral/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <X size={32} className="text-coral" strokeWidth={2.5} />
          </div>
          <h1 className="font-display text-[28px] font-semibold text-ink">Pago no completado</h1>
          <p className="text-[14px] text-ink2 mt-2">El pago no se pudo completar. Podés intentar de nuevo.</p>
        </div>
        <button
          onClick={handleNewBooking}
          className="w-full bg-teal-dark text-white rounded-[12px] px-5 py-3 font-semibold text-[13px] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-cta)]"
        >
          Intentar de nuevo
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[560px] mx-auto px-4 pt-[110px] pb-12">
      <SEOHead
        title="Turno confirmado"
        description="Tu turno pediátrico ha sido confirmado."
        url="https://estefipediatra.com/booking/confirmed"
      />

      {/* Success icon */}
      <div className="text-center mb-6">
        {isPending ? (
          <>
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock size={32} className="text-amber-600" strokeWidth={2.5} />
            </div>
            <h1 className="font-display text-[28px] font-semibold text-ink">Pago en proceso</h1>
            <p className="text-[14px] text-ink2 mt-2">Tu pago está siendo procesado. Te notificaremos cuando se confirme.</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-green-600" strokeWidth={2.5} />
            </div>
            <h1 className="font-display text-[28px] font-semibold text-ink">
              ¡Tu turno está confirmado!
            </h1>
          </>
        )}
      </div>

      {/* Appointment details */}
      <div className="bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] p-6 mb-6">
        {(displayDate || displayLocation || displayPatient) && (
          <div className="space-y-3">
            {displayDate && (
              <div className="flex items-start gap-2.5">
                <CalendarDays size={16} className="mt-0.5 shrink-0 text-teal-dark" />
                <div>
                  <p className="text-[14px] font-semibold text-ink capitalize">
                    {formatDisplayDate(displayDate)}
                    {displaySlot && `, ${formatTime(displaySlot.start_time)}`}
                  </p>
                </div>
              </div>
            )}

            {displayLocation && (
              <div className="flex items-start gap-2.5">
                <MapPin size={16} className="mt-0.5 shrink-0 text-teal-dark" />
                <p className="text-[14px] font-semibold text-ink">{displayLocation.name}</p>
              </div>
            )}

            {displayPatient && (
              <div className="flex items-start gap-2.5">
                <Baby size={16} className="mt-0.5 shrink-0 text-teal-dark" />
                <p className="text-[14px] font-semibold text-ink">
                  {displayPatient.full_name ?? displayPatient.first_name}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="border-t border-line mt-4 pt-4">
          <p className="text-[13px] text-ink2">Te enviamos un email con:</p>
          <ul className="mt-2 space-y-1.5">
            <li className="flex items-center gap-2 text-[13px] text-ink2">
              <CheckCircle2 size={16} className="text-green-600 shrink-0" />
              Comprobante de pago
            </li>
            <li className="flex items-center gap-2 text-[13px] text-ink2">
              <CheckCircle2 size={16} className="text-green-600 shrink-0" />
              Detalles del turno
            </li>
            <li className="flex items-center gap-2 text-[13px] text-ink2">
              <CheckCircle2 size={16} className="text-green-600 shrink-0" />
              Recordatorios automáticos
            </li>
          </ul>
        </div>
      </div>

      {/* Profile completion nudge — only when patient data comes from the full store */}
      {selectedPatient && selectedPatient.profile_completion && selectedPatient.profile_completion.percentage < 100 && (
        <div className="bg-cream rounded-[16px] p-5 mb-6">
          <div className="flex items-start gap-3">
            <ClipboardEdit size={16} className="mt-0.5 shrink-0 text-teal-dark" />
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-ink">
                Completá el perfil de {selectedPatient.first_name} ({selectedPatient.profile_completion.percentage}% completo)
              </p>
              <p className="text-[13px] text-ink2 mt-0.5">
                Ayudanos a darte mejor atención completando los datos del paciente.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        <button
          onClick={() => { queryClient.invalidateQueries({ queryKey: ["appointments"] }); reset(); navigate("/portal/turnos"); }}
          className="w-full bg-teal-dark text-white rounded-[12px] px-5 py-3 font-semibold text-[13px] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-cta)]"
        >
          Ver mis turnos
        </button>
        <div className="flex gap-3">
          <button
            onClick={handleNewBooking}
            className="flex-1 bg-surface border border-line text-ink rounded-[12px] px-5 py-3 font-semibold text-[13px] hover:bg-cream transition-colors"
          >
            Reservar otro turno
          </button>
          {displayDate && displaySlot?.start_time && (
            <a
              href={getCalendarUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-surface border border-line text-ink rounded-[12px] px-5 py-3 font-semibold text-[13px] hover:bg-cream transition-colors text-center"
            >
              Agregar al calendario
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
