import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import {
  FileText,
  Plus,
  ArrowLeft,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  AlertCircle,
  Sparkles,
  Code,
} from "lucide-react";
import api from "@/lib/api";
import type { BlogPost, PaginatedResponse } from "@/types/api";

// ─── helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function sanitize(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "h2", "h3", "strong", "em", "ul", "ol", "li", "br"],
  });
}

function StatusChip({ isPublished }: { isPublished: boolean }) {
  const s = isPublished
    ? { bg: "rgba(168, 213, 181, 0.30)", text: "#3F8358", label: "Publicado" }
    : { bg: "rgba(180, 180, 190, 0.25)", text: "#777", label: "Borrador" };
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

// ─── form types ─────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  title: "",
  excerpt: "",
  content: "",
  tags: "",
  meta_description: "",
  cover_image: "",
  is_published: false,
};

type FormData = typeof EMPTY_FORM;

// ─── page ───────────────────────────────────────────────────────────────────────

export default function BlogPage() {
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editId, setEditId] = useState<number | null>(null);
  const [editMeta, setEditMeta] = useState<{
    slug?: string;
    post_number?: number | null;
    author_name?: string;
    created_at?: string;
    updated_at?: string;
    published_at?: string;
  }>({});
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [contentTab, setContentTab] = useState<"write" | "preview">("write");
  const [toast, setToast] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const set = <K extends keyof FormData>(field: K, value: FormData[K]) =>
    setForm((f) => ({ ...f, [field]: value }));

  // ── queries ─────────────────────────────────────────────────────────────────

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

  // ── mutations ───────────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (mode === "edit" && editId) {
        return api.patch(`/admin/blog/${editId}/`, payload);
      }
      return api.post("/admin/blog/", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-posts-admin"] });
      flash(mode === "edit" ? "Artículo actualizado" : "Artículo creado");
      goBack();
    },
    onError: () => flash("Error al guardar"),
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, publish }: { id: number; publish: boolean }) =>
      api.post(`/admin/blog/${id}/${publish ? "publish" : "unpublish"}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-posts-admin"] });
      flash("Estado actualizado");
    },
    onError: () => flash("Error al actualizar estado"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/admin/blog/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-posts-admin"] });
      flash("Artículo eliminado");
      setDeleteId(null);
    },
    onError: () => flash("Error al eliminar"),
  });

  const formatContentMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data } = await api.post<{ html: string }>(
        "/admin/blog/format-content/",
        { content }
      );
      return data.html;
    },
    onSuccess: (html) => {
      set("content", html);
      setContentTab("preview");
      flash("Contenido convertido a HTML");
    },
    onError: () => flash("Falló la conversión IA"),
  });

  // ── actions ─────────────────────────────────────────────────────────────────

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditId(null);
    setEditMeta({});
    setContentTab("write");
    setMode("create");
  }

  function openEdit(post: BlogPost) {
    setForm({
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      tags: post.tags,
      meta_description: post.meta_description,
      cover_image: post.cover_image ?? "",
      is_published: post.is_published,
    });
    setEditMeta({
      slug: post.slug,
      post_number: post.post_number,
      author_name: post.author_name,
      created_at: post.created_at,
      updated_at: post.updated_at,
      published_at: post.published_at,
    });
    setEditId(post.id);
    setContentTab("write");
    setMode("edit");
  }

  function goBack() {
    setMode("list");
    setEditId(null);
    setEditMeta({});
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      flash("El título es obligatorio");
      return;
    }
    const payload: Record<string, unknown> = {
      title: form.title,
      excerpt: form.excerpt,
      content: form.content,
      tags: form.tags,
      meta_description: form.meta_description,
      cover_image: form.cover_image || null,
      is_published: form.is_published,
    };
    saveMutation.mutate(payload);
  }

  const isContentHtml = form.content.includes("<p>") || form.content.includes("<h");

  // ── toast ───────────────────────────────────────────────────────────────────

  const toastEl = toast && (
    <div className="fixed top-6 right-6 z-50 bg-ink text-white text-[13px] font-medium px-4 py-2.5 rounded-[10px] shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
      {toast}
    </div>
  );

  // ── form view ───────────────────────────────────────────────────────────────

  if (mode !== "list") {
    return (
      <div className="space-y-6 max-w-[860px]">
        {toastEl}

        <div className="flex items-center gap-3">
          <button
            onClick={goBack}
            className="p-2 rounded-[8px] hover:bg-bg transition-colors text-ink2"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-[18px] font-bold text-ink">
            {mode === "create" ? "Nuevo artículo" : "Editar artículo"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Main content card */}
          <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] p-6 space-y-5">
            {/* Title */}
            <div>
              <label className="block text-[12px] font-semibold text-ink2 mb-1.5">
                Título *
              </label>
              <input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-[10px] border border-line bg-bg text-[13.5px] text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-colors"
                placeholder="Título del artículo"
              />
            </div>

            {/* Slug (read-only in edit) */}
            {mode === "edit" && editMeta.slug && (
              <div>
                <label className="block text-[12px] font-semibold text-ink2 mb-1.5">
                  Slug (URL)
                </label>
                <div className="px-3.5 py-2.5 rounded-[10px] border border-line bg-bg/50 text-[13px] text-ink3">
                  {editMeta.slug}
                </div>
              </div>
            )}

            {/* Excerpt */}
            <div>
              <label className="block text-[12px] font-semibold text-ink2 mb-1.5">
                Extracto
              </label>
              <textarea
                value={form.excerpt}
                onChange={(e) => set("excerpt", e.target.value)}
                rows={2}
                className="w-full px-3.5 py-2.5 rounded-[10px] border border-line bg-bg text-[13.5px] text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal resize-y transition-colors"
                placeholder="Resumen corto para la lista"
              />
            </div>

            {/* Content with Write/Preview tabs + AI convert */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12px] font-semibold text-ink2">
                  Contenido
                </label>
                <div className="flex items-center gap-2">
                  {!isContentHtml && form.content.trim().length > 20 && (
                    <button
                      type="button"
                      onClick={() => formatContentMutation.mutate(form.content)}
                      disabled={formatContentMutation.isPending}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[11px] font-semibold bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      <Sparkles size={12} />
                      {formatContentMutation.isPending
                        ? "Convirtiendo..."
                        : "Convertir a HTML"}
                    </button>
                  )}
                  <div className="flex rounded-[8px] border border-line overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setContentTab("write")}
                      className={`px-3 py-1 text-[11px] font-semibold transition-colors ${
                        contentTab === "write"
                          ? "bg-teal-dark text-white"
                          : "bg-bg text-ink3 hover:text-ink"
                      }`}
                    >
                      <Code size={12} className="inline mr-1" />
                      Escribir
                    </button>
                    <button
                      type="button"
                      onClick={() => setContentTab("preview")}
                      className={`px-3 py-1 text-[11px] font-semibold transition-colors ${
                        contentTab === "preview"
                          ? "bg-teal-dark text-white"
                          : "bg-bg text-ink3 hover:text-ink"
                      }`}
                    >
                      <Eye size={12} className="inline mr-1" />
                      Vista previa
                    </button>
                  </div>
                </div>
              </div>

              {contentTab === "write" ? (
                <textarea
                  value={form.content}
                  onChange={(e) => set("content", e.target.value)}
                  rows={16}
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-line bg-bg text-[13px] text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal resize-y font-mono transition-colors"
                  placeholder={"Escribí el contenido acá...\nUsá el botón 'Convertir a HTML' para formatearlo automáticamente con IA."}
                />
              ) : (
                <div className="w-full min-h-[300px] px-4 py-3 rounded-[10px] border border-line bg-white">
                  {form.content ? (
                    <div
                      className="prose prose-sm max-w-none text-ink [&_h2]:text-[16px] [&_h2]:font-bold [&_h2]:mt-5 [&_h2]:mb-2 [&_p]:text-[13.5px] [&_p]:leading-relaxed [&_p]:mb-3 [&_li]:text-[13.5px] [&_ul]:pl-5 [&_ol]:pl-5 [&_strong]:font-semibold"
                      dangerouslySetInnerHTML={{
                        __html: sanitize(form.content),
                      }}
                    />
                  ) : (
                    <p className="text-[13px] text-ink3 italic">
                      Sin contenido para previsualizar
                    </p>
                  )}
                </div>
              )}
              <p className="text-[11px] text-ink3 mt-1.5">
                Escribí como texto plano y después hacé clic en "Convertir a HTML" para formatear con IA. Cambiá a Vista previa para ver el resultado.
              </p>
            </div>

            {/* Cover image */}
            <div>
              <label className="block text-[12px] font-semibold text-ink2 mb-1.5">
                Imagen de portada (URL)
              </label>
              <input
                value={form.cover_image}
                onChange={(e) => set("cover_image", e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-[10px] border border-line bg-bg text-[13.5px] text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-colors"
                placeholder="https://example.com/image.jpg"
              />
              {form.cover_image && (
                <div className="mt-3 rounded-[10px] overflow-hidden border border-line bg-bg max-w-[300px]">
                  <img
                    src={form.cover_image}
                    alt="Preview"
                    className="w-full h-auto object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Publishing & SEO card */}
          <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] p-6 space-y-5">
            <h3 className="text-[13px] font-bold text-ink">Publicación y SEO</h3>

            {/* Publish toggle */}
            <div className="flex items-center justify-between">
              <span className="text-[12.5px] text-ink2">Publicado</span>
              <button
                type="button"
                onClick={() => set("is_published", !form.is_published)}
                className={`relative w-10 h-[22px] rounded-full transition-colors ${
                  form.is_published ? "bg-teal" : "bg-line"
                }`}
              >
                <span
                  className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    form.is_published ? "left-[22px]" : "left-[3px]"
                  }`}
                />
              </button>
            </div>

            {/* Tags + Meta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-[12px] font-semibold text-ink2 mb-1.5">
                  Etiquetas
                </label>
                <input
                  value={form.tags}
                  onChange={(e) => set("tags", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-line bg-bg text-[13.5px] text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-colors"
                  placeholder="salud, pediatría, consejos"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-ink2 mb-1.5">
                  Meta descripción
                </label>
                <input
                  value={form.meta_description}
                  onChange={(e) => set("meta_description", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-line bg-bg text-[13.5px] text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-colors"
                  placeholder="Descripción para SEO..."
                />
              </div>
            </div>

            {/* Read-only metadata in edit mode */}
            {mode === "edit" && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-line">
                {editMeta.post_number != null && (
                  <div>
                    <p className="text-[10.5px] font-semibold text-ink3 uppercase">N° de post</p>
                    <p className="text-[12.5px] text-ink mt-0.5">{editMeta.post_number}</p>
                  </div>
                )}
                {editMeta.author_name && (
                  <div>
                    <p className="text-[10.5px] font-semibold text-ink3 uppercase">Autor</p>
                    <p className="text-[12.5px] text-ink mt-0.5">{editMeta.author_name}</p>
                  </div>
                )}
                {editMeta.published_at && (
                  <div>
                    <p className="text-[10.5px] font-semibold text-ink3 uppercase">Publicado el</p>
                    <p className="text-[12.5px] text-ink mt-0.5">{formatDate(editMeta.published_at)}</p>
                  </div>
                )}
                {editMeta.created_at && (
                  <div>
                    <p className="text-[10.5px] font-semibold text-ink3 uppercase">Creado el</p>
                    <p className="text-[12.5px] text-ink mt-0.5">{formatDate(editMeta.created_at)}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="px-5 py-2.5 rounded-[10px] bg-teal-dark text-white text-[13px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saveMutation.isPending
                ? "Guardando..."
                : mode === "create"
                  ? "Crear artículo"
                  : "Guardar cambios"}
            </button>
            <button
              type="button"
              onClick={goBack}
              className="px-4 py-2.5 rounded-[10px] text-[13px] font-medium text-ink2 hover:bg-bg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── list view ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-[1000px]">
      {toastEl}

      {/* Delete confirmation */}
      {deleteId !== null && (
        <div
          className="fixed inset-0 z-50 bg-ink/30 flex items-center justify-center"
          onClick={() => setDeleteId(null)}
        >
          <div
            className="bg-surface rounded-[14px] border border-line shadow-lg p-6 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[15px] font-bold text-ink mb-2">Eliminar artículo</h3>
            <p className="text-[13px] text-ink2 mb-5">
              Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 rounded-[10px] text-[13px] text-ink2 hover:bg-bg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteId)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 rounded-[10px] text-[13px] font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-[20px] font-bold text-ink tracking-tight">Blog</h1>
          <p className="text-[13px] text-ink2 mt-0.5">
            Gestión del blog
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3.5 py-2 rounded-[10px] bg-teal-dark text-white hover:opacity-90 transition-opacity"
        >
          <Plus size={14} />
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
            <p className="text-[14px]">Sin artículos aún</p>
            <button
              onClick={openCreate}
              className="mt-2 text-[12px] font-semibold text-teal-dark hover:underline"
            >
              Escribí el primero
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
                  <th className="px-5 py-3 text-left text-[11.5px] font-semibold text-ink3 uppercase tracking-wide hidden sm:table-cell">
                    Creado
                  </th>
                  <th className="px-5 py-3 text-right text-[11.5px] font-semibold text-ink3 uppercase tracking-wide">
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
                      {post.excerpt && (
                        <div className="text-[11.5px] text-ink3 mt-0.5 line-clamp-1 max-w-[400px]">
                          {post.excerpt}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() =>
                          togglePublishMutation.mutate({
                            id: post.id,
                            publish: !post.is_published,
                          })
                        }
                        title={post.is_published ? "Clic para despublicar" : "Clic para publicar"}
                      >
                        <StatusChip isPublished={post.is_published} />
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-[12.5px] text-ink2 hidden sm:table-cell">
                      {formatDate(post.created_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(post)}
                          className="p-1.5 rounded-[6px] text-ink3 hover:text-teal-dark hover:bg-bg transition-colors"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() =>
                            togglePublishMutation.mutate({
                              id: post.id,
                              publish: !post.is_published,
                            })
                          }
                          className="p-1.5 rounded-[6px] text-ink3 hover:text-teal-dark hover:bg-bg transition-colors"
                          title={post.is_published ? "Despublicar" : "Publicar"}
                        >
                          {post.is_published ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button
                          onClick={() => setDeleteId(post.id)}
                          className="p-1.5 rounded-[6px] text-ink3 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
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
          {data.count} post{data.count !== 1 ? "s" : ""} total
        </p>
      )}
    </div>
  );
}
