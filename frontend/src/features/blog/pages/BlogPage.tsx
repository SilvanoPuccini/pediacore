import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  BookOpen,
  ArrowRight,
  ChevronUp,
} from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import type { BlogPost, PaginatedResponse } from "@/types/api";

// ─── Tag config ───────────────────────────────────────────────────────────────

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
  Alimentación: "linear-gradient(150deg, rgba(134,239,172,0.5), rgba(168,201,168,0.30))",
  Sueño:        "linear-gradient(150deg, rgba(196,181,253,0.5), rgba(123,181,189,0.28))",
  Desarrollo:   "linear-gradient(150deg, rgba(229,184,71,0.45), rgba(168,201,168,0.30))",
  Enfermedades: "linear-gradient(150deg, rgba(253,230,138,0.55), rgba(245,213,193,0.30))",
  Urgencias:    "linear-gradient(150deg, rgba(252,165,165,0.5), rgba(245,213,193,0.30))",
  Consejos:     "linear-gradient(150deg, rgba(94,234,212,0.45), rgba(123,181,189,0.30))",
};

const TAG_DOT_COLORS: Record<string, string> = {
  Lactancia:    "#F3A8A1",
  Vacunas:      "#93C5FD",
  Alimentación: "#A8C9A8",
  Sueño:        "#C4B5FD",
  Urgencias:    "#FCA5A5",
  Desarrollo:   "#E5B847",
};

const CATEGORIES = [
  { label: "Todos", value: "" },
  { label: "Lactancia", value: "Lactancia" },
  { label: "Vacunas", value: "Vacunas" },
  { label: "Alimentación", value: "Alimentación" },
  { label: "Sueño", value: "Sueño" },
  { label: "Desarrollo", value: "Desarrollo" },
  { label: "Enfermedades", value: "Enfermedades" },
  { label: "Urgencias", value: "Urgencias" },
  { label: "Consejos", value: "Consejos" },
];

const MOST_READ_TITLES = [
  "Lactancia materna en los primeros 6 meses",
  "Fiebre en niños: cuándo preocuparse",
  "Calendario de vacunas Chile 2026",
  "Alimentación complementaria a los 6 meses",
  "Sueño seguro del bebé: mitos y verdades",
];

const PAGE_SIZE = 4;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readTime(content: string): number {
  return Math.max(1, Math.ceil(content.length / 1000));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function firstTag(tags: string): string {
  return tags ? tags.split(",")[0].trim() : "";
}

function getGradient(tags: string): string {
  const tag = firstTag(tags);
  return TAG_GRADIENTS[tag] ?? "linear-gradient(150deg, rgba(123,181,189,0.4), rgba(243,168,161,0.25))";
}

function TagBadge({ tag, small = false }: { tag: string; small?: boolean }) {
  const cfg = TAG_COLORS[tag];
  if (!cfg) return null;
  return (
    <span
      className={`inline-block rounded-md font-bold uppercase tracking-wider ${small ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[10.5px]"}`}
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {tag}
    </span>
  );
}

function AuthorMeta({ post, small = false }: { post: BlogPost; small?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 ${small ? "" : "pt-3 border-t border-line/70"}`}>
      <span
        className={`rounded-full bg-gradient-to-br from-teal to-mustard flex items-center justify-center text-white font-bold ${
          small ? "w-7 h-7 text-[11px]" : "w-9 h-9 text-[13px]"
        }`}
      >
        {post.author_name ? post.author_name[0].toUpperCase() : "E"}
      </span>
      <div className={small ? "text-[11px] text-ink3" : "leading-tight"}>
        {small ? (
          <span>
            {post.author_name} · {formatDate(post.published_at)} · {readTime(post.content)} min
          </span>
        ) : (
          <>
            <div className="text-[12.5px] font-bold text-ink">{post.author_name}</div>
            <div className="text-[11px] text-ink3">
              {formatDate(post.published_at)} · {readTime(post.content)} min de lectura
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CoverImage({
  post,
  className,
}: {
  post: BlogPost;
  className?: string;
}) {
  const gradient = getGradient(post.tags);
  if (post.cover_image) {
    return (
      <img
        src={post.cover_image}
        alt={post.title}
        className={`cover-img absolute inset-0 w-full h-full object-cover ${className ?? ""}`}
      />
    );
  }
  return (
    <div
      className={`cover-img absolute inset-0 ${className ?? ""}`}
      style={{ background: gradient }}
    />
  );
}

// ─── Card variants ────────────────────────────────────────────────────────────

function FeaturedCard({ post }: { post: BlogPost }) {
  const tag = firstTag(post.tags);
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="post-card group block bg-surface border border-line rounded-[20px] overflow-hidden"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div
        className="relative aspect-[16/9] overflow-hidden"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(44,44,44,0.04) 0 1px, transparent 1px 14px), linear-gradient(160deg, #F4ECE5, #E8E2DB)",
        }}
      >
        <CoverImage post={post} />
        <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-teal-dark text-white text-[11px] font-bold uppercase tracking-wider">
          Destacado
        </span>
        <span className="absolute bottom-4 left-4 text-[10px] font-mono uppercase tracking-[0.16em] text-ink2/70">
          {tag ? `imagen · ${tag.toLowerCase()}` : "imagen"}
        </span>
      </div>
      <div className="p-6">
        {tag && <TagBadge tag={tag} />}
        <h2 className="post-title mt-3 font-display text-[24px] lg:text-[28px] leading-tight text-ink">
          {post.title}
        </h2>
        <p className="mt-2.5 text-[14px] text-ink2 leading-relaxed">{post.excerpt}</p>
        <div className="mt-5 flex items-center justify-between flex-wrap gap-3">
          <AuthorMeta post={post} />
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] border border-teal-dark/40 text-teal-dark text-[12.5px] font-semibold group-hover:bg-teal/10 transition">
            Leer artículo
            <ArrowRight size={13} />
          </span>
        </div>
      </div>
    </Link>
  );
}

function SecondaryCard({ post }: { post: BlogPost }) {
  const tag = firstTag(post.tags);
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="post-card group flex gap-4 bg-surface border border-line rounded-[20px] overflow-hidden p-3"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div
        className="relative w-[40%] shrink-0 rounded-[14px] overflow-hidden aspect-square"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(44,44,44,0.04) 0 1px, transparent 1px 14px), linear-gradient(160deg, #F4ECE5, #E8E2DB)",
        }}
      >
        <CoverImage post={post} />
      </div>
      <div className="flex-1 min-w-0 py-1 pr-2">
        {tag && <TagBadge tag={tag} small />}
        <h3 className="post-title mt-2 font-display text-[17px] leading-tight text-ink">
          {post.title}
        </h3>
        <div className="mt-2 text-[11px] text-ink3">
          {formatDate(post.published_at)} · {readTime(post.content)} min
        </div>
      </div>
    </Link>
  );
}

function PostCard({ post }: { post: BlogPost }) {
  const tag = firstTag(post.tags);
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="post-card group block bg-surface border border-line rounded-[20px] overflow-hidden"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div
        className="relative aspect-[16/9] overflow-hidden"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(44,44,44,0.04) 0 1px, transparent 1px 14px), linear-gradient(160deg, #F4ECE5, #E8E2DB)",
        }}
      >
        <CoverImage post={post} />
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2">
          {tag && <TagBadge tag={tag} small />}
          {post.post_number && (
            <span className="text-[10px] font-bold text-ink3/60 tracking-wide">#{post.post_number}</span>
          )}
        </div>
        <h3 className="post-title mt-2.5 font-display text-[18px] leading-tight text-ink">
          {post.title}
        </h3>
        <p className="mt-2 text-[13px] text-ink2 leading-relaxed">{post.excerpt}</p>
        <div className="mt-4">
          <AuthorMeta post={post} small />
        </div>
      </div>
    </Link>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="bg-surface border border-line rounded-[20px] overflow-hidden animate-pulse">
      <div className="aspect-[16/9] bg-line/40" />
      <div className="p-5 space-y-3">
        <div className="h-4 w-20 bg-line/60 rounded-full" />
        <div className="h-5 w-full bg-line/60 rounded" />
        <div className="h-4 w-3/4 bg-line/40 rounded" />
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BlogPage() {
  const [activeTag, setActiveTagState] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const { user, isAuthenticated } = useAuthStore();
  const [showToTop, setShowToTop] = useState(false);
  const [bottomNlEmail, setBottomNlEmail] = useState("");
  const [bottomNlState, setBottomNlState] = useState<"idle" | "loading" | "done" | "already" | "error">("idle");

  // Pre-fill email and check subscription for logged-in users
  useEffect(() => {
    if (!isAuthenticated) return;
    setBottomNlEmail(user?.email ?? "");
    api
      .get<{ subscribed: boolean }>("/content/subscribe/status/")
      .then((res) => {
        if (res.data.subscribed) setBottomNlState("already");
      })
      .catch(() => {});
  }, [isAuthenticated, user?.email]);

  const mainRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Scroll-to-top button
  useEffect(() => {
    const handler = () => setShowToTop(window.scrollY > 300);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Fetch all posts once — client-side filtering and pagination
  const { data, isLoading, isError } = useQuery({
    queryKey: ["blog"],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<BlogPost>>("/content/blog/", {
        params: { page_size: 100 },
      });
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Sort all posts by post_number descending (highest = most recent)
  const allPosts = [...(data?.results ?? [])].sort(
    (a, b) => (b.post_number ?? 0) - (a.post_number ?? 0)
  );

  // Featured = highest post_number; secondary = next 2; rest go to grid
  const featuredPost = allPosts[0] ?? null;
  const secondaryPosts = allPosts.slice(1, 3);
  const remainingPosts = allPosts.slice(3);

  // Client-side tag filter on grid posts only
  const filteredGridPosts = activeTag
    ? remainingPosts.filter((p) =>
        p.tags
          .split(",")
          .map((t) => t.trim())
          .includes(activeTag)
      )
    : remainingPosts;

  const totalPages = Math.max(1, Math.ceil(filteredGridPosts.length / PAGE_SIZE));

  // Paginate filtered grid posts
  const gridPosts = filteredGridPosts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const totalCount = allPosts.length;

  // Reveal animation via IntersectionObserver (runs when posts change so
  // newly rendered DOM elements with [data-reveal] get observed)
  useEffect(() => {
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const delay = parseInt((e.target as HTMLElement).dataset.delay ?? "0", 10);
            (e.target as HTMLElement).style.animationDelay = `${delay * 80}ms`;
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [allPosts]);

  function setTag(tag: string) {
    setActiveTagState(tag);
    setCurrentPage(1);
  }

  function setPage(page: number) {
    setCurrentPage(page);
    requestAnimationFrame(() => {
      gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // Build visible page numbers (max 5 around current)
  function pageNumbers(): number[] {
    const nums: number[] = [];
    const half = 2;
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, currentPage + half);
    if (end - start < 4) {
      if (start === 1) end = Math.min(totalPages, start + 4);
      else start = Math.max(1, end - 4);
    }
    for (let i = start; i <= end; i++) nums.push(i);
    return nums;
  }

  return (
    <>
      {/* ── Global styles injected via style tag ── */}
      <style>{`
        .blob { position:absolute; border-radius:50%; filter:blur(46px); opacity:0.5; pointer-events:none; }
        .ulink { position:relative; }
        .ulink::after { content:''; position:absolute; left:0; right:100%; bottom:-2px; height:1.5px; background:#4A8590; transition:right 320ms ease; }
        .ulink:hover::after { right:0; }
        @keyframes revealUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:none; } }
        [data-reveal] { opacity:0; }
        [data-reveal].in { animation: revealUp 640ms cubic-bezier(0.22,1,0.36,1) forwards; }
        .post-card { transition: transform 280ms cubic-bezier(0.22,1,0.36,1), box-shadow 280ms cubic-bezier(0.22,1,0.36,1); }
        .post-card:hover { transform: translateY(-4px); box-shadow:0 14px 40px rgba(15,23,42,0.08); }
        .post-card .cover-img { transition: transform 480ms cubic-bezier(0.22,1,0.36,1); }
        .post-card:hover .cover-img { transform: scale(1.05); }
        .post-card:hover .post-title { text-decoration: underline; text-decoration-color:#7BB5BD; text-underline-offset:3px; }
        .filter-scroll { scrollbar-width:none; }
        .filter-scroll::-webkit-scrollbar { display:none; }
        .nl-input:focus { outline:none; box-shadow: 0 0 0 4px rgba(255,255,255,0.30); }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.7s linear infinite; }
      `}</style>

      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-3 focus:left-3 focus:bg-teal-dark focus:text-white focus:px-4 focus:py-2 focus:rounded-[10px] text-[13px] font-semibold"
      >
        Saltar al contenido
      </a>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-line pt-16">
        <span
          className="blob"
          style={{ width: 360, height: 360, background: "#7BB5BD", top: -140, left: -100 }}
        />
        <span
          className="blob"
          style={{ width: 300, height: 300, background: "#F3A8A1", top: -60, right: -80, opacity: 0.4 }}
        />
        <div className="relative max-w-[1280px] mx-auto px-6 py-12 lg:py-16 grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
          <div>
            <span
              data-reveal
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-line text-[12px] font-semibold text-ink2"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <BookOpen size={13} color="#4A8590" />
              Blog &amp; Recursos
            </span>
            <h1
              data-reveal
              data-delay="1"
              className="mt-4 font-display text-[34px] sm:text-[42px] lg:text-[50px] leading-[1.04] text-ink tracking-tight"
            >
              Todo lo que necesitás saber para{" "}
              <em className="italic" style={{ color: "#4A8590", fontStyle: "italic" }}>
                cuidar a tu hijo
              </em>
            </h1>
            <p
              data-reveal
              data-delay="2"
              className="mt-4 text-[15px] sm:text-[16px] text-ink2 leading-relaxed max-w-[520px]"
            >
              Artículos, consejos y novedades escritos por la Dra. Estefanía, para acompañarte en
              cada etapa.
            </p>
          </div>

          {/* Floating category pills */}
          <div data-reveal data-delay="2" className="relative h-[230px] hidden sm:block">
            {[
              { label: "Lactancia",    style: { left: "2%",  top: "6%",       transform: "rotate(-4deg)" }, dot: TAG_DOT_COLORS.Lactancia    },
              { label: "Vacunas",      style: { right: "4%", top: 0,           transform: "rotate(3deg)"  }, dot: TAG_DOT_COLORS.Vacunas      },
              { label: "Alimentación", style: { left: "16%", top: "40%",      transform: "rotate(2deg)"  }, dot: TAG_DOT_COLORS.Alimentación },
              { label: "Sueño",        style: { right: "8%", top: "42%",      transform: "rotate(-3deg)" }, dot: TAG_DOT_COLORS.Sueño        },
              { label: "Urgencias",    style: { left: "6%",  bottom: "2%",    transform: "rotate(4deg)"  }, dot: TAG_DOT_COLORS.Urgencias    },
              { label: "Desarrollo",   style: { right: "14%", bottom: "6%",   transform: "rotate(-2deg)" }, dot: TAG_DOT_COLORS.Desarrollo   },
            ].map(({ label, style, dot }) => (
              <span
                key={label}
                className="absolute px-3.5 py-2 rounded-full bg-surface border border-line text-[13px] font-semibold text-ink flex items-center gap-2"
                style={{ ...style, boxShadow: "var(--shadow-soft)" } as React.CSSProperties}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: dot }} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Main content ── */}
      <main id="contenido" ref={mainRef} className="max-w-[1280px] mx-auto px-6 py-12 lg:py-16">

        {/* Loading state */}
        {isLoading && (
          <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6 mb-14">
            <CardSkeleton />
            <div className="flex flex-col gap-6">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="text-center py-20">
            <div className="mx-auto w-14 h-14 rounded-full bg-bg flex items-center justify-center mb-3">
              <Search size={22} color="#A0A0A0" />
            </div>
            <div className="text-[14px] font-bold text-ink">No se pudieron cargar los artículos</div>
            <div className="text-[12.5px] text-ink3 mt-1">Intentá recargar la página.</div>
          </div>
        )}

        {/* Content */}
        {!isLoading && !isError && (
          <>
            {/* Featured + secondary */}
            {allPosts.length > 0 ? (
              <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6 mb-14">
                {featuredPost && (
                  <div data-reveal>
                    <FeaturedCard post={featuredPost} />
                  </div>
                )}
                <div className="flex flex-col gap-6">
                  {secondaryPosts.map((post, i) => (
                    <div key={post.id} data-reveal data-delay={String(i + 1)}>
                      <SecondaryCard post={post} />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Category filter */}
            <div ref={gridRef} className="filter-scroll overflow-x-auto -mx-6 px-6 mb-10">
              <div className="flex items-center gap-2 w-max pb-1">
                {CATEGORIES.map((cat) => {
                  const isActive = activeTag === cat.value;
                  return (
                    <button
                      key={cat.value}
                      onClick={() => setTag(cat.value)}
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

            {/* Grid + Sidebar */}
            <div className="grid lg:grid-cols-[1fr_300px] gap-10">
              {/* Left: grid */}
              <div>
                <div className="flex items-baseline justify-between mb-6">
                  <h2 className="font-display text-[24px] text-ink">Últimos artículos</h2>
                  {totalCount > 0 && (
                    <span className="text-[12.5px] text-ink3">
                      {activeTag
                        ? `${filteredGridPosts.length} artículo${filteredGridPosts.length !== 1 ? "s" : ""} en "${activeTag}"`
                        : `${totalCount} artículo${totalCount !== 1 ? "s" : ""} en total`}
                    </span>
                  )}
                </div>

                {gridPosts.length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-6">
                    {gridPosts.map((post) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                ) : filteredGridPosts.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="mx-auto w-14 h-14 rounded-full bg-bg flex items-center justify-center mb-3">
                      <Search size={22} color="#A0A0A0" />
                    </div>
                    <div className="text-[14px] font-bold text-ink">
                      Sin artículos en esta categoría todavía
                    </div>
                    <div className="text-[12.5px] text-ink3 mt-1">
                      Probá con otra categoría o volvé a "Todos".
                    </div>
                  </div>
                ) : null}

                {/* Pagination */}
                {totalPages > 1 && (
                  <nav className="mt-12 flex items-center justify-center gap-2">
                    <button
                      onClick={() => setPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] bg-surface border border-line text-[12.5px] font-semibold text-ink2 hover:bg-bg transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={13} />
                      <span className="hidden sm:inline">Anterior</span>
                    </button>

                    <div className="hidden sm:flex items-center gap-1.5">
                      {pageNumbers().map((pg) => (
                        <button
                          key={pg}
                          onClick={() => setPage(pg)}
                          className={`w-9 h-9 rounded-full text-[13px] font-semibold transition ${
                            pg === currentPage
                              ? "bg-teal-dark text-white font-bold"
                              : "text-ink2 hover:bg-bg"
                          }`}
                        >
                          {pg}
                        </button>
                      ))}
                    </div>

                    <div className="sm:hidden text-[12.5px] font-semibold text-ink2">
                      Pág. {currentPage} de {totalPages}
                    </div>

                    <button
                      onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] bg-surface border border-line text-[12.5px] font-semibold text-ink2 hover:bg-bg transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span className="hidden sm:inline">Siguiente</span>
                      <ChevronRight size={13} />
                    </button>
                  </nav>
                )}
              </div>

              {/* Sidebar */}
              <aside className="space-y-6">
                {/* Most read */}
                <div
                  className="bg-surface border border-line rounded-[20px] p-5"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <h3 className="font-display text-[16px] text-ink">Artículos más leídos</h3>
                  <ol className="mt-4 space-y-3.5">
                    {MOST_READ_TITLES.map((title, i) => (
                      <li key={i}>
                        <Link
                          to="/blog"
                          className="flex items-start gap-3 group"
                        >
                          <span className="font-display text-[20px] text-teal leading-none w-6 shrink-0">
                            {i + 1}
                          </span>
                          <span className="text-[13px] font-semibold text-ink leading-snug group-hover:text-teal-dark transition">
                            {title}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Author card */}
                <div
                  className="border border-line rounded-[20px] p-5 text-center"
                  style={{
                    background: "linear-gradient(to bottom right, var(--cream), var(--bg))",
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  <img src="/images/estefi-avatar.png" alt="Dra. Estefanía Ortigosa" width={160} height={160} className="w-20 h-20 rounded-full mx-auto bg-teal/20 border-2 border-white shadow-sm" />
                  <h3 className="mt-3 font-display text-[17px] text-ink">
                    Dra. Estefanía Ortigosa
                  </h3>
                  <p className="mt-1.5 text-[12.5px] text-ink2 leading-relaxed">
                    Médica pediatra en Pucón y Villarrica. Escribo para acompañar a las familias con
                    información clara y cercana.
                  </p>
                  <Link
                    to="/booking"
                    className="mt-4 inline-flex items-center justify-center gap-1.5 w-full px-4 py-2.5 rounded-[10px] bg-teal-dark text-[13px] font-semibold hover:opacity-90 transition"
                    style={{ boxShadow: "var(--shadow-cta)", color: "#ffffff" }}
                  >
                    Reservar consulta
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </aside>
            </div>

            {/* Videos section */}
            <section className="mt-16">
              <div className="flex items-end justify-between flex-wrap gap-3">
                <h2 className="font-display text-[24px] text-ink flex items-center gap-2.5">
                  <span
                    className="w-9 h-9 rounded-[10px] flex items-center justify-center"
                    style={{ background: "rgba(243,168,161,0.25)", color: "#B5604F" }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m22 8-6 4 6 4V8Z" />
                      <rect width="14" height="12" x="2" y="6" rx="2" />
                    </svg>
                  </span>
                  Videos y recursos
                </h2>
                <Link to="/videos" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-teal-dark hover:underline">
                  Ver toda la videoteca
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"/>
                    <path d="m12 5 7 7-7 7"/>
                  </svg>
                </Link>
              </div>
              <div className="mt-6 grid sm:grid-cols-3 gap-6">
                {[
                  { gradient: "linear-gradient(150deg, rgba(123,181,189,0.5), rgba(243,168,161,0.30))", title: "Cómo tomar la fiebre correctamente", duration: "4:12" },
                  { gradient: "linear-gradient(150deg, rgba(168,201,168,0.5), rgba(229,184,71,0.30))",  title: "Primeros alimentos: demostración práctica", duration: "6:48" },
                  { gradient: "linear-gradient(150deg, rgba(196,181,253,0.5), rgba(123,181,189,0.30))", title: "Posiciones para amamantar sin dolor", duration: "3:30" },
                ].map(({ gradient, title, duration }) => (
                  <Link key={title} to="/videos" className="group cursor-pointer">
                    <div
                      className="relative aspect-video rounded-[20px] overflow-hidden border border-line"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(135deg, rgba(44,44,44,0.04) 0 1px, transparent 1px 14px), linear-gradient(160deg, #F4ECE5, #E8E2DB)",
                      }}
                    >
                      <div className="absolute inset-0" style={{ background: gradient }} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span
                          className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center transition-transform duration-240 group-hover:scale-[1.12]"
                          style={{ boxShadow: "var(--shadow-pop)" }}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="#4A8590">
                            <polygon points="6 3 20 12 6 21 6 3" />
                          </svg>
                        </span>
                      </div>
                      <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-ink/80 text-white text-[10.5px] font-semibold">
                        {duration}
                      </span>
                    </div>
                    <h3 className="mt-3 text-[14px] font-bold text-ink leading-tight group-hover:text-teal-dark transition-colors">{title}</h3>
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      {/* ── Newsletter Banner (bottom) ── */}
      <section className="bg-teal-dark text-white">
        <div className="max-w-[1280px] mx-auto px-6 py-10 lg:py-12 text-center">
          <div className="w-12 h-12 rounded-[14px] bg-white/15 flex items-center justify-center mx-auto">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/><path d="M19 2.5 19.7 4 21 4.7 19.7 5.4 19 7 18.3 5.4 17 4.7 18.3 4z"/></svg>
          </div>
          <h2 className="mt-4 font-display text-[26px] lg:text-[32px] tracking-tight">
            Recibí los últimos artículos en tu email
          </h2>
          <p className="mt-2 text-[14px] text-white/80 max-w-md mx-auto">
            Sin spam. Solo información útil para vos y tu familia. Cancelá cuando quieras.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const trimmed = bottomNlEmail.trim().toLowerCase();
              if (!trimmed) return;
              setBottomNlState("loading");
              try {
                const res = await api.post<{ already_subscribed: boolean }>(
                  "/content/subscribe/",
                  { email: trimmed, website: "" }
                );
                setBottomNlState(res.data.already_subscribed ? "already" : "done");
              } catch {
                setBottomNlState("error");
              }
            }}
            className="mt-6 max-w-md mx-auto flex items-center gap-2 flex-col sm:flex-row"
          >
            <input
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              value={bottomNlEmail}
              onChange={(e) => setBottomNlEmail(e.target.value)}
              placeholder="tu@email.com"
              disabled={bottomNlState === "done" || bottomNlState === "already" || bottomNlState === "loading" || isAuthenticated}
              className="w-full px-4 py-3 rounded-[12px] bg-white/15 border border-white/25 text-white placeholder:text-white/60 text-[14px] focus:outline-none focus:ring-2 focus:ring-white/30 transition"
            />
            <button
              type="submit"
              disabled={bottomNlState === "done" || bottomNlState === "already" || bottomNlState === "loading"}
              className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-[12px] bg-white text-teal-dark text-[14px] font-bold hover:opacity-90 transition"
            >
              {bottomNlState === "already" ? "Ya estás suscripto/a" : bottomNlState === "done" ? "¡Suscripto!" : bottomNlState === "loading" ? "Enviando..." : "Suscribirme"}
              {bottomNlState === "idle" && (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              )}
            </button>
          </form>
          {bottomNlState === "error" && (
            <p className="mt-2 text-[13px] text-white/80">Hubo un error. Intentá de nuevo.</p>
          )}
          <div className="mt-3 text-[12.5px] text-white/75 flex items-center justify-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Ya se suscribieron +320 familias
          </div>
        </div>
      </section>

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
