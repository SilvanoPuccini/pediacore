import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { useNotifications, useMarkAllRead, useMarkRead } from "../hooks/useNotifications";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types/api";

// ─── Relative time helper ─────────────────────────────────────────────────────

function relativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "Ahora";
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `Hace ${diffHrs} h`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return new Date(isoString).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
  });
}

function notificationLink(n: Notification): string | null {
  if (!n.related_id) return null;
  switch (n.related_type) {
    case "appointment":
      return `/portal/turnos/${n.related_id}`;
    case "payment":
      return `/portal/pagos/${n.related_id}`;
    case "patient":
      return `/portal/hijos/${n.related_id}`;
    default:
      return null;
  }
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useNotifications(page);
  const markAllRead = useMarkAllRead();
  const markRead = useMarkRead();
  const navigate = useNavigate();

  const notifications = data?.results ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / 5);
  const hasUnread = notifications.some((n) => !n.is_read);

  function handleClick(n: Notification) {
    if (!n.is_read) markRead.mutate(n.id);
    const link = notificationLink(n);
    if (link) navigate(link);
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-[28px] font-semibold text-ink mb-1">
            Notificaciones
          </h1>
          <p className="text-[14px] text-ink3">
            Tus mensajes y avisos recientes.
          </p>
        </div>
        {hasUnread && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-[12px] bg-cream text-ink text-[13px] font-semibold hover:bg-teal/10 transition-colors disabled:opacity-50"
          >
            <CheckCheck size={15} />
            Marcar todas como leídas
          </button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 rounded-full border-2 border-line border-t-teal animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-surface border border-line rounded-[20px] p-10 flex flex-col items-center gap-4 text-center shadow-[var(--shadow-soft)]">
          <div className="h-14 w-14 rounded-full bg-cream flex items-center justify-center">
            <Bell size={24} className="text-teal-dark" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-ink mb-1">
              No tenés notificaciones
            </p>
            <p className="text-[13px] text-ink3">
              Cuando haya novedades, van a aparecer acá.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-surface border border-line rounded-[20px] shadow-[var(--shadow-soft)] divide-y divide-line overflow-hidden">
            {notifications.map((n) => {
              const link = notificationLink(n);
              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    "w-full flex items-start gap-3 px-5 py-4 text-left transition-colors",
                    !n.is_read && "bg-teal/5",
                    link ? "hover:bg-bg cursor-pointer" : "cursor-default"
                  )}
                >
                  <span
                    className={cn(
                      "mt-2 shrink-0 h-2 w-2 rounded-full",
                      n.is_read ? "bg-transparent" : "bg-teal-dark"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-[13px] leading-snug",
                        n.is_read ? "text-ink2 font-normal" : "text-ink font-semibold"
                      )}
                    >
                      {n.title}
                    </p>
                    <p className="text-[12px] text-ink3 mt-0.5">{n.message}</p>
                    <p className="text-[11px] text-ink3 mt-1">
                      {relativeTime(n.created_at)}
                    </p>
                  </div>
                  {link && (
                    <ChevronRight size={14} className="text-ink3 mt-1.5 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 text-[13px] font-semibold text-ink2 hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
                Anterior
              </button>
              <span className="text-[12px] text-ink3">
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 text-[13px] font-semibold text-ink2 hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
