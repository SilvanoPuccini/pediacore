import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, LogOut, LayoutDashboard } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { cn } from "@/lib/utils";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  async function handleLogout() {
    setLogoutPending(true);
    await logout();
    setLogoutPending(false);
    setLogoutOpen(false);
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
          <div className="h-9 w-9 rounded-full overflow-hidden bg-white shrink-0">
            <img
              src="/images/logo.png"
              alt="Logo"
              className="w-full h-full object-cover scale-[1.5]"
            />
          </div>
          <div className="leading-tight">
            <div className="font-display text-[14px] font-semibold text-ink">
              Admin
            </div>
            <div className="text-[11px] text-ink3">Pediacore</div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <Link
            to="/admin"
            className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13px] font-medium text-ink hover:bg-cream transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <LayoutDashboard size={16} className="text-teal-dark" />
            Dashboard
          </Link>
        </nav>

        {/* User footer */}
        <div className="px-3 py-4 border-t border-line">
          <div className="px-3 py-2 mb-2">
            <div className="text-[13px] font-semibold text-ink truncate">
              {user?.full_name ?? user?.email}
            </div>
            <div className="text-[11px] text-ink3">{user?.email}</div>
          </div>
          <button
            onClick={() => setLogoutOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13px] font-medium text-ink2 hover:text-ink hover:bg-cream transition-colors"
          >
            <LogOut size={15} />
            Cerrar sesión
          </button>
        </div>

        <ConfirmDialog
          open={logoutOpen}
          title="Cerrar sesión"
          message="¿Estás seguro de que querés salir? Vas a necesitar iniciar sesión de nuevo para acceder al panel."
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
            Panel de administración
          </span>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
