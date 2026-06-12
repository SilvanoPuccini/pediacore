import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, Clock, Eye, ChevronUp, Play } from "lucide-react";
import api from "@/lib/api";
import type { VideoResource, PaginatedResponse } from "@/types/api";

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORIES: Record<string, { label: string; bg: string; color: string; tint: string }> = {
  URGENCIAS:         { label: "Urgencias",         bg: "rgba(252,165,165,0.28)", color: "#B5544F", tint: "linear-gradient(150deg, rgba(252,165,165,0.55), rgba(245,213,193,0.3))" },
  LACTANCIA:         { label: "Lactancia",         bg: "rgba(249,168,212,0.28)", color: "#B05680", tint: "linear-gradient(150deg, rgba(249,168,212,0.5), rgba(243,168,161,0.3))" },
  ALIMENTACION:      { label: "Alimentación",      bg: "rgba(134,239,172,0.3)",  color: "#3F8358", tint: "linear-gradient(150deg, rgba(134,239,172,0.5), rgba(168,201,168,0.3))" },
  SUENO:             { label: "Sueño",             bg: "rgba(196,181,253,0.3)",  color: "#6B569E", tint: "linear-gradient(150deg, rgba(196,181,253,0.5), rgba(123,181,189,0.3))" },
  PRIMEROS_AUXILIOS: { label: "Primeros auxilios", bg: "rgba(123,181,189,0.25)", color: "#3F7079", tint: "linear-gradient(150deg, rgba(123,181,189,0.55), rgba(229,184,71,0.25))" },
  DESARROLLO:        { label: "Desarrollo",        bg: "rgba(252,211,77,0.40)",  color: "#9C7423", tint: "linear-gradient(150deg, rgba(229,184,71,0.45), rgba(168,201,168,0.3))" },
  CONSEJOS:          { label: "Consejos",          bg: "rgba(94,234,212,0.30)",  color: "#2E7D72", tint: "linear-gradient(150deg, rgba(94,234,212,0.45), rgba(123,181,189,0.3))" },
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

function getCategoryConfig(category: string) {
  return CATEGORIES[category] ?? { label: category, bg: "rgba(123,181,189,0.25)", color: "#3F7079", tint: "linear-gradient(150deg, rgba(123,181,189,0.5), rgba(168,201,168,0.3))" };
}

function formatSeconds(seconds: number): string {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CategoryBadge({ category, small = false }: { category: string; small?: boolean }) {
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

function VideoThumbnail({
  video,
  size = "default",
}: {
  video: VideoResource;
  size?: "default" | "small";
}) {
  const cfg = getCategoryConfig(video.category);
  if (video.thumbnail) {
    return (
      <img
        src={video.thumbnail}
        alt={video.title}
        className="absolute inset-0 w-full h-full object-cover"
      />
    );
  }
  return (
    <div
      className="absolute inset-0"
      style={{ background: cfg.tint }}
    >
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(44,44,44,0.08) 0 1px, transparent 1px 14px)",
        }}
      />
      {size === "default" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Play size={28} className="text-white/60" />
        </div>
      )}
    </div>
  );
}

function PlaylistItem({
  video,
  isActive,
  onClick,
}: {
  video: VideoResource;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-3 p-3 rounded-[14px] text-left transition-colors ${
        isActive
          ? "bg-teal/10 border border-teal/30"
          : "hover:bg-bg border border-transparent"
      }`}
    >
      <div className="relative w-[88px] shrink-0 aspect-video rounded-[10px] overflow-hidden bg-line/20">
        <VideoThumbnail video={video} size="small" />
        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-ink/75 text-white text-[9px] font-semibold">
          {video.duration_formatted || formatSeconds(video.duration_seconds)}
        </span>
      </div>
      <div className="flex-1 min-w-0 py-0.5">
        <CategoryBadge category={video.category} small />
        <p
          className={`mt-1 text-[12.5px] font-semibold leading-snug line-clamp-2 ${
            isActive ? "text-teal-dark" : "text-ink"
          }`}
        >
          {video.title}
        </p>
        {video.video_number && (
          <span className="text-[10px] text-ink3 font-bold">#{video.video_number}</span>
        )}
      </div>
    </button>
  );
}

function VideoCardGrid({ video, onClick }: { video: VideoResource; onClick: () => void }) {
  const cfg = getCategoryConfig(video.category);
  return (
    <button
      onClick={onClick}
      className="video-card group w-full text-left bg-surface border border-line rounded-[20px] overflow-hidden"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div
        className="relative aspect-video overflow-hidden"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(44,44,44,0.04) 0 1px, transparent 1px 14px), linear-gradient(160deg, #F4ECE5, #E8E2DB)",
        }}
      >
        <div className="absolute inset-0" style={{ background: cfg.tint }} />
        <div className="absolute inset-0 flex items-center justify-center">
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
    </button>
  );
}

function PlayerSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="aspect-video rounded-[20px] bg-line/40" />
      <div className="space-y-2">
        <div className="h-4 w-24 bg-line/40 rounded-full" />
        <div className="h-7 w-3/4 bg-line/60 rounded" />
        <div className="h-4 w-full bg-line/30 rounded" />
        <div className="h-4 w-2/3 bg-line/30 rounded" />
      </div>
    </div>
  );
}

function PlaylistSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-3 p-3">
          <div className="w-[88px] aspect-video rounded-[10px] bg-line/40 shrink-0" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-3 w-16 bg-line/40 rounded-full" />
            <div className="h-4 w-full bg-line/50 rounded" />
            <div className="h-3 w-2/3 bg-line/30 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function VideosPage() {
  const [activeCategory, setActiveCategory] = useState("");
  const [activeVideo, setActiveVideo] = useState<VideoResource | null>(null);
  const [showToTop, setShowToTop] = useState(false);

  useEffect(() => {
    const handler = () => setShowToTop(window.scrollY > 300);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["videos", activeCategory],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (activeCategory) params.category = activeCategory;
      const res = await api.get<PaginatedResponse<VideoResource>>("/content/videos/", { params });
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const incrementView = useMutation({
    mutationFn: (slug: string) =>
      api.post(`/content/videos/${slug}/increment_view/`),
  });

  const videos = data?.results ?? [];

  // Select first video by default when list loads
  useEffect(() => {
    if (videos.length > 0 && !activeVideo) {
      setActiveVideo(videos[0]);
    }
  }, [videos, activeVideo]);

  // Reset active video when category changes
  useEffect(() => {
    setActiveVideo(null);
  }, [activeCategory]);

  function selectVideo(video: VideoResource) {
    setActiveVideo(video);
    incrementView.mutate(video.slug);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const mainVideos = activeVideo
    ? videos.filter((v) => v.id !== activeVideo.id)
    : videos.slice(1);

  return (
    <>
      <style>{`
        .blob { position:absolute; border-radius:50%; filter:blur(46px); opacity:0.5; pointer-events:none; }
        .video-card { transition: transform 280ms cubic-bezier(0.22,1,0.36,1), box-shadow 280ms cubic-bezier(0.22,1,0.36,1); }
        .video-card:hover { transform: translateY(-4px); box-shadow:0 14px 40px rgba(15,23,42,0.08); }
        .filter-scroll { scrollbar-width:none; }
        .filter-scroll::-webkit-scrollbar { display:none; }
        .playlist-scroll { scrollbar-width:thin; scrollbar-color: var(--line) transparent; }
        .playlist-scroll::-webkit-scrollbar { width:4px; }
        .playlist-scroll::-webkit-scrollbar-track { background:transparent; }
        .playlist-scroll::-webkit-scrollbar-thumb { background:var(--line); border-radius:4px; }
        @keyframes pulse-ring { 0%,100% { transform:scale(1); opacity:0.8; } 50% { transform:scale(1.15); opacity:0.4; } }
        .pulse-ring { animation: pulse-ring 2s cubic-bezier(0.4,0,0.6,1) infinite; }
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
                en 2 minutos
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
        {isLoading && (
          <div className="grid lg:grid-cols-[1fr_360px] gap-8">
            <PlayerSkeleton />
            <div
              className="bg-surface border border-line rounded-[20px] p-5"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="h-5 w-40 bg-line/50 rounded mb-4 animate-pulse" />
              <PlaylistSkeleton />
            </div>
          </div>
        )}

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
              {activeCategory
                ? "No hay videos en esta categoría todavía"
                : "Pronto van a estar disponibles los videos"}
            </div>
            <div className="text-[13px] text-ink3 mt-2 max-w-[340px] mx-auto">
              {activeCategory
                ? "Probá con otra categoría o mirá todos los videos disponibles."
                : "La Dra. Estefanía está preparando el contenido. Volvé pronto."}
            </div>
            {activeCategory && (
              <button
                onClick={() => setActiveCategory("")}
                className="mt-5 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-[10px] bg-teal-dark text-white text-[13px] font-semibold hover:opacity-90 transition"
              >
                Ver todos los videos
              </button>
            )}
          </div>
        )}

        {/* Player + Playlist layout */}
        {!isLoading && !isError && videos.length > 0 && (
          <>
            <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
              {/* Player area */}
              <div>
                {/* YouTube embed / placeholder */}
                <div
                  className="relative aspect-video rounded-[20px] overflow-hidden border border-line"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  {activeVideo ? (
                    <iframe
                      key={activeVideo.id}
                      src={activeVideo.youtube_embed_url}
                      title={activeVideo.title}
                      className="absolute inset-0 w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{
                        background: getCategoryConfig(videos[0]?.category ?? "").tint,
                      }}
                    >
                      <div className="relative flex items-center justify-center">
                        <span
                          className="pulse-ring absolute w-20 h-20 rounded-full"
                          style={{ background: "rgba(255,255,255,0.25)" }}
                        />
                        <span
                          className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center relative z-10"
                          style={{ boxShadow: "var(--shadow-pop)" }}
                        >
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="#4A8590">
                            <polygon points="6 3 20 12 6 21 6 3" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Video info */}
                {activeVideo && (
                  <div className="mt-5 space-y-4">
                    {/* Meta row */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <CategoryBadge category={activeVideo.category} />
                      <span className="flex items-center gap-1 text-[12px] text-ink3">
                        <Clock size={12} />
                        {activeVideo.duration_formatted || formatSeconds(activeVideo.duration_seconds)}
                      </span>
                      <span className="flex items-center gap-1 text-[12px] text-ink3">
                        <Eye size={12} />
                        {activeVideo.view_count.toLocaleString("es-CL")} vistas
                      </span>
                      {activeVideo.video_number && (
                        <span className="text-[11px] font-bold text-ink3/60 tracking-wide">
                          #{activeVideo.video_number}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h2 className="font-display text-[24px] leading-tight text-ink">
                      {activeVideo.title}
                    </h2>

                    {/* Author + actions row */}
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src="/images/estefi-avatar.png"
                          alt={activeVideo.author_name}
                          width={72}
                          height={72}
                          className="w-9 h-9 rounded-full bg-teal/20 shrink-0"
                        />
                        <div className="leading-tight">
                          <div className="text-[13px] font-bold text-ink">{activeVideo.author_name}</div>
                          <div className="text-[11px] text-ink3">
                            {new Date(activeVideo.published_at).toLocaleDateString("es-CL", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Share buttons */}
                      <div className="flex items-center gap-2">
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(activeVideo.title + " " + window.location.origin + "/videos")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] bg-surface border border-line text-[12px] font-semibold text-ink2 hover:opacity-80 transition"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
                          </svg>
                          WhatsApp
                        </a>
                        <a
                          href="https://www.instagram.com/estefiortigosa.pediatra/"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] bg-surface border border-line text-[12px] font-semibold text-ink2 hover:opacity-80 transition"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E1306C" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="5" /><circle cx="17.5" cy="6.5" r="1.5" fill="#E1306C" stroke="none" />
                          </svg>
                          Instagram
                        </a>
                        <button
                          onClick={() => navigator.clipboard?.writeText(window.location.href)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] bg-surface border border-line text-[12px] font-semibold text-ink2 hover:opacity-80 transition"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                          </svg>
                          Copiar
                        </button>
                      </div>
                    </div>

                    {/* Description */}
                    {activeVideo.description && (
                      <p className="text-[13px] text-ink2 leading-relaxed border-t border-line/70 pt-4">
                        {activeVideo.description}
                      </p>
                    )}

                    {/* Chapters */}
                    {activeVideo.chapters && activeVideo.chapters.length > 0 && (
                      <div
                        className="bg-surface border border-line rounded-[16px] p-4"
                        style={{ boxShadow: "var(--shadow-card)" }}
                      >
                        <h3 className="font-display text-[15px] text-ink mb-3">Capítulos</h3>
                        <ol className="space-y-2">
                          {activeVideo.chapters.map((ch, i) => (
                            <li key={i} className="flex items-center gap-3">
                              <span className="text-[11px] font-mono font-bold text-teal-dark bg-teal/10 px-2 py-0.5 rounded shrink-0">
                                {formatSeconds(ch.time_seconds)}
                              </span>
                              <span className="text-[13px] text-ink2">{ch.label}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Playlist sidebar */}
              <aside className="space-y-4">
                <div
                  className="bg-surface border border-line rounded-[20px] overflow-hidden"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  {/* Header */}
                  <div className="px-5 py-4 border-b border-line flex items-center justify-between">
                    <h2 className="font-display text-[16px] text-ink">Lista de reproducción</h2>
                    <span className="text-[12px] font-bold text-ink3">
                      {videos.length} video{videos.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Scrollable list */}
                  <div className="playlist-scroll overflow-y-auto max-h-[640px] p-3 space-y-1">
                    {videos.map((video) => (
                      <PlaylistItem
                        key={video.id}
                        video={video}
                        isActive={activeVideo?.id === video.id}
                        onClick={() => selectVideo(video)}
                      />
                    ))}
                  </div>
                </div>

                {/* CTA card */}
                <div
                  className="border border-line rounded-[20px] p-5 text-center"
                  style={{
                    background: "linear-gradient(to bottom right, var(--cream), var(--bg))",
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-[12px] flex items-center justify-center mx-auto mb-3"
                    style={{ background: "rgba(123,181,189,0.25)", color: "#3F7079" }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>
                    </svg>
                  </div>
                  <h3 className="font-display text-[15px] text-ink">
                    ¿Tu duda no está en un video?
                  </h3>
                  <p className="mt-1.5 text-[12px] text-ink2 leading-relaxed">
                    Agendá una consulta con la Dra. Estefanía y resolvé todas tus preguntas.
                  </p>
                  <Link
                    to="/booking"
                    className="mt-4 inline-flex items-center justify-center gap-1.5 w-full px-4 py-2.5 rounded-[10px] bg-teal-dark text-[13px] font-semibold hover:opacity-90 transition"
                    style={{ boxShadow: "var(--shadow-cta)", color: "#ffffff" }}
                  >
                    Reservar consulta
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                    </svg>
                  </Link>
                </div>
              </aside>
            </div>

            {/* More videos grid */}
            {mainVideos.length > 0 && (
              <section className="mt-14">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-display text-[22px] text-ink">Más videos</h2>
                  <span className="text-[12.5px] text-ink3">
                    {mainVideos.length} video{mainVideos.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {mainVideos.slice(0, 8).map((video) => (
                    <VideoCardGrid
                      key={video.id}
                      video={video}
                      onClick={() => selectVideo(video)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
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
