import { Quote } from "lucide-react";
import { Marquee } from "@/components/ui/marquee";

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

// --- Types ---
interface Testimonial {
  quote: string;
  name: string;
  relation: string;
  city: string;
  initial: string;
  avatarFrom: string;
  avatarTo: string;
  quoteColor: string;
}

// --- Data ---
const testimonials: Testimonial[] = [
  {
    quote:
      "La Dra. Estefi nos acompañó desde el primer día con nuestra recién nacida. Nunca sentimos que molestábamos con nuestras preguntas. Tiene una paciencia y una calidez increíble.",
    name: "Daniela Pérez",
    relation: "Mamá de Sofi",
    city: "Pucón",
    initial: "D",
    avatarFrom: "#F3A8A1",
    avatarTo: "#E5B847",
    quoteColor: "text-coral",
  },
  {
    quote:
      "Como papá primerizo, llegué con mil dudas. Salí con todas las respuestas y con la tranquilidad de saber que mi hijo está en buenas manos. Altamente recomendada.",
    name: "Andrés Martínez",
    relation: "Papá de Lucas",
    city: "Villarrica",
    initial: "A",
    avatarFrom: "#E5B847",
    avatarTo: "#7BB5BD",
    quoteColor: "text-mustard",
  },
  {
    quote:
      "Lo que más valoro es que no te apura. Te escucha, revisa con detalle y explica todo de forma clara. Mateo siempre sale contento del consultorio.",
    name: "Carolina González",
    relation: "Mamá de Mateo",
    city: "Pucón",
    initial: "C",
    avatarFrom: "#7BB5BD",
    avatarTo: "#A8C9A8",
    quoteColor: "text-teal",
  },
];

// --- Marquee items ---
const miniQuotes = [
  "Atención humana, no de fábrica",
  "Recomendada por mi matrona",
  "Vale cada peso",
  "La pediatra que estábamos buscando",
  "Mis hijos la adoran",
];

// --- TestimonialCard ---
function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <div className="bg-surface rounded-[20px] p-7 border border-line shadow-[var(--shadow-soft)] flex flex-col gap-5 relative overflow-hidden hover:-translate-y-1 hover:shadow-[var(--shadow-pop)] transition-all duration-300">
      {/* Faded quote icon top-right */}
      <Quote
        size={48}
        className={`absolute top-4 right-4 opacity-10 ${t.quoteColor}`}
      />

      {/* Quote text */}
      <p className="text-[14px] text-ink2 leading-relaxed font-medium relative z-10">
        "{t.quote}"
      </p>

      {/* Author */}
      <div className="flex items-center gap-3">
        {/* Gradient avatar */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-[15px] shrink-0"
          style={{
            background: `linear-gradient(135deg, ${t.avatarFrom}, ${t.avatarTo})`,
          }}
        >
          {t.initial}
        </div>
        <div>
          <p className="text-[13.5px] text-ink font-semibold">{t.name}</p>
          <p className="text-[12px] text-ink3">
            {t.relation} · {t.city}
          </p>
        </div>
      </div>
    </div>
  );
}

// --- Main section ---
export default function TestimonialsSection() {
  return (
    <section className="py-24 lg:py-32 overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="w-6 h-[1.5px] bg-teal-dark inline-block" />
            <Eyebrow label="Testimonios" />
          </div>
          <h2 className="font-display text-[36px] lg:text-[48px] leading-[1.05] text-ink tracking-tight mb-4">
            Lo que dicen las familias.
          </h2>
          {/* Rating row */}
          <div className="flex items-center justify-center gap-2">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-4 h-4 fill-mustard text-mustard" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-[14px] text-ink2 font-medium">
              4.9 / 5 · 96 reseñas
            </span>
          </div>
        </div>

        {/* 3-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
          {testimonials.map((t) => (
            <TestimonialCard key={t.name} t={t} />
          ))}
        </div>
      </div>

      {/* Marquee strip */}
      <div className="border-y border-line bg-cream/50 py-4">
        <Marquee pauseOnHover className="[--duration:30s]">
          {miniQuotes.map((q) => (
            <div
              key={q}
              className="flex items-center gap-3 px-6 text-[13.5px] text-ink2 font-medium"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-teal shrink-0" />
              {q}
            </div>
          ))}
        </Marquee>
      </div>
    </section>
  );
}
