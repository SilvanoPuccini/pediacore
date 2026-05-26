import { MapPin, Clock, Phone, ExternalLink, CalendarDays } from "lucide-react";

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

// --- Map placeholder SVG ---
interface MapPlaceholderProps {
  accentColor: string;
  pingColor: string;
}

function MapPlaceholder({ accentColor, pingColor }: MapPlaceholderProps) {
  return (
    <div
      className="relative h-[200px] rounded-[16px] overflow-hidden"
      style={{
        background: `linear-gradient(160deg, ${accentColor}25 0%, #F7F0E5 100%)`,
      }}
    >
      {/* Decorative grid lines */}
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={`grid-${accentColor}`} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke={accentColor} strokeWidth="0.5" strokeOpacity="0.3" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#grid-${accentColor})`} />
        {/* Fake streets */}
        <line x1="0" y1="80" x2="100%" y2="80" stroke={accentColor} strokeWidth="2" strokeOpacity="0.2" />
        <line x1="0" y1="140" x2="100%" y2="140" stroke={accentColor} strokeWidth="3" strokeOpacity="0.15" />
        <line x1="80" y1="0" x2="80" y2="100%" stroke={accentColor} strokeWidth="2" strokeOpacity="0.2" />
        <line x1="220" y1="0" x2="220" y2="100%" stroke={accentColor} strokeWidth="1.5" strokeOpacity="0.15" />
      </svg>
      {/* Ping dot */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <span
          className="absolute inline-flex h-5 w-5 rounded-full opacity-75 animate-ping"
          style={{ background: pingColor }}
        />
        <span
          className="relative inline-flex rounded-full h-5 w-5 items-center justify-center"
          style={{ background: pingColor }}
        >
          <MapPin size={11} className="text-white" />
        </span>
      </div>
    </div>
  );
}

// --- Location card types ---
interface LocationCardProps {
  badge: string;
  badgeColor: string;
  badgeBg: string;
  name: string;
  address: string;
  hours: string;
  phone: string;
  statusLabel: string;
  statusColor: string;
  statusBg: string;
  mapAccent: string;
  mapPing: string;
  scheduleTag?: string;
  scheduleTagColor?: string;
}

function LocationCard({
  badge,
  badgeColor,
  badgeBg,
  name,
  address,
  hours,
  phone,
  statusLabel,
  statusColor,
  statusBg,
  mapAccent,
  mapPing,
  scheduleTag,
  scheduleTagColor,
}: LocationCardProps) {
  return (
    <div className="bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] p-6 flex flex-col gap-5 hover:-translate-y-1 hover:shadow-[var(--shadow-pop)] transition-all duration-300">
      {/* Map */}
      <MapPlaceholder accentColor={mapAccent} pingColor={mapPing} />

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
        {/* Open status */}
        <span
          className={`shrink-0 flex items-center gap-1.5 ${statusBg} ${statusColor} text-[11px] font-bold px-3 py-1 rounded-full mt-1`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {statusLabel}
        </span>
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
          {scheduleTag && (
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${scheduleTagColor}`}
            >
              {scheduleTag}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[13.5px] text-ink2">
          <Phone size={15} className="shrink-0 text-teal-dark" />
          <a href={`tel:${phone}`} className="hover:text-teal-dark transition-colors">
            {phone}
          </a>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button className="flex-1 bg-teal-dark text-white text-[13.5px] font-semibold rounded-[12px] py-2.5 flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity">
          <CalendarDays size={14} />
          Reservar aquí
        </button>
        <a
          href="#"
          className="flex items-center gap-1.5 text-[13px] font-semibold text-teal-dark border border-teal/30 rounded-[12px] px-4 hover:bg-teal/5 transition-colors"
        >
          <ExternalLink size={13} />
          Cómo llegar
        </a>
      </div>
    </div>
  );
}

// --- Main section ---
export default function LocationsSection() {
  return (
    <section className="py-24 lg:py-32">
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

        {/* 2-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <LocationCard
            badge="Sede principal"
            badgeColor="text-teal-dark"
            badgeBg="bg-teal/15"
            name="Pucón"
            address="Av. O'Higgins 480, of. 305 · Pucón, La Araucanía"
            hours="Lun – Vie · 09:00 – 19:00"
            phone="+56 9 9999 0001"
            statusLabel="Abierto hoy"
            statusColor="text-emerald-700"
            statusBg="bg-emerald-50"
            mapAccent="#7BB5BD"
            mapPing="#4A8590"
          />
          <LocationCard
            badge="Sede sur"
            badgeColor="text-coral"
            badgeBg="bg-coral/15"
            name="Villarrica"
            address="Pedro de Valdivia 1240, of. 12 · Villarrica, La Araucanía"
            hours="Mar y Jue · 09:00 – 17:00"
            phone="+56 9 9999 0002"
            statusLabel="Abre el martes"
            statusColor="text-mustard"
            statusBg="bg-mustard/10"
            mapAccent="#F3A8A1"
            mapPing="#E5B847"
            scheduleTag="Mar y Jue"
            scheduleTagColor="bg-mustard/15 text-mustard"
          />
        </div>
      </div>
    </section>
  );
}
