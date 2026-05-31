import { useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import SEOHead from "@/components/seo/SEOHead";
import { useBookingStore } from "./store/bookingStore";
import { useLocations, useMyPatients } from "./hooks/useBookingQueries";
import { formatDisplayDate, formatTime } from "./utils";

export default function BookingConfirmed() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    locationId,
    selectedDate,
    selectedSlot,
    patientId,
    appointmentId,
    reset,
  } = useBookingStore();

  const { data: locationsResp } = useLocations();
  const { data: patients } = useMyPatients();

  const locations = locationsResp?.results ?? [];

  const selectedLocation = useMemo(
    () =>
      locationId === "online"
        ? { name: "Atención Online", address: "Videollamada por Google Meet", city: "" }
        : locations.find((l) => l.id === locationId) ?? null,
    [locations, locationId]
  );

  const selectedPatient = useMemo(
    () => patients?.find((p) => p.id === patientId) ?? null,
    [patients, patientId]
  );

  // If no appointment, redirect to booking
  useEffect(() => {
    if (!appointmentId && !searchParams.get("appointment_id")) {
      navigate("/booking");
    }
  }, [appointmentId, searchParams, navigate]);

  function handleGoToAppointments() {
    reset();
    navigate("/admin");
  }

  function handleNewBooking() {
    reset();
    navigate("/booking");
  }

  return (
    <div className="max-w-[560px] mx-auto px-4 py-12">
      <SEOHead
        title="Turno confirmado"
        description="Tu turno pediátrico ha sido confirmado."
        url="https://estefipediatra.com/booking/confirmed"
      />

      {/* Success icon */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="font-display text-[28px] font-semibold text-ink">
          ¡Turno confirmado!
        </h1>
      </div>

      {/* Appointment details */}
      <div className="bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] p-6 mb-6">
        <div className="space-y-3">
          {selectedDate && (
            <div className="flex items-start gap-2.5">
              <span className="text-[16px]">📅</span>
              <div>
                <p className="text-[14px] font-semibold text-ink capitalize">
                  {formatDisplayDate(selectedDate)}
                </p>
                {selectedSlot && (
                  <p className="text-[13px] text-ink2">
                    {formatTime(selectedSlot.start_time)} hrs
                  </p>
                )}
              </div>
            </div>
          )}

          {selectedLocation && (
            <div className="flex items-start gap-2.5">
              <span className="text-[16px]">📍</span>
              <div>
                <p className="text-[14px] font-semibold text-ink">{selectedLocation.name}</p>
                {"address" in selectedLocation && selectedLocation.address && (
                  <p className="text-[13px] text-ink2">{selectedLocation.address}</p>
                )}
              </div>
            </div>
          )}

          {selectedPatient && (
            <div className="flex items-start gap-2.5">
              <span className="text-[16px]">👶</span>
              <p className="text-[14px] font-semibold text-ink">
                Paciente: {selectedPatient.full_name}
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-line mt-4 pt-4">
          <p className="text-[13px] text-ink2">Te enviamos un email con:</p>
          <ul className="mt-2 space-y-1.5">
            <li className="flex items-center gap-2 text-[13px] text-ink2">
              <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Comprobante de pago (PDF)
            </li>
            <li className="flex items-center gap-2 text-[13px] text-ink2">
              <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Detalles del turno
            </li>
            <li className="flex items-center gap-2 text-[13px] text-ink2">
              <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Recordatorios automáticos
            </li>
          </ul>
        </div>
      </div>

      {/* Profile completion nudge */}
      {selectedPatient && (
        <div className="bg-cream rounded-[16px] p-5 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-[16px]">📝</span>
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-ink">
                Completá el perfil de {selectedPatient.first_name}
              </p>
              <p className="text-[13px] text-ink2 mt-0.5">
                Ayudanos a darte mejor atención completando los datos del paciente.
              </p>
              <button
                onClick={() => navigate(`/admin`)}
                className="mt-3 text-[13px] font-semibold text-teal-dark hover:underline"
              >
                Completar perfil →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleGoToAppointments}
          className="flex-1 bg-teal-dark text-white rounded-[12px] px-5 py-3 font-semibold text-[13px] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-cta)]"
        >
          Ver mis turnos
        </button>
        <button
          onClick={handleNewBooking}
          className="flex-1 bg-surface border border-line text-ink rounded-[12px] px-5 py-3 font-semibold text-[13px] hover:bg-cream transition-colors"
        >
          Reservar otro turno
        </button>
      </div>
    </div>
  );
}
