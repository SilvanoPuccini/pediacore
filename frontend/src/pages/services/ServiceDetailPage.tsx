import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Info,
  Clock,
  MapPin,
  Wifi,
  ChevronRight,
} from "lucide-react";
import SEOHead from "@/components/seo/SEOHead";

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuickFact {
  icon: React.ElementType;
  label: string;
  sub: string;
  bg: string;
  color: string;
}

interface IncludeCard {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
}

interface Step {
  title: string;
  description: string;
}

interface SidePanelRow {
  label: string;
  value: string;
}

interface ChecklistItem {
  bold: string;
  text: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

interface RelatedService {
  slug: string;
  title: string;
  iconBg: string;
  iconColor: string;
  icon: React.ElementType;
}

export interface ServiceDetailPageProps {
  // Hero
  title: string;
  titleAccent: string;
  description: string;
  metaDescription: string;
  slug: string;
  heroIcon: React.ElementType;
  heroIconBg: string;
  heroIconColor: string;
  blobColor1: string;
  blobColor2: string;
  ctaLabel: string;
  quickFacts: QuickFact[];
  // Image placeholder
  imageGradient: string;
  imageLabel: string;
  priceLabel: string;
  price: string;
  priceSub: string;
  // Qué incluye
  includesTitle: string;
  includesDescription: string;
  includes: IncludeCard[];
  // Steps
  steps: Step[];
  // Side panel
  sidePanelEyebrow: string;
  sidePanelTitle: string;
  sidePanelDescription: string;
  sidePanelRows: SidePanelRow[];
  sidePanelCallout: string;
  // Preparation
  prepEyebrow: string;
  prepTitle: string;
  checklist: ChecklistItem[];
  // FAQ
  faqs: FaqItem[];
  // Related
  relatedServices: RelatedService[];
  // CTA banner
  ctaHeading: string;
  ctaDescription: string;
  ctaButtonLabel: string;
}

// ─── Reveal hook ──────────────────────────────────────────────────────────────

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const targets = el.querySelectorAll<HTMLElement>("[data-reveal]");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).style.opacity = "1";
            (entry.target as HTMLElement).style.transform = "translateY(0)";
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    targets.forEach((t) => {
      t.style.opacity = "0";
      t.style.transform = "translateY(24px)";
      t.style.transition = "opacity 0.55s ease, transform 0.55s ease";
      observer.observe(t);
    });

    return () => observer.disconnect();
  }, []);

  return ref;
}

// ─── WhatsApp SVG ─────────────────────────────────────────────────────────────

function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ServiceDetailPage({
  title,
  titleAccent,
  description,
  metaDescription,
  slug,
  heroIcon: HeroIcon,
  heroIconBg,
  heroIconColor,
  blobColor1,
  blobColor2,
  ctaLabel,
  quickFacts,
  imageGradient,
  imageLabel,
  priceLabel,
  price,
  priceSub,
  includesTitle,
  includesDescription,
  includes,
  steps,
  sidePanelEyebrow,
  sidePanelTitle,
  sidePanelDescription,
  sidePanelRows,
  sidePanelCallout,
  prepEyebrow,
  prepTitle,
  checklist,
  faqs,
  relatedServices,
  ctaHeading,
  ctaDescription,
  ctaButtonLabel,
}: ServiceDetailPageProps) {
  const pageRef = useReveal();

  function scrollToDetail(e: React.MouseEvent) {
    e.preventDefault();
    const el = document.getElementById("detalle");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <>
      <SEOHead
        title={`${title} ${titleAccent} — Dra. Estefanía Ortigosa`}
        description={metaDescription}
        url={`https://estefipediatra.com/servicios/${slug}`}
      />

      <div ref={pageRef}>
        {/* ── 1. HERO ─────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden pt-28 pb-20 px-4">
          {/* Decorative blobs */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full blur-[120px] opacity-25"
            style={{ backgroundColor: blobColor1 }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -right-24 w-[360px] h-[360px] rounded-full blur-[100px] opacity-20"
            style={{ backgroundColor: blobColor2 }}
          />

          <div className="relative max-w-[1100px] mx-auto">
            {/* Breadcrumb + back */}
            <div
              data-reveal
              className="flex flex-wrap items-center gap-4 mb-10"
            >
              <Link
                to="/#servicios"
                className="inline-flex items-center gap-1.5 text-[13px] text-[var(--ink2)] hover:text-[var(--teal-dark)] transition-colors"
              >
                <ArrowLeft size={14} />
                Volver a servicios
              </Link>
              <nav
                aria-label="breadcrumb"
                className="text-[12px] text-[var(--ink3)] hidden sm:flex items-center gap-1"
              >
                <Link to="/" className="hover:text-[var(--teal-dark)] transition-colors">
                  Inicio
                </Link>
                <ChevronRight size={11} />
                <Link to="/#servicios" className="hover:text-[var(--teal-dark)] transition-colors">
                  Servicios
                </Link>
                <ChevronRight size={11} />
                <span className="text-[var(--ink2)]">
                  {title} {titleAccent}
                </span>
              </nav>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left content */}
              <div data-reveal>
                {/* Icon badge + eyebrow */}
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0"
                    style={{ backgroundColor: heroIconBg, color: heroIconColor }}
                  >
                    <HeroIcon size={24} />
                  </div>
                  <span
                    className="text-[11px] tracking-[0.18em] uppercase font-bold"
                    style={{ color: "var(--teal-dark)" }}
                  >
                    Servicio
                  </span>
                </div>

                {/* Title */}
                <h1 className="font-display text-[38px] sm:text-[48px] font-semibold text-[var(--ink)] leading-tight tracking-tight mb-5">
                  {title}{" "}
                  <em
                    className="not-italic"
                    style={{ color: "var(--teal-dark)" }}
                  >
                    {titleAccent}
                  </em>
                </h1>

                <p className="text-[17px] text-[var(--ink2)] leading-relaxed mb-7 max-w-[480px]">
                  {description}
                </p>

                {/* CTAs */}
                <div className="flex flex-wrap gap-3 mb-10">
                  <Link
                    to="/booking"
                    className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-[14px] font-semibold text-white transition-all hover:opacity-90 shadow-[var(--shadow-cta)]"
                    style={{ backgroundColor: "var(--teal-dark)" }}
                  >
                    {ctaLabel}
                    <ArrowRight size={15} />
                  </Link>
                  <button
                    onClick={scrollToDetail}
                    className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-[14px] font-semibold border border-[var(--line)] text-[var(--ink2)] hover:text-[var(--teal-dark)] hover:border-[var(--teal)] transition-all bg-[var(--surface)]"
                  >
                    Ver qué incluye
                  </button>
                </div>

                {/* Quick facts */}
                <div className="flex flex-wrap gap-4">
                  {quickFacts.map((fact, i) => {
                    const FactIcon = fact.icon;
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-2.5 px-4 py-2.5 rounded-[14px] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-card)]"
                      >
                        <div
                          className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0"
                          style={{ backgroundColor: fact.bg, color: fact.color }}
                        >
                          <FactIcon size={15} />
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-[var(--ink)] leading-tight">
                            {fact.label}
                          </p>
                          <p className="text-[11px] text-[var(--ink3)] leading-tight">
                            {fact.sub}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: image placeholder + price card */}
              <div data-reveal className="relative hidden lg:block">
                <div
                  className="relative w-full h-[420px] rounded-[28px] border border-[var(--line)] overflow-hidden shadow-[var(--shadow-pop)]"
                  style={{ background: imageGradient }}
                >
                  {/* Image label */}
                  <div className="absolute bottom-5 left-5 right-5">
                    <span className="text-[12px] text-[var(--ink3)] font-medium italic">
                      {imageLabel}
                    </span>
                  </div>
                </div>

                {/* Floating price card */}
                <div className="absolute -bottom-6 -left-6 bg-[var(--surface)] rounded-[20px] border border-[var(--line)] shadow-[var(--shadow-pop)] px-5 py-4 min-w-[180px]">
                  <p className="text-[11px] text-[var(--ink3)] uppercase tracking-[0.12em] font-bold mb-1">
                    {priceLabel}
                  </p>
                  <p
                    className="font-display text-[28px] font-semibold leading-none mb-1"
                    style={{ color: "var(--teal-dark)" }}
                  >
                    {price}
                  </p>
                  <p className="text-[12px] text-[var(--ink3)]">{priceSub}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. QUÉ INCLUYE ──────────────────────────────────────────────── */}
        <section id="detalle" className="py-20 px-4 bg-[var(--bg)]">
          <div className="max-w-[1100px] mx-auto">
            <div data-reveal className="text-center mb-12">
              <p
                className="text-[11px] tracking-[0.18em] uppercase font-bold mb-3"
                style={{ color: "var(--teal-dark)" }}
              >
                Contenido
              </p>
              <h2 className="font-display text-[32px] sm:text-[38px] font-semibold text-[var(--ink)] mb-4">
                {includesTitle}
              </h2>
              <p className="text-[16px] text-[var(--ink2)] leading-relaxed max-w-[560px] mx-auto">
                {includesDescription}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {includes.map((card, i) => {
                const CardIcon = card.icon;
                return (
                  <div
                    key={i}
                    data-reveal
                    className="rounded-[20px] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-pop)]"
                  >
                    <div
                      className="w-11 h-11 rounded-[12px] flex items-center justify-center mb-4"
                      style={{ backgroundColor: card.iconBg, color: card.iconColor }}
                    >
                      <CardIcon size={20} />
                    </div>
                    <h3 className="font-semibold text-[15px] text-[var(--ink)] mb-2">
                      {card.title}
                    </h3>
                    <p className="text-[13.5px] text-[var(--ink2)] leading-relaxed">
                      {card.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── 3. STEPS + SIDE PANEL ────────────────────────────────────────── */}
        <section className="py-20 px-4 bg-[var(--surface)]">
          <div className="max-w-[1100px] mx-auto grid lg:grid-cols-2 gap-12">
            {/* Left: steps */}
            <div data-reveal>
              <p
                className="text-[11px] tracking-[0.18em] uppercase font-bold mb-2"
                style={{ color: "var(--teal-dark)" }}
              >
                Proceso
              </p>
              <h2 className="font-display text-[28px] font-semibold text-[var(--ink)] mb-2">
                Cómo es la consulta
              </h2>
              <p
                className="text-[13px] uppercase tracking-[0.10em] font-semibold mb-8"
                style={{ color: "var(--ink3)" }}
              >
                Paso a paso
              </p>

              <ol className="space-y-6">
                {steps.map((step, i) => (
                  <li key={i} className="flex gap-4">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-[13px] font-bold"
                      style={{ backgroundColor: "var(--teal-dark)" }}
                    >
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-[15px] text-[var(--ink)] mb-1">
                        {step.title}
                      </p>
                      <p className="text-[13.5px] text-[var(--ink2)] leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* Right: side panel */}
            <div data-reveal className="flex flex-col gap-5">
              <div className="rounded-[20px] border border-[var(--line)] bg-[var(--bg)] p-7 shadow-[var(--shadow-card)]">
                <p
                  className="text-[11px] tracking-[0.18em] uppercase font-bold mb-1"
                  style={{ color: "var(--teal-dark)" }}
                >
                  {sidePanelEyebrow}
                </p>
                <h3 className="font-display text-[20px] font-semibold text-[var(--ink)] mb-2">
                  {sidePanelTitle}
                </h3>
                <p className="text-[13.5px] text-[var(--ink2)] leading-relaxed mb-5">
                  {sidePanelDescription}
                </p>

                <div className="divide-y divide-[var(--line)]">
                  {sidePanelRows.map((row, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5">
                      <span className="text-[13px] text-[var(--ink2)]">{row.label}</span>
                      <span className="text-[13px] font-semibold text-[var(--ink)]">
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Callout */}
              <div className="flex gap-3 rounded-[16px] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
                <Info
                  size={18}
                  className="shrink-0 mt-0.5"
                  style={{ color: "var(--teal-dark)" }}
                />
                <p className="text-[13px] text-[var(--ink2)] leading-relaxed">
                  {sidePanelCallout}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 4. PREPARATION + FAQ ─────────────────────────────────────────── */}
        <section className="py-20 px-4 bg-[var(--bg)]">
          <div className="max-w-[1100px] mx-auto grid lg:grid-cols-2 gap-12">
            {/* Left: checklist */}
            <div data-reveal>
              <p
                className="text-[11px] tracking-[0.18em] uppercase font-bold mb-2"
                style={{ color: "var(--teal-dark)" }}
              >
                {prepEyebrow}
              </p>
              <h2 className="font-display text-[28px] font-semibold text-[var(--ink)] mb-7">
                {prepTitle}
              </h2>

              <ul className="space-y-4">
                {checklist.map((item, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ backgroundColor: "rgba(123,181,189,0.20)", color: "var(--teal-dark)" }}
                    >
                      <Check size={13} strokeWidth={2.5} />
                    </div>
                    <div>
                      <span className="font-semibold text-[14px] text-[var(--ink)]">
                        {item.bold}
                      </span>
                      {item.text && (
                        <span className="text-[14px] text-[var(--ink2)]">
                          {" "}
                          — {item.text}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: FAQ accordion */}
            <div data-reveal>
              <h2 className="font-display text-[28px] font-semibold text-[var(--ink)] mb-7">
                Preguntas frecuentes
              </h2>

              <div className="space-y-3">
                {faqs.map((faq, i) => (
                  <details
                    key={i}
                    open={i === 0}
                    className="group rounded-[16px] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-card)] overflow-hidden"
                  >
                    <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer list-none text-[14px] font-semibold text-[var(--ink)] hover:text-[var(--teal-dark)] transition-colors select-none">
                      {faq.question}
                      <span className="text-[var(--teal-dark)] shrink-0 transition-transform duration-200 group-open:rotate-180">
                        ▾
                      </span>
                    </summary>
                    <div className="px-5 pb-4 text-[13.5px] text-[var(--ink2)] leading-relaxed border-t border-[var(--line)] pt-3">
                      {faq.answer}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 5. RELATED SERVICES ──────────────────────────────────────────── */}
        <section className="py-20 px-4 bg-[var(--surface)]">
          <div className="max-w-[1100px] mx-auto">
            <div data-reveal className="mb-10">
              <h2 className="font-display text-[28px] font-semibold text-[var(--ink)]">
                Otros servicios
              </h2>
            </div>

            <div className="grid sm:grid-cols-3 gap-5">
              {relatedServices.map((svc, i) => {
                const SvcIcon = svc.icon;
                return (
                  <div
                    key={i}
                    data-reveal
                    className="rounded-[20px] border border-[var(--line)] bg-[var(--bg)] p-6 shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-pop)]"
                  >
                    <div
                      className="w-10 h-10 rounded-[12px] flex items-center justify-center mb-4"
                      style={{ backgroundColor: svc.iconBg, color: svc.iconColor }}
                    >
                      <SvcIcon size={18} />
                    </div>
                    <h3 className="font-semibold text-[15px] text-[var(--ink)] mb-3">
                      {svc.title}
                    </h3>
                    <Link
                      to={`/servicios/${svc.slug}`}
                      className="inline-flex items-center gap-1.5 text-[13px] font-semibold transition-colors hover:gap-2.5"
                      style={{ color: "var(--teal-dark)" }}
                    >
                      Más información
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── 6. CTA BANNER ────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden py-20 px-4">
          {/* Gradient bg */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, var(--teal-dark) 0%, var(--teal) 100%)",
            }}
          />
          {/* Blobs */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 -right-20 w-[320px] h-[320px] rounded-full blur-[80px] opacity-20 bg-white"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -left-20 w-[280px] h-[280px] rounded-full blur-[80px] opacity-15 bg-white"
          />

          <div
            data-reveal
            className="relative max-w-[700px] mx-auto text-center"
          >
            <h2 className="font-display text-[32px] sm:text-[38px] font-semibold text-white mb-4 leading-tight">
              {ctaHeading}
            </h2>
            <p className="text-[16px] text-white/80 leading-relaxed mb-8 max-w-[480px] mx-auto">
              {ctaDescription}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/booking"
                className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[14px] font-semibold bg-white transition-all hover:opacity-90 shadow-[0_4px_20px_rgba(0,0,0,0.20)]"
                style={{ color: "var(--teal-dark)" }}
              >
                {ctaButtonLabel}
                <ArrowRight size={15} />
              </Link>

              <a
                href="https://wa.me/56958455537"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[14px] font-semibold text-white border border-white/40 hover:border-white/70 transition-all"
              >
                <WhatsAppIcon size={16} />
                WhatsApp
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

// Re-export icon helpers so page files can import from one place
export { Clock, MapPin, Wifi };
