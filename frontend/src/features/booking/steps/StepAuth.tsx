import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useBookingStore } from "../store/bookingStore";
import { useLocations, useServices } from "../hooks/useBookingQueries";
import { useAuthStore } from "@/stores/auth";
import { formatDisplayDate, formatTime, formatPrice } from "../utils";

export default function StepAuth() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const {
    locationId,
    serviceId,
    selectedDate,
    selectedSlot,
    setStep,
  } = useBookingStore();

  const { data: locationsResp } = useLocations();
  const { data: servicesResp } = useServices();

  const locations = locationsResp?.results ?? [];
  const services = servicesResp?.results ?? [];

  const selectedLocation = useMemo(
    () =>
      locationId === "online"
        ? { name: "Atención Online" }
        : locations.find((l) => l.id === locationId) ?? null,
    [locations, locationId]
  );

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId) ?? null,
    [services, serviceId]
  );

  // Auto-skip if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setStep(5);
    }
  }, [isAuthenticated, setStep]);

  if (isAuthenticated) return null;

  return (
    <div className="space-y-6">
      {/* Volver */}
      <button
        onClick={() => setStep(3)}
        className="flex items-center gap-1.5 text-[13px] text-ink2 hover:text-ink transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Volver
      </button>

      {/* Resumen de selección */}
      <div className="bg-cream rounded-[16px] px-5 py-4">
        <p className="text-[12px] font-semibold text-ink3 uppercase tracking-wide mb-2">
          Resumen de tu selección
        </p>
        <div className="flex items-center gap-2 flex-wrap text-[13px]">
          <span className="flex items-center gap-1">
            <span>📍</span>
            <span className="font-semibold text-ink">{selectedLocation?.name}</span>
          </span>
          <span className="text-ink3">·</span>
          <span className="flex items-center gap-1">
            <span>🩺</span>
            <span className="font-semibold text-ink">{selectedService?.name}</span>
          </span>
          {selectedService && (
            <>
              <span className="text-ink3">·</span>
              <span className="font-semibold text-teal-dark">{formatPrice(selectedService.price_clp)}</span>
            </>
          )}
        </div>
        {selectedDate && selectedSlot && (
          <p className="text-[13px] text-ink2 mt-1.5">
            📅 <span className="capitalize">{formatDisplayDate(selectedDate)}</span> · {formatTime(selectedSlot.start_time)} hrs
          </p>
        )}
      </div>

      {/* Auth prompt */}
      <div className="bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] p-6">
        <div className="w-14 h-14 bg-teal/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-teal-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>

        <h2 className="font-display text-[20px] font-semibold text-ink mb-2 text-center">
          Para reservar necesitás una cuenta
        </h2>
        <p className="text-[14px] text-ink2 mb-6 text-center">
          Te vamos a recordar tu elección, solo falta que inicies sesión o te registres.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => navigate("/login?redirect=/booking")}
            className="w-full bg-teal-dark text-white rounded-[12px] px-6 py-3 font-semibold text-[14px] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-cta)]"
          >
            Ya tengo cuenta — Iniciar sesión
          </button>
          <button
            onClick={() => navigate("/register?redirect=/booking")}
            className="w-full bg-surface border-2 border-teal-dark text-teal-dark rounded-[12px] px-6 py-3 font-semibold text-[14px] transition-all hover:bg-teal-dark hover:text-white"
          >
            Crear cuenta nueva
          </button>
        </div>

        <p className="text-[12px] text-ink3 mt-4 text-center">
          Tu selección se guardará mientras te registrás.
        </p>
      </div>
    </div>
  );
}
