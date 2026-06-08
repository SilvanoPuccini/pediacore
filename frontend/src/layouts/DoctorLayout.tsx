import { useState, useRef, useEffect } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  Calendar,
  Users,
  Clock,
  CalendarClock,
  FileText,
  CreditCard,
  Settings,
  MapPin,
  ChevronUp,
  Check,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { useSedeStore } from "@/features/doctor/stores/useSedeStore";
import { cn } from "@/lib/utils";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import NotificationBell from "@/features/tutor/components/NotificationBell";
import api from "@/lib/api";
import type { Location } from "@/types/api";

// ─── Nav items ─────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, exact: true },
  { label: "Calendario", href: "/dashboard/calendario", icon: Calendar },
  { label: "Pacientes", href: "/dashboard/pacientes", icon: Users },
  { label: "Lista de espera", href: "/dashboard/espera", icon: Clock },
  { label: "Horarios", href: "/dashboard/horarios", icon: CalendarClock },
  { label: "Blog", href: "/dashboard/blog", icon: FileText },
  { label: "Pagos", href: "/dashboard/pagos", icon: CreditCard },
  { label: "Configuración", href: "/dashboard/config", icon: Settings },
];

// ─── Helpers ────────────────────────────────────────────────────────────────────

function getInitials(firstName?: string, lastName?: string, email?: string): string {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (firstName) return firstName[0].toUpperCase();
  if (email) return email[0].toUpperCase();
  return "?";
}

function usePageTitle(pathname: string): string {
  if (pathname === "/dashboard") return "Dashboard";
  if (pathname.startsWith("/dashboard/calendario")) return "Calendario";
  if (pathname.startsWith("/dashboard/pacientes")) return "Pacientes";
  if (pathname.startsWith("/dashboard/espera")) return "Lista de espera";
  if (pathname.startsWith("/dashboard/horarios")) return "Horarios";
  if (pathname.startsWith("/dashboard/blog")) return "Blog";
  if (pathname.startsWith("/dashboard/pagos")) return "Pagos";
  if (pathname.startsWith("/dashboard/config")) return "Configuración";
  return "Dashboard";
}

// ─── DoctorLayout ──────────────────────────────────────────────────────────────

export default function DoctorLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const [sedeOpen, setSedeOpen] = useState(false);
  const sedeRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuthStore();
  const { sedeId, sedeName, setSede } = useSedeStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const pageTitle = usePageTitle(pathname);

  // Fetch locations for sede selector
  const { data: locations } = useQuery({
    queryKey: ["locations"],
    queryFn: () => api.get<Location[]>("/locations/").then((r) => r.data),
    staleTime: 1000 * 60 * 30,
  });

  // Close sede dropdown on outside click
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (sedeRef.current && !sedeRef.current.contains(e.target as Node)) setSedeOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const initials = getInitials(user?.first_name, user?.last_name, user?.email);

  async function handleLogout() {
    setLogoutPending(true);
    await logout();
    setLogoutPending(false);
    setLogoutOpen(false);
    navigate("/");
  }

  const sedeOptions: { id: number | null; name: string }[] = [
    { id: null, name: "Todas" },
    ...(locations ?? []).map((l) => ({ id: l.id, name: l.name })),
  ];

  return (
    <div className="min-h-screen bg-bg flex">
      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-60 flex flex-col bg-surface border-r border-line",
          "lg:translate-x-0 lg:static lg:flex transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="px-6 pt-7 pb-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[8px] bg-teal/20 flex items-center justify-center">
              <div className="w-3 h-3 rounded-[3px] bg-teal" />
            </div>
            <div className="text-[13px] font-bold tracking-[0.18em] text-teal-dark">
              PEDIACORE
            </div>
          </div>
        </div>

        {/* Doctor profile */}
        <div className="px-6 pb-5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F4A89A] to-[#C7B8E8] flex items-center justify-center text-white font-semibold text-sm">
                {initials}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-surface" />
            </div>
            <div className="min-w-0">
              <div className="text-[13.5px] font-semibold text-ink leading-tight">Dra. Estefi</div>
              <div className="text-[11.5px] text-ink3 mt-0.5">Pediatra</div>
            </div>
          </div>
        </div>

        <div className="mx-6 h-px bg-line" />

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-[0.16em] text-ink3 px-3 pb-2 pt-1 font-semibold">
            Principal
          </div>
          <ul className="space-y-0.5">
            {NAV_ITEMS.map(({ label, href, icon: Icon, exact }) => {
              const isActive = exact ? pathname === href : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    to={href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "group w-full relative flex items-center gap-3 px-3 py-2.5 rounded-[10px] transition-colors duration-200 text-[13.5px]",
                      isActive
                        ? "text-teal-dark font-semibold"
                        : "text-ink2 hover:bg-bg hover:text-ink"
                    )}
                    style={isActive ? { background: "rgba(125, 211, 192, 0.15)" } : undefined}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-teal-dark" />
                    )}
                    <Icon size={18} strokeWidth={isActive ? 1.75 : 1.5} className="shrink-0" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sede selector */}
        <div className="mx-6 h-px bg-line" />
        <div className="p-4 relative" ref={sedeRef}>
          <button
            onClick={() => setSedeOpen((o) => !o)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-[10px] bg-bg hover:bg-line/60 transition-colors"
          >
            <span className="flex items-center gap-2">
              <MapPin size={15} className="text-teal-dark" />
              <span className="text-[12.5px] text-ink2">Sede:</span>
              <span className="text-[12.5px] font-semibold text-ink">{sedeName}</span>
            </span>
            <ChevronUp
              size={14}
              className={cn("text-ink3 transition-transform", !sedeOpen && "rotate-180")}
            />
          </button>
          {sedeOpen && (
            <div className="absolute left-4 right-4 bottom-[58px] bg-surface border border-line rounded-[10px] shadow-[var(--shadow-pop)] overflow-hidden z-50">
              {sedeOptions.map((s) => (
                <button
                  key={s.name}
                  onClick={() => {
                    setSede(s.id, s.name);
                    setSedeOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 text-[12.5px] text-left hover:bg-bg transition-colors",
                    sedeId === s.id ? "text-teal-dark font-semibold" : "text-ink2"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <MapPin size={13} />
                    {s.name}
                  </span>
                  {sedeId === s.id && <Check size={14} className="text-teal-dark" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Logout */}
        <div className="px-3 pb-4 shrink-0">
          <button
            onClick={() => setLogoutOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13px] font-medium text-ink2 hover:text-ink hover:bg-bg transition-colors"
          >
            <LogOut size={15} className="shrink-0 text-ink3" />
            Cerrar sesión
          </button>
        </div>

        <ConfirmDialog
          open={logoutOpen}
          title="Cerrar sesión"
          message="¿Estás seguro de que querés salir?"
          confirmLabel="Cerrar sesión"
          cancelLabel="Cancelar"
          variant="danger"
          onConfirm={handleLogout}
          onCancel={() => setLogoutOpen(false)}
          isPending={logoutPending}
        />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-surface border-b border-line flex items-center px-5 gap-4 shrink-0">
          <button
            className="lg:hidden p-2 rounded-[8px] text-ink2 hover:bg-bg transition-colors"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? "Cerrar menú" : "Abrir menú"}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <span className="flex-1 text-[14px] font-semibold text-ink">{pageTitle}</span>

          <div className="flex items-center gap-2">
            <NotificationBell />
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#F4A89A] to-[#C7B8E8] flex items-center justify-center shrink-0 cursor-default">
              <span className="text-[12px] font-bold text-white">{initials}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
