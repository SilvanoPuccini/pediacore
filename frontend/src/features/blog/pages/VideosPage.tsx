import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, ChevronUp } from "lucide-react";
import api from "@/lib/api";
import type { VideoResource, PaginatedResponse } from "@/types/api";
import ContentSearchBar from "../components/ContentSearchBar";

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORIES: Record<string, { label: string; bg: string; color: string; tint: string }> = {
  URGENCIAS:         { label: "Urgencias",         bg: "rgba(185,28,28,0.22)",   color: "#DC2626", tint: "linear-gradient(150deg, rgba(239,68,68,0.50), rgba(254,226,226,0.30))" },
  LACTANCIA:         { label: "Lactancia",         bg: "rgba(234,179,8,0.22)",   color: "#CA8A04", tint: "linear-gradient(150deg, rgba(250,204,21,0.50), rgba(254,240,138,0.30))" },
  ALIMENTACION:      { label: "Alimentación",      bg: "rgba(110,231,183,0.30)",  color: "#10B981", tint: "linear-gradient(150deg, rgba(110,231,183,0.50), rgba(167,243,208,0.30))" },
  SUENO:             { label: "Sueño",             bg: "rgba(37,99,235,0.25)",   color: "#2563EB", tint: "linear-gradient(150deg, rgba(96,165,250,0.50), rgba(147,197,253,0.30))" },
  PRIMEROS_AUXILIOS: { label: "Primeros auxilios", bg: "rgba(185,28,28,0.22)",   color: "#DC2626", tint: "linear-gradient(150deg, rgba(239,68,68,0.50), rgba(254,226,226,0.30))" },
  DESARROLLO:        { label: "Desarrollo",        bg: "rgba(249,115,22,0.25)",  color: "#EA580C", tint: "linear-gradient(150deg, rgba(251,146,60,0.50), rgba(253,186,116,0.30))" },
  CONSEJOS:          { label: "Consejos",          bg: "rgba(124,58,237,0.25)",  color: "#7C3AED", tint: "linear-gradient(150deg, rgba(167,139,250,0.50), rgba(196,181,253,0.30))" },
};

const CATEGORY_FILTERS = [
  { label: "Todos",             value: "" },
  { label: "Urgencias",        value: "URGENCIAS" },
  { label: "Lactancia",        value: "LACTANCIA" },
  { label: "Alimentación",     value: "ALIMENTACION" },
  { label: "Sueño",            value: "SUENO" },
  { label: "Primeros auxilios", value: "PRIMEROS_AUXILIOS" },
  { label: "Desarrollo",       value: "DESARROLLO" },
  { label: "Consejos",         value: "CONSEJOS" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getCategoryConfig(category: string) {
  return CATEGORIES[category] ?? { label: category, bg: "rgba(123,181,189,0.25)", color: "#3F7079", tint: "linear-gradient(150deg, rgba(123,181,189,0.5), rgba(168,201,168,0.3))" };
}

export function formatSeconds(seconds: number): string {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function getYouTubeThumbnail(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/
  );
  return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

export function CategoryBadge({ category, small = false }: { category: string; small?: boolean }) {
  const cfg = getCategoryConfig(category);
  return (
    <span
      className={`inline-block rounded-md font-bold uppercase tracking-wider whitespace-nowrap ${small ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[10.5px]"}`}
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

function VideoCard({ video }: { video: VideoResource }) {
  const cfg = getCategoryConfig(video.category);
  const thumbUrl = video.thumbnail || getYouTubeThumbnail(video.youtube_url);
  return (
    <Link
      to={`/videos/${video.slug}`}
      className="video-card group block w-full text-left bg-surface border border-line rounded-[20px] overflow-hidden"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="relative aspect-video overflow-hidden bg-line/20">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={video.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0" style={{ background: cfg.tint }} />
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-ink/0 group-hover:bg-ink/20 transition-colors">
          <span
            className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center transition-transform duration-240 group-hover:scale-[1.12]"
            style={{ boxShadow: "var(--shadow-pop)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#4A8590">
              <polygon points="6 3 20 12 6 21 6 3" />
            </svg>
          </span>
        </div>
        <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-ink/80 text-white text-[10.5px] font-semibold">
          {video.duration_formatted || formatSeconds(video.duration_seconds)}
        </span>
        {video.video_number && (
          <span className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-ink/60 text-white text-[10px] font-bold">
            #{video.video_number}
          </span>
        )}
      </div>
      <div className="p-4">
        <CategoryBadge category={video.category} small />
        <h3 className="mt-2 text-[14px] font-bold text-ink leading-snug group-hover:text-teal-dark transition-colors line-clamp-2">
          {video.title}
        </h3>
      </div>
    </Link>
  );
}

function GridSkeleton() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="animate-pulse bg-surface border border-line rounded-[20px] overflow-hidden">
          <div className="aspect-video bg-line/40" />
          <div className="p-4 space-y-2">
            <div className="h-3 w-16 bg-line/40 rounded-full" />
            <div className="h-4 w-full bg-line/50 rounded" />
            <div className="h-4 w-3/4 bg-line/30 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function VideosPage() {
  const [activeCategory, setActiveCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showToTop, setShowToTop] = useState(false);

  useEffect(() => {
    const handler = () => setShowToTop(window.scrollY > 300);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["videos", activeCategory, searchQuery],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (activeCategory) params.category = activeCategory;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const res = await api.get<PaginatedResponse<VideoResource>>("/content/videos/", { params });
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const videos = data?.results ?? [];

  return (
    <>
      <style>{`
        .blob { position:absolute; border-radius:50%; filter:blur(46px); opacity:0.5; pointer-events:none; }
        .video-card { transition: transform 280ms cubic-bezier(0.22,1,0.36,1), box-shadow 280ms cubic-bezier(0.22,1,0.36,1); }
        .video-card:hover { transform: translateY(-4px); box-shadow:0 14px 40px rgba(15,23,42,0.08); }
        .filter-scroll { scrollbar-width:none; }
        .filter-scroll::-webkit-scrollbar { display:none; }
      `}</style>

      <a
        href="#videos-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-3 focus:left-3 focus:bg-teal-dark focus:text-white focus:px-4 focus:py-2 focus:rounded-[10px] text-[13px] font-semibold"
      >
        Saltar al contenido
      </a>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-line pt-16">
        <span className="blob" style={{ width: 340, height: 340, background: "#F3A8A1", top: -120, left: -80, opacity: 0.45 }} />
        <span className="blob" style={{ width: 280, height: 280, background: "#7BB5BD", top: -50, right: -70, opacity: 0.4 }} />
        <span className="blob" style={{ width: 200, height: 200, background: "#C4B5FD", bottom: -60, left: "38%", opacity: 0.3 }} />
        <div className="relative max-w-[1280px] mx-auto px-6 py-12 lg:py-16">
          <div className="max-w-[640px]">
            <span
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-line text-[12px] font-semibold text-ink2"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <span
                className="w-5 h-5 rounded-md flex items-center justify-center"
                style={{ background: "rgba(243,168,161,0.3)", color: "#B5604F" }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m22 8-6 4 6 4V8Z" />
                  <rect width="14" height="12" x="2" y="6" rx="2" />
                </svg>
              </span>
              Videoteca pediátrica
            </span>
            <h1 className="mt-4 font-display text-[34px] sm:text-[42px] lg:text-[50px] leading-[1.04] text-ink tracking-tight">
              Aprendé a cuidar a tu hijo{" "}
              <em className="italic" style={{ color: "#4A8590", fontStyle: "italic" }}>
                en pocos minutos
              </em>
            </h1>
            <p className="mt-4 text-[15px] sm:text-[16px] text-ink2 leading-relaxed max-w-[520px]">
              Videos cortos y prácticos de la Dra. Estefanía sobre las dudas más frecuentes en pediatría.
            </p>
          </div>
        </div>
      </section>

      {/* ── Main content ── */}
      <main id="videos-content" className="max-w-[1280px] mx-auto px-6 py-12 lg:py-16">

        {/* Search bar */}
        <div className="max-w-2xl mx-auto mb-8">
          <ContentSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Buscar videos por título o tema..."
          />
        </div>

        {/* Category filter pills */}
        <div className="filter-scroll overflow-x-auto -mx-6 px-6 mb-10">
          <div className="flex items-center gap-2 w-max pb-1">
            {CATEGORY_FILTERS.map((cat) => {
              const isActive = activeCategory === cat.value;
              return (
                <button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  className={`px-4 py-2 rounded-full text-[12.5px] font-semibold whitespace-nowrap transition border ${
                    isActive
                      ? "bg-teal-dark text-white border-teal-dark"
                      : "bg-surface text-ink2 border-line hover:bg-bg"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading state */}
        {isLoading && <GridSkeleton />}

        {/* Error state */}
        {isError && (
          <div className="text-center py-20">
            <div className="mx-auto w-14 h-14 rounded-full bg-bg flex items-center justify-center mb-3">
              <Search size={22} color="#A0A0A0" />
            </div>
            <div className="text-[14px] font-bold text-ink">No se pudieron cargar los videos</div>
            <div className="text-[12.5px] text-ink3 mt-1">Intentá recargar la página.</div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && videos.length === 0 && (
          <div className="text-center py-20">
            <div
              className="mx-auto w-16 h-16 rounded-[16px] flex items-center justify-center mb-4"
              style={{ background: "rgba(243,168,161,0.2)", color: "#B5604F" }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m22 8-6 4 6 4V8Z" />
                <rect width="14" height="12" x="2" y="6" rx="2" />
              </svg>
            </div>
            <div className="text-[16px] font-bold text-ink">
              {searchQuery.trim()
                ? `Sin resultados para "${searchQuery}"`
                : activeCategory
                ? "No hay videos en esta categoría todavía"
                : "Pronto van a estar disponibles los videos"}
            </div>
            <div className="text-[13px] text-ink3 mt-2 max-w-[340px] mx-auto">
              {searchQuery.trim()
                ? "Probá con otras palabras o combiná con una categoría diferente."
                : activeCategory
                ? "Probá con otra categoría o mirá todos los videos disponibles."
                : "La Dra. Estefanía está preparando el contenido. Volvé pronto."}
            </div>
            {(activeCategory || searchQuery.trim()) && (
              <button
                onClick={() => { setActiveCategory(""); setSearchQuery(""); }}
                className="mt-5 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-[10px] bg-teal-dark text-white text-[13px] font-semibold hover:opacity-90 transition"
              >
                Ver todos los videos
              </button>
            )}
          </div>
        )}

        {/* Video grid */}
        {!isLoading && !isError && videos.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </main>

      {/* Back to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={`fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full bg-teal-dark text-white flex items-center justify-center transition-opacity duration-300 ${
          showToTop ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        style={{ boxShadow: "var(--shadow-pop)" }}
        aria-label="Volver al inicio"
      >
        <ChevronUp size={18} />
      </button>
    </>
  );
}
