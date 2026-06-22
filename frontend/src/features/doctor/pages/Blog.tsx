import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Plus,
  ArrowLeft,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  AlertCircle,
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
};

type FormData = typeof EMPTY_FORM;

// ─── page ───────────────────────────────────────────────────────────────────────

export default function BlogPage() {
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [toast, setToast] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const set = (field: keyof FormData, value: string) =>
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
    mutationFn: async (payload: Record<string, string | null>) => {
      if (mode === "edit" && editId) {
        return api.patch(`/admin/blog/${editId}/`, payload);
      }
      return api.post("/admin/blog/", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-posts-admin"] });
      flash(mode === "edit" ? "Articulo actualizado" : "Articulo creado");
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
    onError: () => flash("Error al cambiar estado"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/admin/blog/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-posts-admin"] });
      flash("Articulo eliminado");
      setDeleteId(null);
    },
    onError: () => flash("Error al eliminar"),
  });

  // ── actions ─────────────────────────────────────────────────────────────────

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditId(null);
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
    });
    setEditId(post.id);
    setMode("edit");
  }

  function goBack() {
    setMode("list");
    setEditId(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      flash("El titulo es obligatorio");
      return;
    }
    const payload: Record<string, string | null> = { ...form };
    if (!payload.cover_image) payload.cover_image = null;
    saveMutation.mutate(payload);
  }

  // ── toast ───────────────────────────────────────────────────────────────────

  const toastEl = toast && (
    <div className="fixed top-6 right-6 z-50 bg-ink text-white text-[13px] font-medium px-4 py-2.5 rounded-[10px] shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
      {toast}
    </div>
  );

  // ── form view ───────────────────────────────────────────────────────────────

  if (mode !== "list") {
    return (
      <div className="space-y-6 max-w-[800px]">
        {toastEl}

        <div className="flex items-center gap-3">
          <button
            onClick={goBack}
            className="p-2 rounded-[8px] hover:bg-bg transition-colors text-ink2"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-[18px] font-bold text-ink">
            {mode === "create" ? "Nuevo articulo" : "Editar articulo"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] p-6 space-y-5">
            {/* Title */}
            <div>
              <label className="block text-[12px] font-semibold text-ink2 mb-1.5">
                Title *
              </label>
              <input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-[10px] border border-line bg-bg text-[13.5px] text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-colors"
                placeholder="Post title"
              />
            </div>

            {/* Excerpt */}
            <div>
              <label className="block text-[12px] font-semibold text-ink2 mb-1.5">
                Excerpt
              </label>
              <textarea
                value={form.excerpt}
                onChange={(e) => set("excerpt", e.target.value)}
                rows={2}
                className="w-full px-3.5 py-2.5 rounded-[10px] border border-line bg-bg text-[13.5px] text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal resize-y transition-colors"
                placeholder="Short summary shown in the listing"
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-[12px] font-semibold text-ink2 mb-1.5">
                Content
              </label>
              <textarea
                value={form.content}
                onChange={(e) => set("content", e.target.value)}
                rows={14}
                className="w-full px-3.5 py-2.5 rounded-[10px] border border-line bg-bg text-[13px] text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal resize-y font-mono transition-colors"
                placeholder="Post content (HTML supported)"
              />
            </div>

            {/* Cover image */}
            <div>
              <label className="block text-[12px] font-semibold text-ink2 mb-1.5">
                Cover image (URL)
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

            {/* Tags + Meta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-[12px] font-semibold text-ink2 mb-1.5">
                  Tags
                </label>
                <input
                  value={form.tags}
                  onChange={(e) => set("tags", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-line bg-bg text-[13.5px] text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-colors"
                  placeholder="pediatrics, tips, breastfeeding"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-ink2 mb-1.5">
                  Meta description
                </label>
                <input
                  value={form.meta_description}
                  onChange={(e) => set("meta_description", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-line bg-bg text-[13.5px] text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-colors"
                  placeholder="SEO description"
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="px-5 py-2.5 rounded-[10px] bg-teal-dark text-white text-[13px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saveMutation.isPending
                ? "Saving..."
                : mode === "create"
                  ? "Create post"
                  : "Save changes"}
            </button>
            <button
              type="button"
              onClick={goBack}
              className="px-4 py-2.5 rounded-[10px] text-[13px] font-medium text-ink2 hover:bg-bg transition-colors"
            >
              Cancel
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
            <h3 className="text-[15px] font-bold text-ink mb-2">Delete post</h3>
            <p className="text-[13px] text-ink2 mb-5">
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 rounded-[10px] text-[13px] text-ink2 hover:bg-bg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteId)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 rounded-[10px] text-[13px] font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
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
            Published posts and drafts
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3.5 py-2 rounded-[10px] bg-teal-dark text-white hover:opacity-90 transition-opacity"
        >
          <Plus size={14} />
          New post
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
            <p className="text-[13px]">Error loading posts</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-ink3">
            <FileText size={32} className="opacity-40" />
            <p className="text-[14px]">No posts yet</p>
            <button
              onClick={openCreate}
              className="mt-2 text-[12px] font-semibold text-teal-dark hover:underline"
            >
              Create the first one
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-5 py-3 text-left text-[11.5px] font-semibold text-ink3 uppercase tracking-wide">
                    Title
                  </th>
                  <th className="px-5 py-3 text-left text-[11.5px] font-semibold text-ink3 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left text-[11.5px] font-semibold text-ink3 uppercase tracking-wide hidden sm:table-cell">
                    Created
                  </th>
                  <th className="px-5 py-3 text-right text-[11.5px] font-semibold text-ink3 uppercase tracking-wide">
                    Actions
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
                        title={post.is_published ? "Click to unpublish" : "Click to publish"}
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
                          title="Edit"
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
                          title={post.is_published ? "Unpublish" : "Publish"}
                        >
                          {post.is_published ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button
                          onClick={() => setDeleteId(post.id)}
                          className="p-1.5 rounded-[6px] text-ink3 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete"
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
