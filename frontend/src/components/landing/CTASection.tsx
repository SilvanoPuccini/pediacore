import { CalendarDays, CheckCircle, MapPin } from "lucide-react";

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

// --- Booking slot ---
interface SlotProps {
  day: string;
  time: string;
  location: string;
  locationColor: string;
  locationBg: string;
}

function BookingSlot({ day, time, location, locationColor, locationBg }: SlotProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-line last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-[10px] bg-teal/10 flex items-center justify-center">
          <CalendarDays size={16} className="text-teal-dark" />
        </div>
        <div>
          <p className="text-[13.5px] font-semibold text-ink">{day}</p>
          <p className="text-[12px] text-ink3">{time}</p>
        </div>
      </div>
      <span
        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${locationBg} ${locationColor}`}
      >
        {location}
      </span>
    </div>
  );
}

// --- Booking card ---
function BookingCard() {
  return (
    <div className="bg-surface rounded-[20px] border border-line shadow-[var(--shadow-pop)] p-6">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[13px] font-bold text-ink uppercase tracking-wide">
          Próximos turnos disponibles
        </p>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      </div>
      <p className="text-[12px] text-ink3 mb-4">Actualizados en tiempo real</p>

      <div className="flex flex-col">
        <BookingSlot
          day="Mié 27"
          time="09:00 hs"
          location="Pucón"
          locationColor="text-teal-dark"
          locationBg="bg-teal/15"
        />
        <BookingSlot
          day="Jue 28"
          time="11:30 hs"
          location="Villarrica"
          locationColor="text-coral"
          locationBg="bg-coral/15"
        />
        <BookingSlot
          day="Vie 29"
          time="16:00 hs"
          location="Online"
          locationColor="text-mustard"
          locationBg="bg-mustard/15"
        />
      </div>

      <a
        href="#"
        className="mt-4 flex items-center justify-center gap-1.5 text-[13px] font-semibold text-teal-dark hover:underline"
      >
        Ver todos los horarios
        <MapPin size={13} />
      </a>
    </div>
  );
}

// --- Main section ---
export default function CTASection() {
  return (
    <section id="reservar" className="py-24 lg:py-32 relative overflow-hidden">
      {/* Background gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg, #F0F9F5 0%, var(--bg) 50%, #FFF3EE 100%)",
        }}
      />

      {/* Decorative blobs */}
      <div
        className="pointer-events-none absolute -top-24 -left-24 w-[360px] h-[360px] rounded-full opacity-[0.12] blur-3xl"
        style={{ background: "var(--teal)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-20 -right-20 w-[300px] h-[300px] rounded-full opacity-[0.10] blur-3xl"
        style={{ background: "var(--coral)" }}
      />

      <div className="max-w-[1280px] mx-auto px-6 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">

          {/* ── Left: copy + CTAs ── */}
          <div className="flex flex-col gap-6">
            <div>
              <Eyebrow label="Reservar" />
              <h2 className="font-display text-[36px] lg:text-[48px] leading-[1.05] text-ink tracking-tight mb-5">
                Empezá hoy con{" "}
                <em className="not-italic italic text-teal-dark">Dra. Estefi.</em>
              </h2>
              <p className="text-[15px] text-ink2 leading-relaxed max-w-[440px]">
                Reservá tu primera consulta en minutos. Sin esperas, sin papeleo.
                Atendemos presencialmente en Pucón y Villarrica, y también de
                forma online para toda la región.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap gap-3">
              <button className="flex items-center gap-2 bg-teal-dark text-white text-[14px] font-semibold rounded-[14px] px-6 py-3 shadow-[var(--shadow-cta)] hover:opacity-90 hover:-translate-y-0.5 transition-all duration-200">
                <CalendarDays size={16} />
                Reservar consulta
              </button>
              <a
                href="https://wa.me/56958455537"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 border border-teal/40 bg-white/80 text-ink text-[14px] font-semibold rounded-[14px] px-6 py-3 hover:bg-white hover:-translate-y-0.5 transition-all duration-200"
              >
                {/* WhatsApp icon */}
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-4 h-4 text-[#25D366]"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp
              </a>
            </div>

            {/* Confirmation badges */}
            <div className="flex flex-wrap gap-4">
              {[
                "Confirmación inmediata por email",
                "Cancelación gratis hasta 24 hs antes",
                "Recordatorio automático",
              ].map((badge) => (
                <div key={badge} className="flex items-center gap-1.5 text-[12.5px] text-ink2">
                  <CheckCircle size={14} className="text-sage shrink-0" />
                  {badge}
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: booking card ── */}
          <div className="w-full max-w-[400px] mx-auto lg:mx-0 lg:ml-auto">
            <BookingCard />
          </div>

        </div>
      </div>
    </section>
  );
}
