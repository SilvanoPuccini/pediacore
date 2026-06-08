import { useNavigate } from "react-router-dom";
import { BellOff, Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications, useMarkRead, useMarkAllRead } from "../hooks/useNotifications";
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
  return new Date(isoString).toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

// ─── Single notification row ──────────────────────────────────────────────────

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
        "w-full text-left px-4 py-3 flex items-start gap-3 transition-colors",
        notification.is_read
          ? "hover:bg-bg/60"
          : "bg-teal/5 hover:bg-teal/10"
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
            "text-[12px] leading-snug truncate",
            notification.is_read ? "text-ink2 font-normal" : "text-ink font-semibold"
          )}
        >
          {notification.title}
        </p>
        <p className="text-[11px] text-ink3 truncate mt-0.5">{notification.message}</p>
        <p className="text-[10px] text-ink3 mt-1">{relativeTime(notification.created_at)}</p>
      </div>
      {!notification.is_read && (
        <Check size={13} className="text-teal-dark shrink-0 mt-1" />
      )}
    </button>
  );
}

// ─── NotificationDropdown ─────────────────────────────────────────────────────

export default function NotificationDropdown({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { data, isLoading } = useNotifications(1);
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const notifications = data?.results ?? [];
  const hasUnread = notifications.some((n) => !n.is_read);

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-surface border border-line rounded-[16px] shadow-[var(--shadow-pop)] z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <span className="text-[13px] font-semibold text-ink">Notificaciones</span>
        {hasUnread && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="flex items-center gap-1 text-[11px] text-teal-dark hover:text-teal font-semibold transition-colors disabled:opacity-50"
          >
            <CheckCheck size={12} />
            Marcar todas como leídas
          </button>
        )}
      </div>

      {/* List */}
      <div className="divide-y divide-line max-h-[340px] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 rounded-full border-2 border-line border-t-teal animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 px-4 text-center">
            <BellOff size={24} className="text-ink3" />
            <p className="text-[12px] text-ink3">No tenés notificaciones nuevas</p>
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
        <div className="px-4 py-2.5 border-t border-line">
          <button
            onClick={() => { navigate("/portal/notificaciones"); onClose(); }}
            className="text-[12px] text-teal-dark font-semibold hover:text-teal transition-colors"
          >
            Ver todas las notificaciones
          </button>
        </div>
      )}
    </div>
  );
}
