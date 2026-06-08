import { useRef, useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnreadCount } from "../hooks/useNotifications";
import NotificationDropdown from "./NotificationDropdown";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: unreadCount = 0 } = useUnreadCount();

  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
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

      {open && <NotificationDropdown onClose={() => setOpen(false)} />}
    </div>
  );
}
