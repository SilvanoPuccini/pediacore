import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import type { BlogPost, PaginatedResponse } from "@/types/api";

// ─── Tag color map ─────────────────────────────────────────────────────────
const TAG_COLORS: Record<string, { bg: string; color: string }> = {
  Lactancia:    { bg: "rgba(249,168,212,0.30)", color: "#B05680" },
  Vacunas:      { bg: "rgba(147,197,253,0.30)", color: "#3B6FA8" },
  Alimentación: { bg: "rgba(134,239,172,0.30)", color: "#3F8358" },
  Sueño:        { bg: "rgba(196,181,253,0.32)", color: "#6B569E" },
  Desarrollo:   { bg: "rgba(252,211,77,0.40)",  color: "#9C7423" },
  Enfermedades: { bg: "rgba(253,230,138,0.45)", color: "#9C7423" },
  Urgencias:    { bg: "rgba(252,165,165,0.30)", color: "#B5544F" },
  Consejos:     { bg: "rgba(94,234,212,0.30)",  color: "#2E7D72" },
};

const TAG_GRADIENTS: Record<string, string> = {
  Lactancia:    "linear-gradient(150deg, rgba(243,168,161,0.55), rgba(123,181,189,0.30))",
  Vacunas:      "linear-gradient(150deg, rgba(147,197,253,0.55), rgba(123,181,189,0.30))",
  Alimentación: "linear-gradient(150deg, rgba(134,239,172,0.5),  rgba(168,201,168,0.30))",
  Sueño:        "linear-gradient(150deg, rgba(196,181,253,0.5),  rgba(123,181,189,0.28))",
  Urgencias:    "linear-gradient(150deg, rgba(252,165,165,0.5),  rgba(245,213,193,0.30))",
};

const DEFAULT_GRADIENT =
  "linear-gradient(150deg, rgba(123,181,189,0.45), rgba(168,201,168,0.30))";

function getTagColor(tag: string) {
  return TAG_COLORS[tag] ?? { bg: "rgba(123,181,189,0.30)", color: "#2E7D72" };
}

function getTagGradient(tag: string) {
  return TAG_GRADIENTS[tag] ?? DEFAULT_GRADIENT;
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function parseTags(tags: string): string[] {
  return tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function estimateReadTime(html: string): number {
  const text = html.replace(/<[^>]*>/g, " ");
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

/** Sanitize HTML from backend CMS — allows rich content tags, strips scripts. */
function sanitize(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed"],
    FORBID_ATTR: ["onerror", "onload", "onclick"],
  });
}

// ─── Engagement helpers ───────────────────────────────────────────────────

interface EngagementSummary {
  useful_count: number;
  love_count: number;
  rating_count: number;
  rating_avg: number | null;
  user_engagements: string[];
  user_rating: number | null;
}

function getSessionKey(): string {
  const KEY = "pediacore_session_key";
  let key = localStorage.getItem(KEY);
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem(KEY, key);
  }
  return key;
}

function useEngagement(slug: string | undefined) {
  const queryClient = useQueryClient();
  const sessionKey = getSessionKey();

  const query = useQuery<EngagementSummary>({
    queryKey: ["engagement", slug],
    queryFn: async () => {
      const { data } = await api.get<EngagementSummary>(
        `/content/blog/${slug}/engage/`,
        { params: { session_key: sessionKey } },
      );
      return data;
    },
    enabled: !!slug,
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: async (payload: {
      engagement_type: "USEFUL" | "LOVE" | "RATING";
      value?: number;
    }) => {
      const { data } = await api.post(`/content/blog/${slug}/engage/`, {
        ...payload,
        session_key: sessionKey,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["engagement", slug] });
    },
  });

  return { data: query.data, isLoading: query.isLoading, submit: mutation.mutate };
}

// ─── Share buttons — header (with labels) ─────────────────────────────────
interface ShareButtonsInlineProps {
  title: string;
  copyLabel: string;
  onCopy: () => void;
}

function ShareButtonsInline({ title, copyLabel, onCopy }: ShareButtonsInlineProps) {
  const url = typeof window !== "undefined" ? window.location.href : "";
  const waHref  = `https://wa.me/?text=${encodeURIComponent(title + " " + url)}`;
  const igHref  = "https://www.instagram.com/estefiortigosa.pediatra/";
  const btnCls  =
    "share-btn inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] bg-surface border border-line text-[12px] font-semibold text-ink2 hover:opacity-80 transition";

  return (
    <div className="flex items-center gap-2">
      <a href={waHref} target="_blank" rel="noreferrer" className={btnCls}>
        <WhatsAppIcon />
        WhatsApp
      </a>
      <a href={igHref} target="_blank" rel="noreferrer" className={btnCls}>
        <InstagramIcon />
        Instagram
      </a>
      <button onClick={onCopy} className={btnCls}>
        <LinkIcon />
        {copyLabel}
      </button>
    </div>
  );
}

// ─── Share buttons — bottom (icon only) ───────────────────────────────────
function ShareButtonsCompact({ title }: { title: string }) {
  const url    = typeof window !== "undefined" ? window.location.href : "";
  const waHref = `https://wa.me/?text=${encodeURIComponent(title + " " + url)}`;
  const igHref = "https://www.instagram.com/estefiortigosa.pediatra/";
  const btnCls =
    "share-btn w-9 h-9 rounded-full bg-surface border border-line flex items-center justify-center hover:opacity-80 transition";

  return (
    <div className="mt-8 flex items-center justify-center gap-3">
      <span className="text-[12.5px] font-semibold text-ink2">Compartir:</span>
      <a href={waHref} target="_blank" rel="noreferrer" className={btnCls}>
        <WhatsAppIcon size={15} />
      </a>
      <a href={igHref} target="_blank" rel="noreferrer" className={btnCls}>
        <InstagramIcon size={15} />
      </a>
      <button
        onClick={() => navigator.clipboard?.writeText(url)}
        className={btnCls}
        aria-label="Copiar link"
      >
        <LinkIcon size={15} />
      </button>
    </div>
  );
}

// ─── SVG icons ────────────────────────────────────────────────────────────
function WhatsAppIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#25D366">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
    </svg>
  );
}

function InstagramIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#E1306C" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="17.5" cy="6.5" r="1.5" fill="#E1306C" stroke="none" />
    </svg>
  );
}

function LinkIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

// ─── Star rating ──────────────────────────────────────────────────────────
function StarRating({
  currentRating,
  ratingAvg,
  ratingCount,
  onRate,
}: {
  currentRating: number | null;
  ratingAvg: number | null;
  ratingCount: number;
  onRate: (value: number) => void;
}) {
  const [hover, setHover] = useState(0);
  const rated = currentRating ?? 0;

  return (
    <div>
      <div className="flex items-center justify-center gap-1.5">
        {[1, 2, 3, 4, 5].map((v) => {
          const filled = v <= (hover || rated);
          return (
            <button
              key={v}
              className="star"
              aria-label={`${v} estrella${v !== 1 ? "s" : ""}`}
              onMouseEnter={() => setHover(v)}
              onMouseLeave={() => setHover(0)}
              onClick={() => onRate(v)}
            >
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                stroke="#E5B847"
                strokeWidth="1.5"
                strokeLinejoin="round"
                fill={filled ? "#E5B847" : "none"}
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
          );
        })}
      </div>
      <div className="mt-2 text-[12.5px] text-ink3 h-4">
        {rated > 0
          ? (rated >= 4 ? "¡Gracias por tu valoración!" : "Gracias, ¡seguimos mejorando!")
          : ratingCount > 0 && ratingAvg
            ? `${ratingAvg.toFixed(1)} promedio · ${ratingCount} valoracion${ratingCount !== 1 ? "es" : ""}`
            : ""}
      </div>
    </div>
  );
}

// ─── Reactions ────────────────────────────────────────────────────────────
function Reactions({
  usefulCount,
  loveCount,
  userEngagements,
  onReact,
}: {
  usefulCount: number;
  loveCount: number;
  userEngagements: string[];
  onReact: (type: "USEFUL" | "LOVE") => void;
}) {
  const [showDudas, setShowDudas] = useState(false);
  const hasUseful = userEngagements.includes("USEFUL");
  const hasLove = userEngagements.includes("LOVE");

  return (
    <div className="mt-4">
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <button
          onClick={() => onReact("USEFUL")}
          disabled={hasUseful}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-[13px] font-semibold text-ink2 transition disabled:cursor-default"
          style={{
            background:  hasUseful ? "rgba(123,181,189,0.15)" : "var(--bg)",
            borderColor: hasUseful ? "rgba(123,181,189,0.5)"  : "var(--line)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>
          Útil ({usefulCount})
        </button>
        <button
          onClick={() => onReact("LOVE")}
          disabled={hasLove}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-[13px] font-semibold text-ink2 transition disabled:cursor-default"
          style={{
            background:  hasLove ? "rgba(123,181,189,0.15)" : "var(--bg)",
            borderColor: hasLove ? "rgba(123,181,189,0.5)"  : "var(--line)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
          Me encantó ({loveCount})
        </button>
        <button
          onClick={() => setShowDudas((v) => !v)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-bg border border-line text-[13px] font-semibold text-ink2 transition"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
          Tengo dudas
        </button>
      </div>
      {showDudas && (
        <div
          className="mt-4 p-4 rounded-[14px] text-[13px] text-ink2"
          style={{
            background: "rgba(123,181,189,0.10)",
            border:     "1px solid rgba(123,181,189,0.30)",
          }}
        >
          Podés consultarme directamente reservando una consulta.{" "}
          <Link
            to="/booking"
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-teal-dark text-[12.5px] font-semibold hover:opacity-90 transition"
            style={{ color: "#ffffff" }}
          >
            Reservar consulta
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Newsletter mini ──────────────────────────────────────────────────────
function NewsletterMini() {
  const { user, isAuthenticated } = useAuthStore();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "already" | "error">("idle");

  // Check subscription status for logged-in users
  useEffect(() => {
    if (!isAuthenticated) return;
    setEmail(user?.email ?? "");
    api
      .get<{ subscribed: boolean }>("/content/subscribe/status/")
      .then((res) => {
        if (res.data.subscribed) setState("already");
      })
      .catch(() => {});
  }, [isAuthenticated, user?.email]);

  const handleSubscribe = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setState("loading");
    try {
      const res = await api.post<{ already_subscribed: boolean }>(
        "/content/subscribe/",
        { email: trimmed, website: "" }
      );
      setState(res.data.already_subscribed ? "already" : "done");
    } catch {
      setState("error");
    }
  };

  const isDone = state === "done" || state === "already";

  return (
    <div className="bg-teal-dark rounded-[20px] p-5 text-white">
      <div className="w-9 h-9 rounded-[10px] bg-white/15 flex items-center justify-center">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      </div>
      <h3 className="mt-3 font-display text-[17px]">Recibí los artículos en tu email</h3>
      <p className="mt-1 text-[12px] text-white/80">Sin spam. Cancelá cuando quieras.</p>
      {isDone ? (
        <p className="mt-3 text-[13px] text-white/90 font-semibold">
          {state === "already" ? "Ya estás suscripto/a." : "¡Gracias! Te sumamos a la lista."}
        </p>
      ) : (
        <>
          <input
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            disabled={state === "loading" || isAuthenticated}
            className="mt-3 w-full px-3 py-2.5 rounded-[10px] bg-white/15 border border-white/25 text-white placeholder:text-white/60 text-[13px] focus:outline-none focus:ring-2 focus:ring-white/30 transition"
          />
          <button
            onClick={handleSubscribe}
            disabled={state === "loading"}
            className="mt-2 w-full px-4 py-2.5 rounded-[10px] bg-white text-teal-dark text-[13px] font-bold hover:opacity-90 transition"
          >
            {state === "loading" ? "Enviando..." : "Suscribirme"}
          </button>
          {state === "error" && (
            <p className="mt-2 text-[11px] text-white/80">Hubo un error. Intentá de nuevo.</p>
          )}
        </>
      )}
    </div>
  );
}

// ─── Related card (bottom grid) ───────────────────────────────────────────
function RelatedCard({ post }: { post: BlogPost }) {
  const tags       = parseTags(post.tags);
  const primaryTag = tags[0] ?? "";
  const tagColor   = getTagColor(primaryTag);
  const gradient   = getTagGradient(primaryTag);
  const readTime   = estimateReadTime(post.content);
  const dateStr    = post.published_at ? formatDate(post.published_at) : "";

  return (
    <Link
      to={`/blog/${post.slug}`}
      className="post-card group block bg-surface border border-line rounded-[20px] overflow-hidden shadow-[var(--shadow-card)]"
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        {post.cover_image ? (
          <img
            src={post.cover_image}
            alt={post.title}
            className="cover-img absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="cover-img absolute inset-0" style={{ background: gradient }} />
        )}
      </div>
      <div className="p-5">
        {primaryTag && (
          <span
            className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider"
            style={{ background: tagColor.bg, color: tagColor.color }}
          >
            {primaryTag}
          </span>
        )}
        <h3 className="mt-2.5 font-display text-[17px] leading-tight text-ink">
          {post.title}
        </h3>
        <div className="mt-3 text-[11px] text-ink3">
          {dateStr} · {readTime} min
        </div>
      </div>
    </Link>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────
function BlogPostSkeleton() {
  return (
    <div className="max-w-[760px] mx-auto px-6 pt-7 animate-pulse">
      <div className="h-6 w-24 rounded-full bg-line mb-4" />
      <div className="h-10 bg-line rounded-lg mb-3 w-3/4" />
      <div className="h-10 bg-line rounded-lg mb-6 w-1/2" />
      <div className="h-5 bg-line rounded mb-2 w-full" />
      <div className="h-5 bg-line rounded mb-8 w-4/5" />
      <div className="aspect-[16/9] bg-line rounded-[20px]" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────
export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();

  const [readProgress, setReadProgress] = useState(0);
  const articleRef = useRef<HTMLElement>(null);
  const [copyLabel,  setCopyLabel]  = useState("Copiar link");

  // ── Engagement ──────────────────────────────────────────────────────────
  const engagement = useEngagement(slug);

  // ── Fetch post ──────────────────────────────────────────────────────────
  const { data: post, isLoading, isError } = useQuery<BlogPost>({
    queryKey:  ["blog-post", slug],
    queryFn:   async () => {
      const res = await api.get<BlogPost>(`/content/blog/${slug}/`);
      return res.data;
    },
    enabled:   !!slug,
    staleTime: 5 * 60 * 1000,
  });

  // ── Related posts ───────────────────────────────────────────────────────
  const primaryTag = post ? parseTags(post.tags)[0] ?? "" : "";

  const { data: relatedData } = useQuery<PaginatedResponse<BlogPost>>({
    queryKey:  ["blog-related", primaryTag],
    queryFn:   async () => {
      const res = await api.get<PaginatedResponse<BlogPost>>("/content/blog/", {
        params: { tag: primaryTag },
      });
      return res.data;
    },
    enabled:   !!primaryTag,
    staleTime: 5 * 60 * 1000,
  });

  const relatedPosts = (relatedData?.results ?? [])
    .filter((p) => p.slug !== slug)
    .slice(0, 3);

  // ── Prev/Next posts ───────────────────────────────────────────────────
  const { data: allPostsData } = useQuery<PaginatedResponse<BlogPost>>({
    queryKey: ["blog-all-for-nav"],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<BlogPost>>("/content/blog/", {
        params: { page_size: 200 },
      });
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const allPosts = allPostsData?.results ?? [];
  const currentIdx = allPosts.findIndex((p) => p.slug === slug);
  const prevPost = currentIdx > 0 ? allPosts[currentIdx - 1] : null;
  const nextPost = currentIdx >= 0 && currentIdx < allPosts.length - 1 ? allPosts[currentIdx + 1] : null;

  // ── Reading progress ────────────────────────────────────────────────────
  const updateProgress = useCallback(() => {
    const el = articleRef.current;
    if (!el) return;
    const rect  = el.getBoundingClientRect();
    const total = el.offsetHeight - window.innerHeight;
    const scrolled = Math.min(Math.max(-rect.top, 0), total > 0 ? total : 1);
    setReadProgress(total > 0 ? (scrolled / total) * 100 : 0);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", updateProgress, { passive: true });
    updateProgress();
    return () => window.removeEventListener("scroll", updateProgress);
  }, [updateProgress]);

  // ── Copy handler ─────────────────────────────────────────────────────────
  const handleCopy = useCallback(() => {
    navigator.clipboard?.writeText(window.location.href).catch(() => {});
    setCopyLabel("¡Copiado!");
    setTimeout(() => setCopyLabel("Copiar link"), 1600);
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────
  if (isLoading) return <BlogPostSkeleton />;

  if (isError || !post) {
    return (
      <div className="max-w-[760px] mx-auto px-6 py-20 text-center">
        <p className="text-ink2 text-[15px]">No se pudo cargar el artículo.</p>
        <Link
          to="/blog"
          className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-semibold text-teal-dark hover:underline"
        >
          ← Volver al blog
        </Link>
      </div>
    );
  }

  const tags      = parseTags(post.tags);
  const tagColor  = getTagColor(primaryTag);
  const gradient  = getTagGradient(primaryTag);
  const readTime  = estimateReadTime(post.content);
  const dateStr   = post.published_at ? formatDate(post.published_at) : "";
  const safeHtml  = sanitize(post.content);

  return (
    <div className="overflow-x-hidden">

      {/* ── Reading progress bar ── */}
      <div
        aria-hidden="true"
        style={{
          position:       "fixed",
          top:            0,
          left:           0,
          height:         "3px",
          width:          `${readProgress}%`,
          background:     "var(--teal-dark)",
          zIndex:         60,
          transition:     "width 80ms linear",
          pointerEvents:  "none",
        }}
      />

      {/* ── Breadcrumb + back link ── */}
      <div className="max-w-[1180px] mx-auto px-6 pt-6 mt-16">
        <nav className="text-[12px] text-ink3 flex items-center gap-1.5 flex-wrap">
          <Link to="/" className="hover:text-teal-dark transition">Inicio</Link>
          <span>›</span>
          <Link to="/blog" className="hover:text-teal-dark transition">Blog</Link>
          {primaryTag && (
            <>
              <span>›</span>
              <Link
                to={`/blog?tag=${encodeURIComponent(primaryTag)}`}
                className="hover:text-teal-dark transition"
              >
                {primaryTag}
              </Link>
            </>
          )}
          <span>›</span>
          <span className="text-ink2 truncate max-w-[200px]">
            {post.title.length > 50 ? post.title.slice(0, 50) + "…" : post.title}
          </span>
        </nav>

        <Link
          to="/blog"
          className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink2 hover:text-teal-dark transition"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Volver al blog
        </Link>
      </div>

      {/* ── Post header ── */}
      <header className="max-w-[760px] mx-auto px-6 pt-7">
        <div className="flex items-center gap-2.5">
          {primaryTag && (
            <span
              className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
              style={{ background: tagColor.bg, color: tagColor.color }}
            >
              {primaryTag}
            </span>
          )}
          {post.post_number && (
            <span className="text-[11px] font-bold text-ink3/60 tracking-wide">#{post.post_number}</span>
          )}
        </div>

        <h1 className="mt-4 font-display text-[32px] sm:text-[40px] leading-[1.08] text-ink tracking-tight">
          {post.title}
        </h1>

        {post.excerpt && (
          <p className="mt-4 text-[17px] text-ink2 leading-relaxed">{post.excerpt}</p>
        )}

        <div className="mt-6 flex items-center justify-between flex-wrap gap-4">
          {/* Author */}
          <div className="flex items-center gap-3">
            <img src="/images/estefi-avatar.png" alt={post.author_name} width={88} height={88} className="w-11 h-11 rounded-full bg-teal/20" />
            <div className="leading-tight">
              <div className="text-[14px] font-bold text-ink">{post.author_name}</div>
              <div className="text-[12px] text-ink3">
                Médica Pediatra · {dateStr} · {readTime} min de lectura
              </div>
            </div>
          </div>
          {/* Share */}
          <ShareButtonsInline
            title={post.title}
            copyLabel={copyLabel}
            onCopy={handleCopy}
          />
        </div>
      </header>

      {/* ── Cover image ── */}
      <div className="max-w-[760px] mx-auto px-6 mt-7">
        <div className="relative aspect-[16/9] rounded-[20px] overflow-hidden border border-line">
          {post.cover_image ? (
            <img
              src={post.cover_image}
              alt={post.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <>
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(135deg, rgba(44,44,44,0.04) 0 1px, transparent 1px 14px), linear-gradient(160deg, #F4ECE5, #E8E2DB)",
                }}
              />
              <div className="absolute inset-0" style={{ background: gradient }} />
              <span className="absolute bottom-4 left-4 text-[10px] font-mono uppercase tracking-[0.16em] text-ink2/70">
                imagen de portada · {primaryTag || "artículo"}
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-[1180px] mx-auto px-6 mt-12">

        {/* MAIN ARTICLE */}
        <article ref={articleRef} className="article max-w-[700px] mx-auto">
          {/* Sanitized HTML content from CMS */}
          <div dangerouslySetInnerHTML={{ __html: safeHtml }} />

          {/* Tags */}
          <div className="mt-10 pt-6 border-t border-line flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Link
                key={tag}
                to={`/blog?tag=${encodeURIComponent(tag)}`}
                className="px-3 py-1.5 rounded-full text-[12px] font-semibold bg-bg border border-line text-ink2 hover:text-teal-dark transition"
              >
                {tag}
              </Link>
            ))}
          </div>

          {/* Author bio + Newsletter side-by-side */}
          <div className="mt-8 grid sm:grid-cols-[1fr_1fr] gap-4 items-stretch">
            {/* Author bio card */}
            <div
              className="border border-line rounded-[20px] p-6 flex flex-col"
              style={{ background: "linear-gradient(135deg, var(--cream), var(--bg))" }}
            >
              <div className="flex items-start gap-3">
                <img
                  src="/images/estefi-avatar.png"
                  alt="Dra. Estefanía Ortigosa"
                  width={160}
                  height={160}
                  className="w-16 h-16 rounded-full bg-teal/20 shrink-0 border-2 border-white shadow-sm"
                />
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-teal-dark">
                    Sobre la autora
                  </div>
                  <h3 className="mt-0.5 font-display text-[17px] text-ink leading-snug">
                    Dra. Estefanía Ortigosa
                  </h3>
                </div>
              </div>
              <p className="mt-2 text-[13px] text-ink2 leading-relaxed flex-1">
                Médica pediatra titulada, atiende en Pucón y Villarrica. Apasionada por la lactancia y el acompañamiento cercano a las familias del sur de Chile.
              </p>
              <Link
                to="/booking"
                className="mt-4 inline-flex items-center justify-center gap-1.5 w-full px-4 py-2.5 rounded-[10px] bg-teal-dark text-[12.5px] font-semibold hover:opacity-90 transition shadow-[var(--shadow-cta)] whitespace-nowrap"
                style={{ color: "#ffffff" }}
              >
                Reservar consulta
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                </svg>
              </Link>
            </div>

            {/* Newsletter mini inline */}
            <NewsletterMini />
          </div>

          {/* Rating + reactions */}
          <div className="mt-8 bg-surface border border-line rounded-[20px] p-6 text-center">
            <h3 className="font-display text-[19px] text-ink">¿Te fue útil este artículo?</h3>
            <div className="mt-3">
              <StarRating
                currentRating={engagement.data?.user_rating ?? null}
                ratingAvg={engagement.data?.rating_avg ?? null}
                ratingCount={engagement.data?.rating_count ?? 0}
                onRate={(value) => engagement.submit({ engagement_type: "RATING", value })}
              />
            </div>
            <Reactions
              usefulCount={engagement.data?.useful_count ?? 0}
              loveCount={engagement.data?.love_count ?? 0}
              userEngagements={engagement.data?.user_engagements ?? []}
              onReact={(type) => engagement.submit({ engagement_type: type })}
            />
          </div>

          {/* Share compact */}
          <ShareButtonsCompact title={post.title} />
        </article>
      </div>

      {/* ── Related posts (bottom 3-col grid) ── */}
      {relatedPosts.length > 0 && (
        <section className="max-w-[1180px] mx-auto px-6 mt-16">
          <h2 className="font-display text-[24px] text-ink">También puede interesarte</h2>
          <div className="mt-6 grid sm:grid-cols-3 gap-6">
            {relatedPosts.map((p) => (
              <RelatedCard key={p.id} post={p} />
            ))}
          </div>
        </section>
      )}

      {/* ── Prev / Next navigation ── */}
      {(prevPost || nextPost) && (
        <section className="max-w-[1180px] mx-auto px-6 mt-14">
          <div className="grid sm:grid-cols-2 gap-px bg-line rounded-[20px] overflow-hidden border border-line">
            {prevPost ? (
              <Link
                to={`/blog/${prevPost.slug}`}
                className="group bg-surface hover:bg-bg transition p-6 flex items-center gap-4"
              >
                <svg className="text-ink3 group-hover:text-teal-dark transition shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                <div className="w-14 h-14 rounded-[10px] shrink-0 overflow-hidden border border-line" style={{
                  background: prevPost.cover_image
                    ? `url(${prevPost.cover_image}) center/cover`
                    : getTagGradient(parseTags(prevPost.tags)[0] ?? ""),
                }} />
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-ink3">← Artículo anterior</div>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider" style={(() => { const tc = getTagColor(parseTags(prevPost.tags)[0] ?? ""); return { background: tc.bg, color: tc.color }; })()}>
                    {parseTags(prevPost.tags)[0] ?? "Blog"}
                  </span>
                  <div className="text-[13.5px] font-bold text-ink mt-1 leading-snug truncate">{prevPost.title}</div>
                </div>
              </Link>
            ) : <div className="bg-surface p-6" />}
            {nextPost ? (
              <Link
                to={`/blog/${nextPost.slug}`}
                className="group bg-surface hover:bg-bg transition p-6 flex items-center gap-4 text-right sm:flex-row-reverse"
              >
                <svg className="text-ink3 group-hover:text-teal-dark transition shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                <div className="w-14 h-14 rounded-[10px] shrink-0 overflow-hidden border border-line" style={{
                  background: nextPost.cover_image
                    ? `url(${nextPost.cover_image}) center/cover`
                    : getTagGradient(parseTags(nextPost.tags)[0] ?? ""),
                }} />
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-ink3">Artículo siguiente →</div>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider" style={(() => { const tc = getTagColor(parseTags(nextPost.tags)[0] ?? ""); return { background: tc.bg, color: tc.color }; })()}>
                    {parseTags(nextPost.tags)[0] ?? "Blog"}
                  </span>
                  <div className="text-[13.5px] font-bold text-ink mt-1 leading-snug truncate">{nextPost.title}</div>
                </div>
              </Link>
            ) : <div className="bg-surface p-6" />}
          </div>
        </section>
      )}

      {/* ── Bottom navigation ── */}
      <section className="max-w-[1180px] mx-auto px-6 mt-10 pb-16">
        <div className="text-center">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 px-5 py-3 rounded-[12px] bg-surface border border-line text-[13.5px] font-semibold text-ink2 hover:bg-bg transition"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Volver al blog
          </Link>
        </div>
      </section>
    </div>
  );
}
