import { useState } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnreadCount } from "../hooks/useNotifications";
import NotificationDrawer from "./NotificationDrawer";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: unreadCount = 0 } = useUnreadCount();

  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
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

      <NotificationDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
