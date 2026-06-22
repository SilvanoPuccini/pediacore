import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Video,
  Plus,
  ArrowLeft,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  AlertCircle,
  Play,
  Sparkles,
} from "lucide-react";
import api from "@/lib/api";
import type { VideoResource, PaginatedResponse } from "@/types/api";

// ─── constants ──────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: "URGENCIAS", label: "Urgencias" },
  { value: "LACTANCIA", label: "Lactancia" },
  { value: "ALIMENTACION", label: "Alimentacion" },
  { value: "SUENO", label: "Sueno" },
  { value: "PRIMEROS_AUXILIOS", label: "Primeros auxilios" },
  { value: "DESARROLLO", label: "Desarrollo" },
  { value: "CONSEJOS", label: "Consejos" },
] as const;

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label])
);

// ─── helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/
  );
  return match?.[1] ?? null;
}

function chaptersToText(chapters: { time_seconds: number; label: string }[]): string {
  return chapters
    .map((ch) => {
      const m = Math.floor(ch.time_seconds / 60);
      const s = ch.time_seconds % 60;
      return `${m}:${String(s).padStart(2, "0")} ${ch.label}`;
    })
    .join("\n");
}

function textToChapters(text: string): { time_seconds: number; label: string }[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+):(\d{2})\s+(.+)$/);
      if (!match) return null;
      return {
        time_seconds: parseInt(match[1]) * 60 + parseInt(match[2]),
        label: match[3].trim(),
      };
    })
    .filter((ch): ch is { time_seconds: number; label: string } => ch !== null);
}

function StatusChip({ isPublished }: { isPublished: boolean }) {
  const s = isPublished
    ? { bg: "rgba(168, 213, 181, 0.30)", text: "#3F8358", label: "Published" }
    : { bg: "rgba(180, 180, 190, 0.25)", text: "#777", label: "Draft" };
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

function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-[rgba(125,211,192,0.15)] text-teal-dark">
      {CATEGORY_LABELS[category] ?? category}
    </span>
  );
}

// ─── form types ─────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  title: "",
  youtube_url: "",
  description: "",
  category: "CONSEJOS",
  duration_seconds: 0,
  chapters_text: "",
  thumbnail: "",
};

type FormData = typeof EMPTY_FORM;

// ─── page ───────────────────────────────────────────────────────────────────────

export default function VideosPage() {
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

  const set = <K extends keyof FormData>(field: K, value: FormData[K]) =>
    setForm((f) => ({ ...f, [field]: value }));

  // ── queries ─────────────────────────────────────────────────────────────────

  const { data, isLoading, isError } = useQuery<PaginatedResponse<VideoResource>>({
    queryKey: ["videos-admin"],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<VideoResource>>(
        "/admin/videos/?page_size=100"
      );
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const videos = data?.results ?? [];

  // ── mutations ───────────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (mode === "edit" && editId) {
        return api.patch(`/admin/videos/${editId}/`, payload);
      }
      return api.post("/admin/videos/", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["videos-admin"] });
      flash(mode === "edit" ? "Video updated" : "Video created");
      goBack();
    },
    onError: () => flash("Error saving video"),
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, publish }: { id: number; publish: boolean }) =>
      api.post(`/admin/videos/${id}/${publish ? "publish" : "unpublish"}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["videos-admin"] });
      flash("Status updated");
    },
    onError: () => flash("Error updating status"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/admin/videos/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["videos-admin"] });
      flash("Video deleted");
      setDeleteId(null);
    },
    onError: () => flash("Error deleting video"),
  });

  const autofillMutation = useMutation({
    mutationFn: async (youtubeUrl: string) => {
      const { data } = await api.post<{
        suggestions: {
          title?: string;
          description?: string;
          category?: string;
          chapters?: { time_seconds: number; label: string }[];
        };
      }>("/admin/videos/autofill-preview/", {
        youtube_url: youtubeUrl,
        title: form.title || undefined,
        duration_seconds: form.duration_seconds || undefined,
      });
      return data.suggestions;
    },
    onSuccess: (suggestions) => {
      setForm((f) => ({
        ...f,
        title: suggestions.title || f.title,
        description: suggestions.description || f.description,
        category: suggestions.category || f.category,
        chapters_text: suggestions.chapters?.length
          ? chaptersToText(suggestions.chapters)
          : f.chapters_text,
      }));
      flash("Fields populated with AI suggestions");
    },
    onError: () => flash("AI autofill failed — check YouTube URL"),
  });

  // ── actions ─────────────────────────────────────────────────────────────────

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditId(null);
    setMode("create");
  }

  function openEdit(video: VideoResource) {
    setForm({
      title: video.title,
      youtube_url: video.youtube_url,
      description: video.description,
      category: video.category,
      duration_seconds: video.duration_seconds,
      chapters_text: chaptersToText(video.chapters ?? []),
      thumbnail: video.thumbnail ?? "",
    });
    setEditId(video.id);
    setMode("edit");
  }

  function goBack() {
    setMode("list");
    setEditId(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      flash("Title is required");
      return;
    }
    if (!form.youtube_url.trim()) {
      flash("YouTube URL is required");
      return;
    }
    const chapters = textToChapters(form.chapters_text);
    const payload: Record<string, unknown> = {
      title: form.title,
      youtube_url: form.youtube_url,
      description: form.description,
      category: form.category,
      duration_seconds: form.duration_seconds,
      chapters,
      thumbnail: form.thumbnail || null,
    };
    saveMutation.mutate(payload);
  }

  // YouTube preview
  const previewId = useMemo(
    () => (form.youtube_url ? extractYouTubeId(form.youtube_url) : null),
    [form.youtube_url]
  );

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
            {mode === "create" ? "New video" : "Edit video"}
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
                placeholder="Video title"
              />
            </div>

            {/* YouTube URL + preview */}
            <div>
              <label className="block text-[12px] font-semibold text-ink2 mb-1.5">
                YouTube URL *
              </label>
              <input
                value={form.youtube_url}
                onChange={(e) => set("youtube_url", e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-[10px] border border-line bg-bg text-[13.5px] text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-colors"
                placeholder="https://www.youtube.com/watch?v=..."
              />
              {previewId && (
                <div className="mt-3 rounded-[10px] overflow-hidden border border-line bg-bg aspect-video max-w-[400px]">
                  <iframe
                    src={`https://www.youtube.com/embed/${previewId}`}
                    title="Preview"
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}
              {form.youtube_url.trim() && (
                <button
                  type="button"
                  onClick={() => autofillMutation.mutate(form.youtube_url)}
                  disabled={autofillMutation.isPending}
                  className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-[8px] bg-teal-dark/10 text-teal-dark hover:bg-teal-dark/20 transition-colors disabled:opacity-50"
                >
                  <Sparkles size={13} />
                  {autofillMutation.isPending
                    ? "Generating..."
                    : "Autofill with AI"}
                </button>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-[12px] font-semibold text-ink2 mb-1.5">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={4}
                className="w-full px-3.5 py-2.5 rounded-[10px] border border-line bg-bg text-[13.5px] text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal resize-y transition-colors"
                placeholder="Video description"
              />
            </div>

            {/* Category + Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-[12px] font-semibold text-ink2 mb-1.5">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) => set("category", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-line bg-bg text-[13.5px] text-ink focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-colors"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-ink2 mb-1.5">
                  Duration (seconds)
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.duration_seconds || ""}
                  onChange={(e) =>
                    set("duration_seconds", parseInt(e.target.value) || 0)
                  }
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-line bg-bg text-[13.5px] text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-colors"
                  placeholder="360"
                />
                {form.duration_seconds > 0 && (
                  <p className="text-[11px] text-ink3 mt-1">
                    = {formatDuration(form.duration_seconds)}
                  </p>
                )}
              </div>
            </div>

            {/* Thumbnail */}
            <div>
              <label className="block text-[12px] font-semibold text-ink2 mb-1.5">
                Thumbnail (URL)
              </label>
              <input
                value={form.thumbnail}
                onChange={(e) => set("thumbnail", e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-[10px] border border-line bg-bg text-[13.5px] text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-colors"
                placeholder="Leave empty to use YouTube default"
              />
            </div>

            {/* Chapters */}
            <div>
              <label className="block text-[12px] font-semibold text-ink2 mb-1.5">
                Chapters
              </label>
              <textarea
                value={form.chapters_text}
                onChange={(e) => set("chapters_text", e.target.value)}
                rows={5}
                className="w-full px-3.5 py-2.5 rounded-[10px] border border-line bg-bg text-[13px] text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal resize-y font-mono transition-colors"
                placeholder={"0:00 Introduction\n1:30 Topic one\n5:00 Summary"}
              />
              <p className="text-[11px] text-ink3 mt-1">
                One chapter per line: MM:SS Label
              </p>
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
                  ? "Create video"
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
            <h3 className="text-[15px] font-bold text-ink mb-2">Delete video</h3>
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
          <h1 className="text-[20px] font-bold text-ink tracking-tight">Videos</h1>
          <p className="text-[13px] text-ink2 mt-0.5">
            Video library management
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3.5 py-2 rounded-[10px] bg-teal-dark text-white hover:opacity-90 transition-opacity"
        >
          <Plus size={14} />
          New video
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-5 w-5 rounded-full border-2 border-line border-t-teal animate-spin" />
        </div>
      ) : isError ? (
        <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] flex flex-col items-center justify-center py-16 gap-2 text-ink3">
          <AlertCircle size={28} className="opacity-40" />
          <p className="text-[13px]">Error loading videos</p>
        </div>
      ) : videos.length === 0 ? (
        <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] flex flex-col items-center justify-center py-16 gap-2 text-ink3">
          <Video size={32} className="opacity-40" />
          <p className="text-[14px]">No videos yet</p>
          <button
            onClick={openCreate}
            className="mt-2 text-[12px] font-semibold text-teal-dark hover:underline"
          >
            Add the first one
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((video) => {
            const ytId = extractYouTubeId(video.youtube_url);
            const thumb =
              video.thumbnail ||
              (ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : null);

            return (
              <div
                key={video.id}
                className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] overflow-hidden group"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-bg">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play size={32} className="text-ink3 opacity-30" />
                    </div>
                  )}
                  {/* Duration overlay */}
                  {video.duration_seconds > 0 && (
                    <span className="absolute bottom-2 right-2 bg-ink/80 text-white text-[10.5px] font-semibold px-1.5 py-0.5 rounded-[4px]">
                      {formatDuration(video.duration_seconds)}
                    </span>
                  )}
                  {/* Status overlay */}
                  <div className="absolute top-2 left-2">
                    <StatusChip isPublished={video.is_published} />
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-[13px] font-semibold text-ink leading-snug line-clamp-2 flex-1">
                      {video.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <CategoryBadge category={video.category} />
                    <span className="text-[11px] text-ink3">
                      {formatDate(video.created_at)}
                    </span>
                    {video.view_count > 0 && (
                      <span className="text-[11px] text-ink3">
                        {video.view_count} view{video.view_count !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      onClick={() => openEdit(video)}
                      className="p-1.5 rounded-[6px] text-ink3 hover:text-teal-dark hover:bg-bg transition-colors"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() =>
                        togglePublishMutation.mutate({
                          id: video.id,
                          publish: !video.is_published,
                        })
                      }
                      className="p-1.5 rounded-[6px] text-ink3 hover:text-teal-dark hover:bg-bg transition-colors"
                      title={video.is_published ? "Unpublish" : "Publish"}
                    >
                      {video.is_published ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      onClick={() => setDeleteId(video.id)}
                      className="p-1.5 rounded-[6px] text-ink3 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {data && (
        <p className="text-[12px] text-ink3">
          {data.count} video{data.count !== 1 ? "s" : ""} total
        </p>
      )}
    </div>
  );
}
