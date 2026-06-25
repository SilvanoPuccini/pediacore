import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Clock, Eye } from "lucide-react";
import api from "@/lib/api";
import estefiAvatar from "@/assets/estefi-avatar.png";
import type { VideoResource, PaginatedResponse } from "@/types/api";
import {
  getCategoryConfig,
  CategoryBadge,
  formatSeconds,
  getYouTubeThumbnail,
} from "./VideosPage";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard) return navigator.clipboard.writeText(text);
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
  return Promise.resolve();
}

// ─── Related video card ───────────────────────────────────────────────────────

function RelatedVideoCard({ video }: { video: VideoResource }) {
  const cfg = getCategoryConfig(video.category);
  const thumbUrl = video.thumbnail || getYouTubeThumbnail(video.youtube_url);
  return (
    <Link
      to={`/videos/${video.slug}`}
      className="video-card group block bg-surface border border-line rounded-[20px] overflow-hidden"
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
        <div className="absolute inset-0 flex items-center justify-center bg-ink/0 group-hover:bg-ink/20 transition-colors">
          <span
            className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center transition-transform duration-240 group-hover:scale-[1.12]"
            style={{ boxShadow: "var(--shadow-pop)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#4A8590">
              <polygon points="6 3 20 12 6 21 6 3" />
            </svg>
          </span>
        </div>
        <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-ink/80 text-white text-[10px] font-semibold">
          {video.duration_formatted || formatSeconds(video.duration_seconds)}
        </span>
        {video.video_number && (
          <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-ink/60 text-white text-[9px] font-bold">
            #{video.video_number}
          </span>
        )}
      </div>
      <div className="p-3">
        <CategoryBadge category={video.category} small />
        <h3 className="mt-1.5 text-[13px] font-bold text-ink leading-snug group-hover:text-teal-dark transition-colors line-clamp-2">
          {video.title}
        </h3>
      </div>
    </Link>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function VideoDetailSkeleton() {
  return (
    <div className="max-w-[900px] mx-auto px-6 pt-6 mt-16 animate-pulse">
      <div className="h-5 w-32 bg-line/50 rounded mb-6" />
      <div className="aspect-video bg-line/40 rounded-[20px] mb-6" />
      <div className="space-y-3">
        <div className="h-4 w-20 bg-line/40 rounded-full" />
        <div className="h-8 w-3/4 bg-line/60 rounded" />
        <div className="h-4 w-full bg-line/30 rounded" />
        <div className="h-4 w-2/3 bg-line/30 rounded" />
      </div>
    </div>
  );
}

// ─── Share buttons ────────────────────────────────────────────────────────────

function ShareButtons({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.href : "";
  const waHref = `https://wa.me/?text=${encodeURIComponent(title + " " + url)}`;
  const igHref = "https://www.instagram.com/estefiortigosa.pediatra/";
  const btnCls =
    "inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] bg-surface border border-line text-[12px] font-semibold text-ink2 hover:opacity-80 transition";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <a href={waHref} target="_blank" rel="noreferrer" className={btnCls}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
        </svg>
        WhatsApp
      </a>
      <a href={igHref} target="_blank" rel="noreferrer" className={btnCls}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E1306C" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="5" /><circle cx="17.5" cy="6.5" r="1.5" fill="#E1306C" stroke="none" />
        </svg>
        Instagram
      </a>
      <button
        onClick={() => {
          copyToClipboard(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          });
        }}
        className={btnCls}
        title={copied ? "¡Copiado!" : "Copiar link"}
      >
        {copied ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        )}
        {copied ? "¡Copiado!" : "Copiar"}
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VideoDetailPage() {
  const { slug } = useParams<{ slug: string }>();

  // Fetch video detail
  const { data: video, isLoading, isError } = useQuery<VideoResource>({
    queryKey: ["video", slug],
    queryFn: async () => {
      const res = await api.get<VideoResource>(`/content/videos/${slug}/`);
      return res.data;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });

  // Increment view count on mount
  const incrementView = useMutation({
    mutationFn: (s: string) => api.post(`/content/videos/${s}/increment_view/`),
  });

  useEffect(() => {
    if (slug) {
      incrementView.mutate(slug);
    }
    // Only run on mount / slug change — intentionally excluding incrementView from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Fetch "more videos" for the bottom section
  const { data: moreData } = useQuery<PaginatedResponse<VideoResource>>({
    queryKey: ["videos-more"],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<VideoResource>>("/content/videos/", {
        params: { page_size: 5 },
      });
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const moreVideos = (moreData?.results ?? [])
    .filter((v) => v.slug !== slug)
    .slice(0, 4);

  if (isLoading) return <VideoDetailSkeleton />;

  if (isError || !video) {
    return (
      <div className="max-w-[760px] mx-auto px-6 py-20 text-center">
        <p className="text-ink2 text-[15px]">No se pudo cargar el video.</p>
        <Link
          to="/videos"
          className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-semibold text-teal-dark hover:underline"
        >
          ← Volver a videos
        </Link>
      </div>
    );
  }

  const publishedDate = video.published_at
    ? new Date(video.published_at).toLocaleDateString("es-CL", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

  return (
    <>
      <style>{`
        .video-card { transition: transform 280ms cubic-bezier(0.22,1,0.36,1), box-shadow 280ms cubic-bezier(0.22,1,0.36,1); }
        .video-card:hover { transform: translateY(-4px); box-shadow:0 14px 40px rgba(15,23,42,0.08); }
      `}</style>

      <div className="overflow-x-hidden">

        {/* ── Back link ── */}
        <div className="max-w-[960px] mx-auto px-6 pt-6 mt-16">
          <Link
            to="/videos"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink2 hover:text-teal-dark transition"
          >
            <ArrowLeft size={14} />
            Volver a videos
          </Link>
        </div>

        {/* ── YouTube embed ── */}
        <div className="max-w-[960px] mx-auto px-6 mt-5">
          <div
            className="relative aspect-video rounded-[20px] overflow-hidden border border-line"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <iframe
              key={video.id}
              src={video.youtube_embed_url}
              title={video.title}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>

        {/* ── Video info ── */}
        <div className="max-w-[960px] mx-auto px-6 mt-6">

          {/* Meta row */}
          <div className="flex items-center gap-3 flex-wrap">
            <CategoryBadge category={video.category} />
            <span className="flex items-center gap-1 text-[12px] text-ink3">
              <Clock size={12} />
              {video.duration_formatted || formatSeconds(video.duration_seconds)}
            </span>
            <span className="flex items-center gap-1 text-[12px] text-ink3">
              <Eye size={12} />
              {video.view_count.toLocaleString("es-CL")} vistas
            </span>
            {video.video_number && (
              <span className="text-[11px] font-bold text-ink3/60 tracking-wide">
                #{video.video_number}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="mt-3 font-display text-[28px] sm:text-[34px] leading-tight text-ink tracking-tight">
            {video.title}
          </h1>

          {/* Author + share row */}
          <div className="mt-4 flex items-center justify-between flex-wrap gap-4">
            {/* Author */}
            <div className="flex items-center gap-2.5">
              <img
                src={estefiAvatar}
                alt={video.author_name}
                width={72}
                height={72}
                className="w-9 h-9 rounded-full bg-teal/20 shrink-0"
              />
              <div className="leading-tight">
                <div className="text-[13px] font-bold text-ink">{video.author_name}</div>
                {publishedDate && (
                  <div className="text-[11px] text-ink3">{publishedDate}</div>
                )}
              </div>
            </div>

            {/* Share */}
            <ShareButtons title={video.title} />
          </div>

          {/* Description */}
          {video.description && (
            <p className="mt-5 text-[14px] text-ink2 leading-relaxed border-t border-line/70 pt-5">
              {video.description}
            </p>
          )}

          {/* Chapters */}
          {video.chapters && video.chapters.length > 0 && (
            <div
              className="mt-6 bg-surface border border-line rounded-[16px] p-4"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <h2 className="font-display text-[15px] text-ink mb-3">Capítulos</h2>
              <ol className="space-y-2">
                {video.chapters.map((ch, i) => (
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

        {/* ── More videos ── */}
        {moreVideos.length > 0 && (
          <section className="max-w-[960px] mx-auto px-6 mt-14 pb-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-[22px] text-ink">Más videos</h2>
              <Link
                to="/videos"
                className="text-[13px] font-semibold text-teal-dark hover:underline"
              >
                Ver todos
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {moreVideos.map((v) => (
                <RelatedVideoCard key={v.id} video={v} />
              ))}
            </div>
          </section>
        )}

        {/* Bottom back link when no more videos */}
        {moreVideos.length === 0 && (
          <div className="max-w-[960px] mx-auto px-6 mt-10 pb-16 text-center">
            <Link
              to="/videos"
              className="inline-flex items-center gap-1.5 px-5 py-3 rounded-[12px] bg-surface border border-line text-[13.5px] font-semibold text-ink2 hover:bg-bg transition"
            >
              <ArrowLeft size={14} />
              Volver a videos
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
