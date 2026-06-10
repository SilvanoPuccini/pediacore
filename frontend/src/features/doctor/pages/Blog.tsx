import { useQuery } from "@tanstack/react-query";
import { FileText, ExternalLink, AlertCircle } from "lucide-react";
import api from "@/lib/api";
import type { BlogPost, PaginatedResponse } from "@/types/api";

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── status chip ──────────────────────────────────────────────────────────────

const STATUS_MAP = {
  PUBLISHED: { bg: "rgba(168, 213, 181, 0.30)", text: "#3F8358", label: "Publicado" },
  DRAFT:     { bg: "rgba(180, 180, 190, 0.25)", text: "#777",    label: "Borrador" },
};

function StatusChip({ isPublished }: { isPublished: boolean }) {
  const s = isPublished ? STATUS_MAP.PUBLISHED : STATUS_MAP.DRAFT;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{ background: s.bg, color: s.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.text }} />
      {s.label}
    </span>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function BlogPage() {
  const { data, isLoading, isError } = useQuery<PaginatedResponse<BlogPost>>({
    queryKey: ["blog-posts-admin"],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<BlogPost>>(
        "/admin/blog/?page_size=100"
      );
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const posts = data?.results ?? [];

  return (
    <div className="space-y-6 max-w-[1000px]">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-[20px] font-bold text-ink tracking-tight">Blog</h1>
          <p className="text-[13px] text-ink2 mt-0.5">
            Artículos publicados y borradores
          </p>
        </div>
        <button
          onClick={() => window.open("/gestion-9f3a/content/blogpost/add/", "_blank")}
          className="text-[12px] font-semibold px-3.5 py-2 rounded-[10px] bg-teal-dark text-white hover:opacity-90 transition-opacity"
        >
          Nuevo artículo
        </button>
      </div>

      {/* Table card */}
      <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-5 w-5 rounded-full border-2 border-line border-t-teal animate-spin" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-ink3">
            <AlertCircle size={28} className="opacity-40" />
            <p className="text-[13px]">Error al cargar los artículos</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-ink3">
            <FileText size={32} className="opacity-40" />
            <p className="text-[14px]">Sin artículos todavía</p>
            <button
              onClick={() => window.open("/gestion-9f3a/content/blogpost/add/", "_blank")}
              className="mt-2 text-[12px] font-semibold text-teal-dark hover:underline"
            >
              Crear el primero
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-5 py-3 text-left text-[11.5px] font-semibold text-ink3 uppercase tracking-wide">
                    Título
                  </th>
                  <th className="px-5 py-3 text-left text-[11.5px] font-semibold text-ink3 uppercase tracking-wide">
                    Estado
                  </th>
                  <th className="px-5 py-3 text-left text-[11.5px] font-semibold text-ink3 uppercase tracking-wide">
                    Creado
                  </th>
                  <th className="px-5 py-3 text-left text-[11.5px] font-semibold text-ink3 uppercase tracking-wide">
                    Actualizado
                  </th>
                  <th className="px-5 py-3 text-left text-[11.5px] font-semibold text-ink3 uppercase tracking-wide">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-bg transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="text-[13px] font-semibold text-ink leading-snug">
                        {post.title}
                      </div>
                      <div className="text-[11.5px] text-ink3 mt-0.5">{post.slug}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusChip isPublished={post.is_published} />
                    </td>
                    <td className="px-5 py-3.5 text-[12.5px] text-ink2">
                      {formatDate(post.created_at)}
                    </td>
                    <td className="px-5 py-3.5 text-[12.5px] text-ink2">
                      {formatDate(post.updated_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() =>
                          window.open(
                            `/gestion-9f3a/content/blogpost/${post.id}/change/`,
                            "_blank"
                          )
                        }
                        className="inline-flex items-center gap-1 text-[12px] font-semibold text-teal-dark hover:underline"
                      >
                        Editar
                        <ExternalLink size={11} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && (
        <p className="text-[12px] text-ink3">
          {data.count} artículo{data.count !== 1 ? "s" : ""} en total
        </p>
      )}
    </div>
  );
}
