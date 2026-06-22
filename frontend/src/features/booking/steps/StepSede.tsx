import { useBookingStore } from "../store/bookingStore";
import { useLocations, useOnlineSchedule, usePractice } from "../hooks/useBookingQueries";
import Skeleton from "../components/Skeleton";
import type { Location } from "@/types/api";

// ─── Sede Card (enhanced with hours) ─────────────────────────────────────────

const LOCATION_LOGOS: Record<string, string> = {
  pucon: "/images/logo_ccElvalle.png",
  villarrica: "/images/logo_AyI.png",
  online: "/images/logo_videollamada.webp",
};

function SedeCard({
  location,
  isSelected,
  onClick,
}: {
  location: Location | { id: "online"; name: string; address: string; city: string; display_hours: string };
  isSelected: boolean;
  onClick: () => void;
}) {
  const isOnline = location.id === "online";
  const slug = "slug" in location ? location.slug : isOnline ? "online" : undefined;
  const logo = slug ? LOCATION_LOGOS[slug] : undefined;

  return (
    <button
      onClick={onClick}
      className={[
        "w-full text-left p-5 rounded-[16px] border-2 transition-all",
        isSelected
          ? "border-teal bg-teal/8 shadow-[var(--shadow-soft)]"
          : "border-line bg-surface hover:border-teal/40 hover:shadow-[var(--shadow-soft)]",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        {logo ? (
          <div className={[
            "rounded-[10px] overflow-hidden flex-shrink-0 mt-0.5",
            isOnline ? "w-14 h-14" : "w-11 h-11",
          ].join(" ")}>
            <img src={logo} alt={location.name} className="w-full h-full object-contain" />
          </div>
        ) : (
          <div
            className={[
              "w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0 mt-0.5",
              isSelected ? "bg-teal text-white" : "bg-cream text-teal-dark",
            ].join(" ")}
          >
            {isOnline ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </div>
        )}
        <div className="flex-1">
          <p className="font-semibold text-[16px] text-ink">{location.name}</p>
          <p className="text-[13px] text-ink2 mt-0.5">{location.address}</p>
          {location.city && (
            <p className="text-[12px] text-ink3">{location.city}</p>
          )}
          {"display_hours" in location && location.display_hours && (
            <p className="text-[12px] text-ink3 mt-1.5">
              {location.display_hours}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 ml-auto shrink-0">
          {isSelected ? (
            <div className="w-5 h-5 rounded-full bg-teal flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : (
            <span className="text-[12px] font-semibold text-teal-dark">
              Seleccionar →
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function StepSede() {
  const { locationId, setLocation, setStep } = useBookingStore();
  const { data: locationsResp, isLoading } = useLocations();
  const { data: onlineSchedule } = useOnlineSchedule();
  const { data: practice } = usePractice();
  const locations = locationsResp?.results ?? [];
  const isOnlineEnabled = practice?.is_online_enabled ?? false;
  const onlineHours = onlineSchedule?.display_hours || "";
  const hasAnyOption = locations.length > 0 || isOnlineEnabled;

  function handleSelect(id: number | "online") {
    setLocation(id);
    setStep(2);
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-semibold text-[18px] text-ink mb-1">
          1. Elegí la sede
        </h2>
        <p className="text-[14px] text-ink2 mb-4">
          Seleccioná dónde querés atenderte.
        </p>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-[100px]" />
            <Skeleton className="h-[100px]" />
            <Skeleton className="h-[100px]" />
          </div>
        ) : !hasAnyOption ? (
          <div className="rounded-[16px] border-2 border-dashed border-line bg-bg p-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-coral/10 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-[15px] font-semibold text-ink">
              No hay sedes disponibles
            </p>
            <p className="text-[13px] text-ink2 mt-1 max-w-xs mx-auto">
              En este momento no hay turnos habilitados. Por favor, intentá de nuevo más tarde o contactanos directamente.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {locations.map((loc) => (
              <SedeCard
                key={loc.id}
                location={loc}
                isSelected={locationId === loc.id}
                onClick={() => handleSelect(loc.id)}
              />
            ))}
            {isOnlineEnabled && (
              <SedeCard
                location={{
                  id: "online",
                  name: "Atención Online",
                  address: "Agendar videollamada",
                  city: "Todo Chile",
                  display_hours: onlineHours,
                }}
                isSelected={locationId === "online"}
                onClick={() => handleSelect("online")}
              />
            )}
          </div>
        )}
      </section>
    </div>
  );
}
