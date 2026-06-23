import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useNotifications,
  useUnreadCount,
  useMarkRead,
  useMarkAllRead,
  notificationKeys,
} from "../hooks/useNotifications";

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

// ─── NotificationBell ─────────────────────────────────────────────────────────

type NotificationBellProps = {
  notificationsPath?: string;
};

export default function NotificationBell({ notificationsPath = "/portal/notificaciones" }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: unreadCount = 0 } = useUnreadCount();
  const { data, isLoading } = useNotifications(1);
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  // Force-refetch notification list when dropdown opens
  useEffect(() => {
    if (open) {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list(1) });
    }
  }, [open, queryClient]);

  const notifications = data?.results ?? [];
  const hasUnread = unreadCount > 0;
  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label={
          unreadCount > 0
            ? `${unreadCount} notificaciones sin leer`
            : "Notificaciones"
        }
        className={cn(
          "relative p-2 rounded-[10px] text-ink2 hover:text-ink hover:bg-cream transition-colors",
          open && "bg-cream text-ink"
        )}
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-[3px] flex items-center justify-center rounded-full bg-coral text-white text-[9px] font-bold leading-none">
            {badgeLabel}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] w-[360px] bg-surface border border-line rounded-[16px] shadow-[var(--shadow-pop)] z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-ink">
                Notificaciones
              </span>
              {hasUnread && (
                <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-coral text-white text-[9px] font-bold leading-none">
                  {badgeLabel}
                </span>
              )}
            </div>
            {hasUnread && (
              <button
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="flex items-center gap-1 text-[11px] text-teal-dark hover:text-teal font-semibold transition-colors disabled:opacity-50"
              >
                <CheckCheck size={13} />
                Marcar leídas
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-[320px] overflow-y-auto divide-y divide-line">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-6 w-6 rounded-full border-2 border-line border-t-teal animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 px-4 text-center">
                <BellOff size={24} className="text-ink3" />
                <p className="text-[13px] text-ink3">
                  No tenés notificaciones.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.is_read && markRead.mutate(n.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 flex items-start gap-2.5 transition-colors",
                    n.is_read ? "hover:bg-bg/60" : "bg-teal/5 hover:bg-teal/10"
                  )}
                >
                  <span
                    className={cn(
                      "mt-1.5 shrink-0 h-2 w-2 rounded-full",
                      n.is_read ? "bg-transparent" : "bg-teal-dark"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-[12.5px] leading-snug",
                        n.is_read
                          ? "text-ink2 font-normal"
                          : "text-ink font-semibold"
                      )}
                    >
                      {n.title}
                    </p>
                    <p className="text-[11.5px] text-ink3 mt-0.5 line-clamp-2">
                      {n.message}
                    </p>
                    <p className="text-[10.5px] text-ink3 mt-1">
                      {relativeTime(n.created_at)}
                    </p>
                  </div>
                  {!n.is_read && (
                    <Check size={12} className="text-teal-dark shrink-0 mt-1" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-line">
              <button
                onClick={() => {
                  navigate(notificationsPath);
                  setOpen(false);
                }}
                className="text-[12px] text-teal-dark font-semibold hover:text-teal transition-colors"
              >
                Ver todas las notificaciones
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
