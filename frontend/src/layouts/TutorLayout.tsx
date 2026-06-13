import { useState } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  CalendarDays,
  Baby,
  UserCircle,
  Home,
  Receipt,
  HelpCircle,
  Plus,
  ExternalLink,
  Search,
  ChevronRight,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { cn } from "@/lib/utils";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import NotificationBell from "@/features/tutor/components/NotificationBell";
import api from "@/lib/api";
import type { PaginatedResponse, Patient } from "@/types/api";

// ─── Nav items ─────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: "Inicio", href: "/portal", icon: Home, exact: true },
  { label: "Mis turnos", href: "/portal/turnos", icon: CalendarDays },
  { label: "Mis hijos", href: "/portal/hijos", icon: Baby },
  { label: "Pagos", href: "/portal/pagos", icon: Receipt },
  { label: "Mi perfil", href: "/portal/perfil", icon: UserCircle },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(firstName?: string, lastName?: string, email?: string): string {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (firstName) return firstName[0].toUpperCase();
  if (email) return email[0].toUpperCase();
  return "?";
}

function usePageTitle(pathname: string): { title: string; crumb: string } {
  if (pathname === "/portal") return { title: "Inicio", crumb: "Inicio" };
  if (pathname.startsWith("/portal/turnos")) return { title: "Mis turnos", crumb: "Mis turnos" };
  if (pathname.startsWith("/portal/hijos")) return { title: "Mis hijos", crumb: "Mis hijos" };
  if (pathname.startsWith("/portal/pagos")) return { title: "Pagos", crumb: "Pagos" };
  if (pathname.startsWith("/portal/perfil")) return { title: "Mi perfil", crumb: "Mi perfil" };
  if (pathname.startsWith("/portal/notificaciones")) return { title: "Notificaciones", crumb: "Notificaciones" };
  if (pathname.startsWith("/portal/ayuda")) return { title: "Ayuda", crumb: "Ayuda" };
  return { title: "Portal", crumb: "Portal" };
}

// ─── TutorLayout ───────────────────────────────────────────────────────────────

export default function TutorLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { title: pageTitle, crumb } = usePageTitle(pathname);

  const { data: patientsData } = useQuery({
    queryKey: ["my-patients"],
    queryFn: () =>
      api.get<PaginatedResponse<Patient>>("/patients/").then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  });
  const childCount = patientsData?.count ?? 0;

  const initials = getInitials(user?.first_name, user?.last_name, user?.email);
  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name ?? ""}`.trim()
    : (user?.email ?? "");

  async function handleLogout() {
    setLogoutPending(true);
    await logout();
    setLogoutPending(false);
    setLogoutOpen(false);
    navigate("/");
  }

  return (
    <div className="flex min-h-screen bg-bg text-ink">
      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[244px] flex flex-col h-screen",
          "bg-surface border-r border-line",
          "lg:translate-x-0 lg:sticky lg:top-0",
          "transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand */}
        <div className="px-6 pt-6 pb-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full overflow-hidden shrink-0" style={{ mixBlendMode: "multiply" }}>
              <img src="/images/logo.svg" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="font-display text-[16px] font-semibold text-ink">Dra. Estefi</div>
              <div className="text-[9.5px] tracking-[0.20em] uppercase text-ink3 font-medium">Pediatra</div>
            </div>
          </div>
        </div>

        {/* Parent profile mini-card */}
        <div className="mx-6 mb-4 p-3 rounded-[12px] bg-bg border border-line">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal to-mustard text-white font-bold text-[13px] flex items-center justify-center overflow-hidden">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  initials.charAt(0)
                )}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-sage border-2 border-bg" />
            </div>
            <div className="min-w-0">
              <div className="text-[12.5px] font-bold text-ink truncate">{displayName}</div>
              <div className="text-[10.5px] text-ink3">
                {childCount === 1 ? "1 hijo" : `${childCount} hijos`}
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 overflow-y-auto">
          {NAV_ITEMS.map(({ label, href, icon: Icon, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                to={href}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13px] font-medium transition-colors mb-0.5",
                  isActive
                    ? "text-teal-dark font-semibold bg-teal/[0.18]"
                    : "text-ink2 hover:bg-bg hover:text-ink"
                )}
                onClick={() => setSidebarOpen(false)}
              >
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-teal-dark" />
                )}
                <Icon
                  size={16}
                  strokeWidth={isActive ? 1.85 : 1.6}
                  className="shrink-0"
                />
                {label}
              </Link>
            );
          })}

          {/* Divider + secondary nav */}
          <div className="mx-2 h-px bg-line my-4" />
          <Link
            to="/portal/ayuda"
            className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13px] font-medium text-ink2 hover:bg-bg hover:text-ink transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <HelpCircle size={16} strokeWidth={1.6} className="shrink-0" />
            Ayuda
          </Link>
        </nav>

        {/* Bottom CTA */}
        <div className="px-4 py-5 border-t border-line shrink-0 space-y-2">
          <Link
            to="/booking"
            className="w-full flex items-center justify-center gap-2 bg-teal-dark text-white rounded-[10px] px-3 py-2.5 text-[12.5px] font-semibold shadow-soft hover:opacity-90 transition-opacity"
            onClick={() => setSidebarOpen(false)}
          >
            <Plus size={14} />
            Reservar consulta
          </Link>
          <a
            href="/"
            className="flex items-center justify-center gap-1.5 text-[11.5px] text-ink3 hover:text-ink2 transition-colors"
          >
            <ExternalLink size={11} />
            Volver al sitio
          </a>
        </div>

        <ConfirmDialog
          open={logoutOpen}
          title="Cerrar sesión"
          message="¿Estás seguro de que querés salir? Vas a necesitar iniciar sesión de nuevo para acceder a tu portal."
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

      {/* ── Main ── */}
      <main className="flex-1 min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-bg/85 backdrop-blur-sm border-b border-line">
          <div className="px-6 lg:px-8 py-4 flex items-center gap-4">
            <button
              className="lg:hidden p-2 rounded-[8px] text-ink2 hover:bg-cream transition-colors"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={sidebarOpen ? "Cerrar menú" : "Abrir menú"}
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <div className="flex-1 min-w-0">
              {/* Breadcrumb */}
              <div className="hidden md:flex items-center gap-1 text-[11px] text-ink3 mb-0.5">
                <span>Portal</span>
                <ChevronRight size={11} />
                <span className="text-ink2 font-semibold">{crumb}</span>
              </div>
              {/* Title */}
              <h1 className="text-[22px] font-bold text-ink tracking-tight font-display truncate">
                {pageTitle}
              </h1>
            </div>

            {/* Search */}
            <div className="hidden md:block relative w-[280px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3" />
              <input
                type="text"
                placeholder="Buscar..."
                className="w-full rounded-[10px] bg-surface border border-line pl-9 pr-3 py-2 text-[12.5px] text-ink placeholder:text-ink3 focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition"
              />
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <NotificationBell />
              <div className="h-8 w-8 rounded-full bg-teal-dark flex items-center justify-center shrink-0 overflow-hidden">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[12px] font-bold text-white">{initials}</span>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content area */}
        <div className="px-6 lg:px-8 py-7 max-w-[1400px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
