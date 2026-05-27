import { MapPin, Clock, Phone, ExternalLink, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Location, PaginatedResponse } from "@/types/api";

const PRACTICE_SLUG = "dra-estefi";

// --- Eyebrow helper ---
function Eyebrow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="w-6 h-[1.5px] bg-teal-dark inline-block" />
      <span className="text-[11px] tracking-[0.18em] uppercase font-bold text-teal-dark">
        {label}
      </span>
    </div>
  );
}

// --- Map placeholder SVG (slightly different accent per card) ---
function MapPlaceholder({ index }: { index: number }) {
  const palettes = [
    { accent: "#7BB5BD", ping: "#4A8590" },
    { accent: "#F3A8A1", ping: "#E5B847" },
  ];
  // Cycle if more than 2 locations
  const { accent, ping } = palettes[index % palettes.length];

  return (
    <div
      className="relative h-[200px] rounded-[16px] overflow-hidden"
      style={{
        background: `linear-gradient(160deg, ${accent}25 0%, #F7F0E5 100%)`,
      }}
    >
      {/* Decorative grid lines */}
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={`grid-loc-${index}`} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke={accent} strokeWidth="0.5" strokeOpacity="0.3" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#grid-loc-${index})`} />
        <line x1="0" y1="80" x2="100%" y2="80" stroke={accent} strokeWidth="2" strokeOpacity="0.2" />
        <line x1="0" y1="140" x2="100%" y2="140" stroke={accent} strokeWidth="3" strokeOpacity="0.15" />
        <line x1="80" y1="0" x2="80" y2="100%" stroke={accent} strokeWidth="2" strokeOpacity="0.2" />
        <line x1="220" y1="0" x2="220" y2="100%" stroke={accent} strokeWidth="1.5" strokeOpacity="0.15" />
      </svg>
      {/* Ping dot */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <span
          className="absolute inline-flex h-5 w-5 rounded-full opacity-75 animate-ping"
          style={{ background: ping }}
        />
        <span
          className="relative inline-flex rounded-full h-5 w-5 items-center justify-center"
          style={{ background: ping }}
        >
          <MapPin size={11} className="text-white" />
        </span>
      </div>
    </div>
  );
}

// --- Badge helpers ---
const BADGE_VARIANTS = [
  { label: "Sede principal", color: "text-teal-dark", bg: "bg-teal/15" },
  { label: "Sede sur", color: "text-coral", bg: "bg-coral/15" },
  { label: "Sede norte", color: "text-mustard", bg: "bg-mustard/10" },
];

// --- Location card ---
function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

interface LocationCardProps {
  badge: string;
  badgeColor: string;
  badgeBg: string;
  name: string;
  address: string;
  fullAddress: string;
  hours: string;
  phone: string;
  mapIndex: number;
}

function LocationCard({
  badge,
  badgeColor,
  badgeBg,
  name,
  address,
  fullAddress,
  hours,
  phone,
  mapIndex,
}: LocationCardProps) {
  return (
    <div className="bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] p-6 flex flex-col gap-5 hover:-translate-y-1 hover:shadow-[var(--shadow-pop)] transition-all duration-300">
      {/* Map */}
      <MapPlaceholder index={mapIndex} />

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <span
            className={`inline-block ${badgeBg} ${badgeColor} text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide mb-2`}
          >
            {badge}
          </span>
          <h3 className="font-display text-[22px] text-ink leading-tight">{name}</h3>
        </div>
      </div>

      {/* Info rows */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3 text-[13.5px] text-ink2">
          <MapPin size={15} className="shrink-0 text-teal-dark mt-0.5" />
          <span>{address}</span>
        </div>
        <div className="flex items-center gap-3 text-[13.5px] text-ink2">
          <Clock size={15} className="shrink-0 text-teal-dark" />
          <span>{hours}</span>
        </div>
        <div className="flex items-center gap-3 text-[13.5px] text-ink2">
          <Phone size={15} className="shrink-0 text-teal-dark" />
          <a href={`tel:${phone.replace(/\s/g, "")}`} className="hover:text-teal-dark transition-colors">
            {phone}
          </a>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <Link
          to="/booking"
          className="flex-1 bg-teal-dark text-white text-[13.5px] font-semibold rounded-[12px] py-2.5 flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
        >
          <CalendarDays size={14} />
          Reservar aquí
        </Link>
        <a
          href={mapsUrl(fullAddress)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[13px] font-semibold text-teal-dark border border-teal/30 rounded-[12px] px-4 hover:bg-teal/5 transition-colors"
        >
          <ExternalLink size={13} />
          Cómo llegar
        </a>
      </div>
    </div>
  );
}

// --- Skeleton ---
function LocationsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
      {[0, 1].map((i) => (
        <div key={i} className="bg-surface rounded-[20px] border border-line p-6 flex flex-col gap-5">
          <div className="h-[200px] rounded-[16px] bg-ink/5" />
          <div className="h-4 w-24 rounded-full bg-ink/5" />
          <div className="h-6 w-32 bg-ink/5 rounded" />
          <div className="space-y-2">
            <div className="h-4 w-3/4 bg-ink/5 rounded" />
            <div className="h-4 w-1/2 bg-ink/5 rounded" />
            <div className="h-4 w-2/3 bg-ink/5 rounded" />
          </div>
          <div className="flex gap-3 pt-1">
            <div className="flex-1 h-10 rounded-[12px] bg-ink/5" />
            <div className="w-24 h-10 rounded-[12px] bg-ink/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Main section ---
export default function LocationsSection() {
  const { data, isLoading, isError } = useQuery<PaginatedResponse<Location>>({
    queryKey: ["locations", PRACTICE_SLUG],
    queryFn: () =>
      api
        .get<PaginatedResponse<Location>>(`/practices/${PRACTICE_SLUG}/locations/`)
        .then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });

  const locations = data?.results ?? [];

  return (
    <section id="sedes" className="py-24 lg:py-32">
      <div className="max-w-[1280px] mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-14">
          <Eyebrow label="Sedes" />
          <h2 className="font-display text-[36px] lg:text-[48px] leading-[1.05] text-ink tracking-tight mb-4">
            Dos consultas en el sur.
          </h2>
          <p className="text-[15px] text-ink2 max-w-[520px] mx-auto leading-relaxed">
            Atendemos en Pucón y Villarrica para que la distancia no sea un
            obstáculo. También hacemos consultas online para toda la región.
          </p>
        </div>

        {/* Loading */}
        {isLoading && <LocationsSkeleton />}

        {/* Error */}
        {isError && (
          <p className="text-center text-[14px] text-red-500">
            No pudimos cargar las sedes. Intentá de nuevo más tarde.
          </p>
        )}

        {/* Locations grid */}
        {!isLoading && !isError && locations.length === 0 && (
          <p className="text-center text-[14px] text-ink2">
            Próximamente sedes disponibles.
          </p>
        )}

        {!isLoading && !isError && locations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {locations.map((loc, idx) => {
              const badge = BADGE_VARIANTS[idx] ?? BADGE_VARIANTS[BADGE_VARIANTS.length - 1];
              return (
                <LocationCard
                  key={loc.id}
                  badge={badge.label}
                  badgeColor={badge.color}
                  badgeBg={badge.bg}
                  name={loc.name}
                  address={`${loc.address} · ${loc.city}, ${loc.region}`}
                  fullAddress={`${loc.address}, ${loc.city}, ${loc.region}, Chile`}
                  hours={loc.display_hours || "Consultar horarios"}
                  phone={loc.phone}
                  mapIndex={idx}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
