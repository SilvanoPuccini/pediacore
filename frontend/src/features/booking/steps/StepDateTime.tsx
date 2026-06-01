import { useMemo } from "react";
import { useBookingStore } from "../store/bookingStore";
import { useLocations, useServices, useSlots, useAvailableDays } from "../hooks/useBookingQueries";
import MiniCalendar from "../components/MiniCalendar";
import TimeSlotGrid from "../components/TimeSlotGrid";
import { formatDisplayDate, formatTime, formatPrice } from "../utils";
import type { AvailableSlot } from "@/types/api";

export default function StepDateTime() {
  const {
    locationId,
    serviceId,
    selectedDate,
    selectedSlot,
    setDate,
    setSlot,
    setStep,
  } = useBookingStore();

  const { data: locationsResp } = useLocations();
  const { data: servicesResp } = useServices();

  const locations = locationsResp?.results ?? [];
  const services = servicesResp?.results ?? [];

  const selectedLocation = useMemo(
    () =>
      locationId === "online"
        ? { id: "online" as const, name: "Atención Online" }
        : locations.find((l) => l.id === locationId) ?? null,
    [locations, locationId]
  );

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId) ?? null,
    [services, serviceId]
  );

  const { data: availableDays } = useAvailableDays(locationId, serviceId);

  const { data: slots, isLoading: slotsLoading } = useSlots({
    locationId,
    serviceId,
    date: selectedDate,
  });

  function handleSlotSelect(slot: AvailableSlot) {
    setSlot(slot);
  }

  function handleContinue() {
    if (selectedDate && selectedSlot) {
      setStep(4);
    }
  }

  return (
    <div className="space-y-6">
      {/* Volver */}
      <button
        onClick={() => setStep(2)}
        className="flex items-center gap-1.5 text-[13px] text-ink2 hover:text-ink transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Volver
      </button>

      {/* Service info header */}
      <div className="bg-cream rounded-[16px] px-5 py-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="bg-white text-teal-dark text-[12px] font-semibold px-3 py-1 rounded-full border border-line">
            {selectedLocation?.name}
          </span>
          <span className="bg-white text-teal-dark text-[12px] font-semibold px-3 py-1 rounded-full border border-line">
            {selectedService?.name}
          </span>
          {selectedService && (
            <>
              <span className="text-[12px] text-ink3">
                {selectedService.duration_minutes} min
              </span>
              <span className="text-[13px] font-semibold text-teal-dark">
                {formatPrice(selectedService.price_clp)}
              </span>
            </>
          )}
        </div>
      </div>

      <section>
        <h2 className="font-semibold text-[18px] text-ink mb-1">3. Elegí el día</h2>
        <p className="text-[14px] text-ink2 mb-4">
          Seleccioná la fecha y el horario que prefieras.
        </p>
        <MiniCalendar
          selectedDate={selectedDate}
          onSelectDate={(date) => setDate(date)}
          allowedDaysOfWeek={availableDays}
        />
      </section>

      {/* Time slots */}
      {selectedDate && (
        <section>
          <h2 className="font-semibold text-[16px] text-ink mb-3">
            Horarios disponibles —{" "}
            <span className="font-normal text-ink2 text-[14px] capitalize">
              {formatDisplayDate(selectedDate)}
            </span>
          </h2>
          <TimeSlotGrid
            slots={slots}
            isLoading={slotsLoading}
            selectedSlot={selectedSlot}
            onSelect={handleSlotSelect}
          />
        </section>
      )}

      {selectedDate && selectedSlot && (
        <div className="bg-cream rounded-[14px] px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-[13px] text-ink2">Horario seleccionado</p>
            <p className="text-[15px] font-semibold text-ink">
              {formatDisplayDate(selectedDate)} — {formatTime(selectedSlot.start_time)}
            </p>
          </div>
          <button
            onClick={handleContinue}
            className="bg-teal-dark text-white rounded-[12px] px-6 py-3 font-semibold text-[14px] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-cta)]"
          >
            Continuar
          </button>
        </div>
      )}
    </div>
  );
}
