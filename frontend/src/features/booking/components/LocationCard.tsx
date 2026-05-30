import type { Location } from "@/types/api";

type LocationOption = Location | { id: "online"; name: string; address: string; city: string };

interface LocationCardProps {
  location: LocationOption;
  isSelected: boolean;
  onClick: () => void;
}

export default function LocationCard({ location, isSelected, onClick }: LocationCardProps) {
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
        <div
          className={[
            "w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 mt-0.5",
            isSelected ? "bg-teal text-white" : "bg-cream text-teal-dark",
          ].join(" ")}
        >
          {location.id === "online" ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </div>
        <div>
          <p className="font-semibold text-[15px] text-ink">{location.name}</p>
          <p className="text-[13px] text-ink2 mt-0.5">{location.address}</p>
          <p className="text-[12px] text-ink3">{location.city}</p>
        </div>
        {isSelected && (
          <div className="ml-auto">
            <div className="w-5 h-5 rounded-full bg-teal flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </button>
  );
}
