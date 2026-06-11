import { useState, useEffect } from "react";
import { Menu, X, LogOut, User, CalendarDays, LayoutDashboard } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const NAV_LINKS = [
  { label: "Servicios", href: "/#servicios" },
  { label: "Etapas", href: "/#etapas" },
  { label: "Cómo funciona", href: "/#como-funciona" },
  { label: "Dra. Estefi", href: "/#dra-estefi" },
  { label: "Testimonios", href: "/#testimonios" },
  { label: "Sedes", href: "/#sedes" },
  { label: "Blog", href: "/blog" },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const isBooking = pathname.startsWith("/booking");
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();
  const [logoutOpen, setLogoutOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      {/* Main nav */}
      <nav
        className={cn(
          "transition-all duration-300",
          scrolled
            ? "bg-[var(--bg)]/85 backdrop-blur-md shadow-[var(--shadow-soft)]"
            : "bg-[var(--bg)]"
        )}
      >
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between gap-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-white shrink-0">
              <img
                src="/images/logo.svg"
                alt="Logo Dra. Estefi Pediatra"
                className="w-full h-full object-contain [object-position:center_22%]"
              />
            </div>
            <div className="leading-tight">
              <div className="font-display text-[15px] font-semibold text-[var(--ink)] tracking-tight">
                Dra. Estefi
              </div>
              <div className="text-[10px] text-[var(--ink3)] tracking-[0.12em] uppercase font-medium">
                Pediatra
              </div>
            </div>
          </Link>

          {/* Desktop nav links (hidden on booking) */}
          {!isBooking && (
            <ul className="hidden lg:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="px-3 py-2 text-[13px] text-[var(--ink2)] hover:text-[var(--ink)] transition-colors rounded-lg hover:bg-[var(--cream)]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {/* Desktop CTA area */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            {isAuthenticated && user ? (
              <>
                <span className="flex items-center gap-1.5 text-[13px] text-[var(--ink2)]">
                  <User size={14} />
                  {user.first_name}
                </span>
                {user.role === "TUTOR" && (
                  <Link
                    to="/portal/turnos"
                    className="flex items-center gap-1.5 text-[13px] text-[var(--ink2)] hover:text-[var(--ink)] transition-colors px-3 py-2 rounded-[10px] hover:bg-[var(--cream)]"
                  >
                    <CalendarDays size={14} />
                    Mis Turnos
                  </Link>
                )}
                {!isBooking && user?.role === "DOCTOR" && (
                  <Link
                    to="/dashboard"
                    className="flex items-center gap-1.5 text-[13px] text-[var(--ink2)] hover:text-[var(--ink)] transition-colors px-3 py-2 rounded-[10px] hover:bg-[var(--cream)]"
                  >
                    <LayoutDashboard size={14} />
                    Dashboard
                  </Link>
                )}
                <button
                  onClick={() => setLogoutOpen(true)}
                  className="flex items-center gap-1.5 text-[12px] text-[var(--ink3)] hover:text-[var(--ink)] transition-colors px-2 py-1.5 rounded-lg hover:bg-[var(--cream)]"
                >
                  <LogOut size={13} />
                  Salir
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-[10px] text-[13px] font-medium text-[var(--ink2)] hover:text-[var(--ink)] hover:bg-[var(--cream)] transition-colors"
                >
                  Ingresar
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-[10px] text-[13px] font-semibold text-[var(--teal-dark)] border border-[var(--teal)]/30 hover:bg-[var(--teal)]/5 transition-colors"
                >
                  Crear cuenta
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-2 rounded-lg text-[var(--ink2)] hover:bg-[var(--cream)] transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        <div
          className={cn(
            "lg:hidden overflow-hidden transition-all duration-300",
            mobileOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="max-w-[1280px] mx-auto px-6 pb-5 pt-2 flex flex-col gap-1">
            {/* Section links (hidden on booking) */}
            {!isBooking && NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="px-3 py-2.5 text-[14px] text-[var(--ink2)] hover:text-[var(--ink)] hover:bg-[var(--cream)] rounded-lg transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-3 flex flex-col gap-2">
              {isAuthenticated && user && (
                <>
                  <div className="flex items-center justify-between px-3 py-2.5 bg-[var(--cream)] rounded-lg">
                    <span className="flex items-center gap-1.5 text-[14px] text-[var(--ink)]">
                      <User size={15} />
                      {user.first_name}
                    </span>
                    <button
                      onClick={() => setLogoutOpen(true)}
                      className="flex items-center gap-1.5 text-[13px] text-[var(--ink3)] hover:text-[var(--ink)]"
                    >
                      <LogOut size={14} />
                      Salir
                    </button>
                  </div>
                  {user.role === "TUTOR" && (
                    <Link
                      to="/portal/turnos"
                      className="flex items-center gap-2 px-3 py-2.5 text-[14px] text-[var(--ink2)] hover:text-[var(--ink)] hover:bg-[var(--cream)] rounded-lg transition-colors"
                      onClick={() => setMobileOpen(false)}
                    >
                      <CalendarDays size={15} />
                      Mis Turnos
                    </Link>
                  )}
                </>
              )}
              {!isAuthenticated && (
                <div className="flex gap-2">
                  <Link
                    to="/login"
                    className="flex-1 px-4 py-2.5 rounded-[10px] text-[14px] font-medium text-[var(--ink2)] text-center hover:bg-[var(--cream)] transition-colors border border-[var(--line)]"
                    onClick={() => setMobileOpen(false)}
                  >
                    Ingresar
                  </Link>
                  <Link
                    to="/register"
                    className="flex-1 px-4 py-2.5 rounded-[10px] text-[14px] font-semibold text-[var(--teal-dark)] text-center border border-[var(--teal)]/30 hover:bg-[var(--teal)]/5 transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    Crear cuenta
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      <ConfirmDialog
        open={logoutOpen}
        title="Cerrar sesión"
        message="¿Estás seguro de que querés salir? Vas a necesitar iniciar sesión de nuevo para acceder a tu portal."
        confirmLabel="Cerrar sesión"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={async () => {
          await logout();
          setLogoutOpen(false);
        }}
        onCancel={() => setLogoutOpen(false)}
      />
    </header>
  );
}
