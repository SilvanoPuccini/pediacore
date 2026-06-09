import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, BellOff, Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useNotifications,
  useMarkRead,
  useMarkAllRead,
  useUnreadCount,
} from "../hooks/useNotifications";
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

// ─── Notification row ─────────────────────────────────────────────────────────

function NotificationRow({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: number) => void;
}) {
  return (
    <button
      onClick={() => !notification.is_read && onMarkRead(notification.id)}
      className={cn(
        "w-full text-left px-5 py-3.5 flex items-start gap-3 transition-colors",
        notification.is_read ? "hover:bg-bg/60" : "bg-teal/5 hover:bg-teal/10"
      )}
    >
      {/* Unread dot */}
      <span
        className={cn(
          "mt-1.5 shrink-0 h-2 w-2 rounded-full",
          notification.is_read ? "bg-transparent" : "bg-teal-dark"
        )}
      />
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-[13px] leading-snug",
            notification.is_read
              ? "text-ink2 font-normal"
              : "text-ink font-semibold"
          )}
        >
          {notification.title}
        </p>
        <p className="text-[12px] text-ink3 mt-0.5 line-clamp-2">
          {notification.message}
        </p>
        <p className="text-[11px] text-ink3 mt-1">
          {relativeTime(notification.created_at)}
        </p>
      </div>
      {!notification.is_read && (
        <Check size={13} className="text-teal-dark shrink-0 mt-1" />
      )}
    </button>
  );
}

// ─── NotificationDrawer ───────────────────────────────────────────────────────

interface NotificationDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function NotificationDrawer({
  open,
  onClose,
}: NotificationDrawerProps) {
  const navigate = useNavigate();
  const { data, isLoading } = useNotifications(1);
  const { data: unreadCount = 0 } = useUnreadCount();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const notifications = data?.results ?? [];
  const hasUnread = unreadCount > 0;

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-ink/20 transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Notificaciones"
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-full max-w-[380px] bg-surface shadow-[var(--shadow-pop)] flex flex-col transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-[15px] font-semibold text-ink">
              Notificaciones
            </span>
            {hasUnread && (
              <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-coral text-white text-[10px] font-bold leading-none">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasUnread && (
              <button
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="flex items-center gap-1 text-[11px] text-teal-dark hover:text-teal font-semibold transition-colors disabled:opacity-50"
              >
                <CheckCheck size={13} />
                Marcar todas como leídas
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Cerrar panel de notificaciones"
              className="p-1.5 rounded-[8px] text-ink2 hover:text-ink hover:bg-cream transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto divide-y divide-line">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 rounded-full border-2 border-line border-t-teal animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 px-6 text-center">
              <BellOff size={28} className="text-ink3" />
              <p className="text-[13px] text-ink3">
                No tenés notificaciones nuevas.
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <NotificationRow
                key={n.id}
                notification={n}
                onMarkRead={(id) => markRead.mutate(id)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="shrink-0 px-5 py-3 border-t border-line">
            <button
              onClick={() => {
                navigate("/portal/notificaciones");
                onClose();
              }}
              className="text-[13px] text-teal-dark font-semibold hover:text-teal transition-colors"
            >
              Ver todas las notificaciones
            </button>
          </div>
        )}
      </div>
    </>
  );
}
