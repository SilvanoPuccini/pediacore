import { useState } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  LogOut,
  CalendarDays,
  Baby,
  UserCircle,
  LayoutDashboard,
  Receipt,
  HelpCircle,
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
  { label: "Inicio", href: "/portal", icon: LayoutDashboard, exact: true },
  { label: "Mis Turnos", href: "/portal/turnos", icon: CalendarDays },
  { label: "Mis Hijos", href: "/portal/hijos", icon: Baby },
  { label: "Pagos", href: "/portal/pagos", icon: Receipt },
  { label: "Mi Perfil", href: "/portal/perfil", icon: UserCircle },
];

// ─── Initials helper ────────────────────────────────────────────────────────────

function getInitials(firstName?: string, lastName?: string, email?: string): string {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (firstName) return firstName[0].toUpperCase();
  if (email) return email[0].toUpperCase();
  return "?";
}

// ─── Page title helper ──────────────────────────────────────────────────────────

function usePageTitle(pathname: string): string {
  if (pathname === "/portal") return "Inicio";
  if (pathname.startsWith("/portal/turnos")) return "Mis Turnos";
  if (pathname.startsWith("/portal/hijos")) return "Mis Hijos";
  if (pathname.startsWith("/portal/pagos")) return "Pagos";
  if (pathname.startsWith("/portal/perfil")) return "Mi Perfil";
  if (pathname.startsWith("/portal/notificaciones")) return "Notificaciones";
  return "Portal";
}

// ─── TutorLayout ───────────────────────────────────────────────────────────────

export default function TutorLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const pageTitle = usePageTitle(pathname);

  // Fetch linked children count for sidebar badge
  const { data: patientsData } = useQuery({
    queryKey: ["my-patients"],
    queryFn: () =>
      api
        .get<PaginatedResponse<Patient>>("/patients/")
        .then((r) => r.data),
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
    <div className="min-h-screen bg-bg flex">
      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300",
          "bg-gradient-to-b from-teal-dark/[0.06] to-bg border-r border-line",
          "lg:translate-x-0 lg:static lg:flex",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand header */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-line shrink-0">
          <div className="h-9 w-9 rounded-full overflow-hidden bg-white shrink-0 ring-1 ring-line">
            <img
              src="/images/logo.svg"
              alt="Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="leading-tight">
            <div className="font-display text-[13px] font-semibold text-ink truncate max-w-[140px]">
              Dra. Estefi Pediatra
            </div>
            <div className="text-[11px] text-ink3">Mi Portal</div>
          </div>
        </div>

        {/* Tutor profile block */}
        <div className="px-4 py-4 border-b border-line shrink-0">
          <div className="flex items-center gap-3">
            {/* Initials avatar */}
            <div className="h-10 w-10 rounded-full bg-teal-dark flex items-center justify-center shrink-0">
              <span className="text-[14px] font-bold text-white">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-ink truncate">
                {displayName}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {/* Online indicator */}
                <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                <span className="text-[11px] text-ink3">
                  {childCount === 1
                    ? "1 hijo vinculado"
                    : `${childCount} hijos vinculados`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {NAV_ITEMS.map(({ label, href, icon: Icon, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                to={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13px] font-medium transition-colors mb-0.5",
                  isActive
                    ? "bg-cream text-ink font-semibold border-l-2 border-teal-dark ml-[-2px] pl-[14px]"
                    : "text-ink2 hover:bg-cream hover:text-ink"
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon
                  size={16}
                  className={cn(
                    "shrink-0 transition-colors",
                    isActive ? "text-teal-dark" : "text-ink3"
                  )}
                />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-line shrink-0 space-y-0.5">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13px] font-medium text-ink2 hover:text-ink hover:bg-cream transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <HelpCircle size={15} className="shrink-0 text-ink3" />
            Ayuda
          </Link>
          <button
            onClick={() => setLogoutOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13px] font-medium text-ink2 hover:text-ink hover:bg-cream transition-colors"
          >
            <LogOut size={15} className="shrink-0 text-ink3" />
            Cerrar sesión
          </button>
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

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-surface border-b border-line flex items-center px-5 gap-4 shrink-0">
          <button
            className="lg:hidden p-2 rounded-[8px] text-ink2 hover:bg-cream transition-colors"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? "Cerrar menú" : "Abrir menú"}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Page title */}
          <span className="flex-1 text-[14px] font-semibold text-ink">
            {pageTitle}
          </span>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <NotificationBell />
            {/* User avatar (topbar) */}
            <div className="h-8 w-8 rounded-full bg-teal-dark flex items-center justify-center shrink-0 cursor-default">
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
