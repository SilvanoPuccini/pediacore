import { useMemo } from "react";
import { useBookingStore } from "../store/bookingStore";
import { useLocations, useServices, useSlots } from "../hooks/useBookingQueries";
import MiniCalendar from "../components/MiniCalendar";
import TimeSlotGrid from "../components/TimeSlotGrid";
import { formatDisplayDate } from "../utils";
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
        ? { id: "online" as const, name: "Consulta Online" }
        : locations.find((l) => l.id === locationId) ?? null,
    [locations, locationId]
  );

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId) ?? null,
    [services, serviceId]
  );

  const { data: slots, isLoading: slotsLoading } = useSlots({
    locationId,
    serviceId,
    date: selectedDate,
  });

  function handleDateSelect(date: string) {
    setDate(date);
  }

  function handleSlotSelect(slot: AvailableSlot) {
    setSlot(slot);
  }

  function handleContinue() {
    if (selectedDate && selectedSlot) {
      setStep(3);
    }
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => setStep(1)}
        className="flex items-center gap-1.5 text-[13px] text-ink2 hover:text-ink transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Volver
      </button>

      {/* Summary chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="bg-cream text-teal-dark text-[12px] font-semibold px-3 py-1 rounded-full">
          {selectedLocation?.name}
        </span>
        <span className="bg-cream text-teal-dark text-[12px] font-semibold px-3 py-1 rounded-full">
          {selectedService?.name}
        </span>
      </div>

      <section>
        <h2 className="font-semibold text-[16px] text-ink mb-3">Elegí el día</h2>
        <MiniCalendar selectedDate={selectedDate} onSelectDate={handleDateSelect} />
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
        <button
          onClick={handleContinue}
          className="w-full bg-teal-dark text-white rounded-[12px] px-6 py-3 font-semibold text-[14px] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-cta)]"
        >
          Continuar
        </button>
      )}
    </div>
  );
}
