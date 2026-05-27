import { ArrowRight, Clock, CalendarDays } from "lucide-react";

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
interface BlogPost {
  title: string;
  excerpt: string;
  tag: string;
  tagColor: string;
  tagBg: string;
  date: string;
  readTime: string;
  gradientFrom: string;
  gradientTo: string;
}

// --- Data ---
const posts: BlogPost[] = [
  {
    title: "Lactancia los primeros 6 meses",
    excerpt:
      "Todo lo que necesitás saber sobre la lactancia exclusiva: cómo prender al bebé, frecuencia, señales de hambre y cómo saber si está tomando suficiente.",
    tag: "Lactancia",
    tagColor: "text-teal-dark",
    tagBg: "bg-teal/15",
    date: "12 mayo 2026",
    readTime: "5 min",
    gradientFrom: "#7BB5BD",
    gradientTo: "#A8C9A8",
  },
  {
    title: "¿Por qué mi hijo se despierta tantas veces?",
    excerpt:
      "El sueño infantil tiene sus propias reglas. Te explico los ciclos de sueño en bebés y niños, y qué es normal en cada etapa.",
    tag: "Sueño",
    tagColor: "text-mustard",
    tagBg: "bg-mustard/15",
    date: "3 mayo 2026",
    readTime: "7 min",
    gradientFrom: "#E5B847",
    gradientTo: "#F5D5C1",
  },
  {
    title: "Calendario de vacunas MINSAL 2026",
    excerpt:
      "Guía completa del Programa Nacional de Inmunizaciones actualizada para 2026: qué vacunas corresponden en cada control y por qué son importantes.",
    tag: "Vacunas",
    tagColor: "text-coral",
    tagBg: "bg-coral/15",
    date: "18 abril 2026",
    readTime: "4 min",
    gradientFrom: "#F3A8A1",
    gradientTo: "#E5B847",
  },
];

// --- BlogCard ---
function BlogCard({ post }: { post: BlogPost }) {
  return (
    <article className="group bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] overflow-hidden hover:-translate-y-1 hover:shadow-[var(--shadow-pop)] transition-all duration-300 flex flex-col">
      {/* Image placeholder with gradient */}
      <div
        className="h-[180px] relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${post.gradientFrom}40, ${post.gradientTo}60)`,
        }}
      >
        {/* Decorative pattern */}
        <svg
          className="absolute inset-0 w-full h-full opacity-10"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id={`ph-${post.tag}`} x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
              <circle cx="16" cy="16" r="1.5" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#ph-${post.tag})`} />
        </svg>
        {/* Tag badge */}
        <span
          className={`absolute top-4 left-4 ${post.tagBg} ${post.tagColor} text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wide`}
        >
          {post.tag}
        </span>
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col gap-3 flex-1">
        {/* Meta */}
        <div className="flex items-center gap-3 text-[12px] text-ink3">
          <span className="flex items-center gap-1">
            <CalendarDays size={12} />
            {post.date}
          </span>
          <span className="w-1 h-1 rounded-full bg-line" />
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {post.readTime} lectura
          </span>
        </div>

        {/* Title */}
        <h3 className="font-display text-[20px] leading-snug text-ink group-hover:text-teal-dark transition-colors duration-200">
          {post.title}
        </h3>

        {/* Excerpt */}
        <p className="text-[13.5px] text-ink2 leading-relaxed flex-1">
          {post.excerpt}
        </p>

        {/* Read more link */}
        <a
          href="#"
          className="flex items-center gap-1.5 text-[13px] font-semibold text-teal-dark hover:gap-2.5 transition-all duration-200 mt-1"
        >
          Leer más
          <ArrowRight size={14} />
        </a>
      </div>
    </article>
  );
}

// --- Main section ---
export default function BlogSection() {
  return (
    <section id="blog" className="bg-surface border-y border-line py-24 lg:py-32">
      <div className="max-w-[1280px] mx-auto px-6">
        {/* Header */}
        <div className="flex items-end justify-between mb-12">
          <div>
            <Eyebrow label="Blog" />
            <h2 className="font-display text-[36px] lg:text-[48px] leading-[1.05] text-ink tracking-tight">
              Notas para mamás y papás.
            </h2>
          </div>
          <a
            href="#"
            className="hidden md:flex items-center gap-1.5 text-[13.5px] font-semibold text-teal-dark hover:gap-2.5 transition-all duration-200 shrink-0 mb-2"
          >
            Ver todo el blog
            <ArrowRight size={15} />
          </a>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {posts.map((post) => (
            <BlogCard key={post.title} post={post} />
          ))}
        </div>

        {/* Mobile "ver todo" link */}
        <div className="flex justify-center mt-8 md:hidden">
          <a
            href="#"
            className="flex items-center gap-1.5 text-[13.5px] font-semibold text-teal-dark"
          >
            Ver todo el blog
            <ArrowRight size={15} />
          </a>
        </div>
      </div>
    </section>
  );
}
