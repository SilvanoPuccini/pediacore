import { useState } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, LogOut, CalendarDays, Baby, UserCircle, Home, LayoutDashboard, Receipt } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Inicio", href: "/portal", icon: LayoutDashboard, exact: true },
  { label: "Mis Turnos", href: "/portal/turnos", icon: CalendarDays },
  { label: "Mis Hijos", href: "/portal/hijos", icon: Baby },
  { label: "Pagos", href: "/portal/pagos", icon: Receipt },
  { label: "Mi Perfil", href: "/portal/perfil", icon: UserCircle },
];

export default function TutorLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-line flex flex-col transition-transform duration-300",
          "lg:translate-x-0 lg:static lg:flex",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Sidebar header */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-line shrink-0">
          <img
            src="/images/logo.png"
            alt="Logo"
            className="h-11 w-11 rounded-full object-cover bg-white"
          />
          <div className="leading-tight">
            <div className="font-display text-[14px] font-semibold text-ink truncate max-w-[140px]">
              {user?.first_name ?? user?.email}
            </div>
            <div className="text-[11px] text-ink3">Mi Portal</div>
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
                  ? "bg-cream text-ink font-semibold"
                  : "text-ink hover:bg-cream"
              )}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={16} className="text-teal-dark shrink-0" />
              {label}
            </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-line">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13px] font-medium text-ink2 hover:text-ink hover:bg-cream transition-colors mb-1"
            onClick={() => setSidebarOpen(false)}
          >
            <Home size={15} />
            Volver al inicio
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13px] font-medium text-ink2 hover:text-ink hover:bg-cream transition-colors"
          >
            <LogOut size={15} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
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
          <span className="text-[14px] font-semibold text-ink">
            Portal de padres
          </span>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
