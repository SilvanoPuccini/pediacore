import { useState } from "react";
import { MapPin, Clock, MessageCircle, ExternalLink, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Location, PaginatedResponse } from "@/types/api";

const PRACTICE_SLUG = "dra-estefi";
const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;

// --- Static Map preview (instant image with pin, clickable to Google Maps) ---
function StaticMapPreview({ lat, lng, address }: { lat: number; lng: number; address: string }) {
  const safeLat = Number(lat) || 0;
  const safeLng = Number(lng) || 0;
  const googleUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  const staticMapUrl = GOOGLE_MAPS_KEY && safeLat && safeLng
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${safeLat},${safeLng}&zoom=16&size=600x200&scale=2&maptype=roadmap&markers=color:red%7C${safeLat},${safeLng}&key=${GOOGLE_MAPS_KEY}`
    : null;

  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${safeLng - 0.005},${safeLat - 0.003},${safeLng + 0.005},${safeLat + 0.003}&layer=mapnik&marker=${safeLat},${safeLng}`;

  const [mapError, setMapError] = useState(false);
  const showGoogle = staticMapUrl && !mapError;

  return (
    <a
      href={googleUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="relative block h-[200px] rounded-[16px] overflow-hidden group cursor-pointer"
    >
      {showGoogle ? (
        <img
          src={staticMapUrl}
          alt={`Mapa de ${address}`}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setMapError(true)}
        />
      ) : (
        <iframe
          src={osmEmbedUrl}
          className="w-full h-full pointer-events-none"
          style={{ border: 0 }}
          loading="lazy"
          title="Mapa"
        />
      )}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center">
        <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-ink text-[12px] font-semibold px-3 py-1.5 rounded-full shadow-md transition-opacity duration-200">
          Abrir en Google Maps
        </span>
      </div>
    </a>
  );
}

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

// --- Badge helpers ---
const BADGE_VARIANTS = [
  { label: "Sede principal", color: "text-teal-dark", bg: "bg-teal/15" },
  { label: "Sede sur", color: "text-coral", bg: "bg-coral/15" },
  { label: "Sede norte", color: "text-mustard", bg: "bg-mustard/10" },
];

// --- WhatsApp helper ---
function waUrl(phone: string): string {
  return `https://wa.me/${phone.replace(/\s+/g, "").replace(/^\+/, "")}`;
}

// --- Location card ---
interface LocationCardProps {
  badge: string;
  badgeColor: string;
  badgeBg: string;
  name: string;
  address: string;
  fullAddress: string;
  hours: string;
  phone: string;
  lat: number;
  lng: number;
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
  lat,
  lng,
}: LocationCardProps) {
  return (
    <div className="bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] p-6 flex flex-col gap-5 hover:-translate-y-1 hover:shadow-[var(--shadow-pop)] transition-all duration-300">
      {/* Map */}
      <StaticMapPreview lat={lat} lng={lng} address={fullAddress} />

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
          <MessageCircle size={15} className="shrink-0 text-[#25D366]" />
          <a
            href={waUrl(phone)}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-teal-dark transition-colors"
          >
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
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}
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

        {/* Empty */}
        {!isLoading && !isError && locations.length === 0 && (
          <p className="text-center text-[14px] text-ink2">
            Próximamente sedes disponibles.
          </p>
        )}

        {/* Grid */}
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
                  lat={loc.latitude ?? 0}
                  lng={loc.longitude ?? 0}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
