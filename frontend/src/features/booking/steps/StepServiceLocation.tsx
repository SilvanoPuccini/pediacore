import { useMemo } from "react";
import { useBookingStore } from "../store/bookingStore";
import { useLocations, useServices } from "../hooks/useBookingQueries";
import LocationCard from "../components/LocationCard";
import ServiceCard from "../components/ServiceCard";
import Skeleton from "../components/Skeleton";
import type { Service } from "@/types/api";

export default function StepServiceLocation() {
  const { locationId, serviceId, setLocation, setService, setStep } = useBookingStore();

  const { data: locationsResp, isLoading: locationsLoading } = useLocations();
  const { data: servicesResp, isLoading: servicesLoading } = useServices();

  const locations = locationsResp?.results ?? [];
  const services = servicesResp?.results ?? [];

  const filteredServices = useMemo<Service[]>(() => {
    if (!services || locationId === null) return [];
    if (locationId === "online") {
      return services.filter(
        (s) => (s.modality === "ONLINE" || s.modality === "PRESENCIAL_Y_ONLINE") && s.is_active
      );
    }
    return services.filter(
      (s) => s.is_active && s.locations.includes(locationId as number)
    );
  }, [services, locationId]);

  function handleContinue() {
    if (locationId !== null && serviceId !== null) {
      setStep(2);
    }
  }

  return (
    <div className="space-y-8">
      {/* Location */}
      <section>
        <h2 className="font-semibold text-[16px] text-ink mb-3">
          1. Elegí la sede
        </h2>
        {locationsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-[80px]" />
            <Skeleton className="h-[80px]" />
            <Skeleton className="h-[80px]" />
          </div>
        ) : (
          <div className="space-y-3">
            {locations.map((loc) => (
              <LocationCard
                key={loc.id}
                location={loc}
                isSelected={locationId === loc.id}
                onClick={() => setLocation(loc.id)}
              />
            ))}
            <LocationCard
              location={{
                id: "online",
                name: "Consulta Online",
                address: "Videollamada por Google Meet",
                city: "Todo Chile",
              }}
              isSelected={locationId === "online"}
              onClick={() => setLocation("online")}
            />
          </div>
        )}
      </section>

      {/* Service */}
      {locationId !== null && (
        <section>
          <h2 className="font-semibold text-[16px] text-ink mb-3">
            2. Elegí el servicio
          </h2>
          {servicesLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-[90px]" />
              <Skeleton className="h-[90px]" />
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="bg-cream rounded-[14px] px-5 py-4 text-[14px] text-ink2">
              No hay servicios disponibles para esta sede.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredServices.map((svc) => (
                <ServiceCard
                  key={svc.id}
                  service={svc}
                  isSelected={serviceId === svc.id}
                  onClick={() => setService(svc.id)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Continue button */}
      {locationId !== null && serviceId !== null && (
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
