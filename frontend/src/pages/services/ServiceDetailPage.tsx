import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Clock,
  MapPin,
  Video,
  CheckCircle2,
  MessageCircle,
  CalendarCheck,
} from "lucide-react";
import SEOHead from "@/components/seo/SEOHead";

interface ServiceDetailPageProps {
  title: string;
  description: string;
  icon: React.ElementType;
  /** Tailwind/CSS-var classes for the icon container bg */
  iconBg: string;
  /** Tailwind/CSS-var classes for the icon color */
  iconColor: string;
  /** CSS variable name without dashes, e.g. "teal" | "coral" | "mustard" | "sage" */
  accentVar: string;
  duration: string;
  modality: "Presencial" | "Online";
  includes: string[];
  idealFor: string;
  slug: string;
}

export default function ServiceDetailPage({
  title,
  description,
  icon: Icon,
  iconBg,
  iconColor,
  accentVar,
  duration,
  modality,
  includes,
  idealFor,
  slug,
}: ServiceDetailPageProps) {
  const isOnline = modality === "Online";

  return (
    <>
      <SEOHead
        title={`${title} — Dra. Estefanía Ortigosa`}
        description={description}
        url={`https://estefipediatra.com/servicios/${slug}`}
      />

      <div className="max-w-[720px] mx-auto px-4 pt-28 pb-20">
        {/* Back link */}
        <Link
          to="/#servicios"
          className="inline-flex items-center gap-1.5 text-[14px] text-[var(--ink2)] hover:text-[var(--teal-dark)] transition-colors mb-10"
        >
          <ArrowLeft size={15} />
          Volver a servicios
        </Link>

        {/* Hero */}
        <div className="mb-8 text-center">
          {/* Decorative dots top */}
          <div
            aria-hidden="true"
            className="flex justify-center gap-1.5 mb-6 opacity-30"
          >
            {[...Array(5)].map((_, i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: `var(--${accentVar})` }}
              />
            ))}
          </div>

          {/* Icon circle */}
          <div
            className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 ${iconBg} ${iconColor}`}
          >
            <Icon size={36} />
          </div>

          <h1 className="font-display text-[32px] sm:text-[36px] font-semibold text-[var(--ink)] leading-tight tracking-tight mb-3">
            {title}
          </h1>
          <p className="text-[16px] text-[var(--ink2)] leading-relaxed max-w-[500px] mx-auto">
            {description}
          </p>
        </div>

        {/* Pills row */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--surface)] border border-[var(--line)] text-[13px] text-[var(--ink2)]">
            <Clock size={14} className="text-[var(--teal-dark)]" />
            <span>{duration}</span>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--surface)] border border-[var(--line)] text-[13px] text-[var(--ink2)]">
            {isOnline ? (
              <Video size={14} className="text-[var(--mustard)]" />
            ) : (
              <MapPin size={14} className="text-[var(--coral)]" />
            )}
            <span>{modality}</span>
          </div>
        </div>

        {/* Includes card */}
        <div className="rounded-[20px] border border-[var(--line)] bg-[var(--surface)] p-7 mb-5 shadow-[var(--shadow-card)]">
          <h2 className="font-display text-[18px] font-semibold text-[var(--ink)] mb-5 flex items-center gap-2">
            <CalendarCheck size={18} style={{ color: `var(--${accentVar})` }} />
            ¿Qué incluye?
          </h2>
          <ul className="space-y-3">
            {includes.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle2
                  size={17}
                  className="shrink-0 mt-0.5"
                  style={{ color: `var(--${accentVar})` }}
                />
                <span className="text-[14.5px] text-[var(--ink2)] leading-relaxed">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Ideal para card */}
        <div
          className="rounded-[20px] border p-7 mb-10"
          style={{
            backgroundColor: `color-mix(in srgb, var(--${accentVar}) 8%, var(--bg))`,
            borderColor: `color-mix(in srgb, var(--${accentVar}) 25%, transparent)`,
          }}
        >
          <h2 className="font-display text-[18px] font-semibold text-[var(--ink)] mb-3">
            Ideal para
          </h2>
          <p className="text-[14.5px] text-[var(--ink2)] leading-relaxed">
            {idealFor}
          </p>
        </div>

        {/* CTA primary */}
        <div className="flex flex-col items-center gap-4">
          <Link
            to="/booking"
            className="inline-flex items-center gap-2 bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white font-semibold rounded-full px-8 py-3.5 text-[15px] transition-colors shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
          >
            <CalendarCheck size={17} />
            Reservar turno
          </Link>

          {/* WhatsApp secondary */}
          <a
            href="https://wa.me/56958455537"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[13.5px] text-[var(--ink2)] hover:text-[var(--teal-dark)] transition-colors"
          >
            <MessageCircle size={14} />
            ¿Dudas? Escribinos por WhatsApp
          </a>
        </div>
      </div>
    </>
  );
}
