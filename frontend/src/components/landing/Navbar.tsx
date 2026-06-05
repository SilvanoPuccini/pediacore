import { useState, useEffect } from "react";
import { Menu, X, MapPin, Clock, Phone, LogOut, User, CalendarDays } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";

const NAV_LINKS = [
  { label: "Servicios", href: "#servicios" },
  { label: "Etapas", href: "#etapas" },
  { label: "Cómo funciona", href: "#como-funciona" },
  { label: "Dra. Estefi", href: "#dra-estefi" },
  { label: "Testimonios", href: "#testimonios" },
  { label: "Blog", href: "#blog" },
  { label: "Sedes", href: "#sedes" },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const isBooking = pathname.startsWith("/booking");
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      {/* Top strip */}
      <div className="bg-[var(--ink)] text-white text-[11px] py-2">
        <div className="max-w-[1280px] mx-auto px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5">
              <MapPin size={11} className="opacity-70" />
              Pucón &amp; Villarrica
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={11} className="opacity-70" />
              Lun – Vie · 09:00 – 19:00
            </span>
          </div>
          <div className="flex items-center gap-5">
            <a
              href="tel:+56912345678"
              className="flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity"
            >
              <Phone size={11} />
              +56 9 1234 5678
            </a>
            <a
              href="/admin"
              className="opacity-70 hover:opacity-100 transition-opacity"
            >
              Acceso doctora
            </a>
          </div>
        </div>
      </div>

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
                src="/images/logo.png"
                alt="Logo Dra. Estefi Pediatra"
                className="w-full h-full object-cover scale-[1.4]"
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
                  <a
                    href={link.href}
                    className="px-3 py-2 text-[13px] text-[var(--ink2)] hover:text-[var(--ink)] transition-colors rounded-lg hover:bg-[var(--cream)]"
                  >
                    {link.label}
                  </a>
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
                {!isBooking && (
                  <Link
                    to="/booking"
                    className={cn(
                      "relative overflow-hidden px-5 py-2.5 rounded-[10px] text-[13px] font-semibold text-white",
                      "bg-[var(--teal-dark)] shadow-[var(--shadow-cta)]",
                      "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgba(74,133,144,0.38)]",
                      "group"
                    )}
                  >
                    <span
                      className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700
                        bg-gradient-to-l from-transparent via-white/20 to-transparent skew-x-[-20deg]"
                      aria-hidden="true"
                    />
                    Reservar consulta
                  </Link>
                )}
                <button
                  onClick={() => logout()}
                  className="flex items-center gap-1.5 text-[12px] text-[var(--ink3)] hover:text-[var(--ink)] transition-colors px-2 py-1.5 rounded-lg hover:bg-[var(--cream)]"
                >
                  <LogOut size={13} />
                  Salir
                </button>
              </>
            ) : (
              <Link
                to={isBooking ? "/" : "/booking"}
                className={cn(
                  "relative overflow-hidden px-5 py-2.5 rounded-[10px] text-[13px] font-semibold text-white",
                  "bg-[var(--teal-dark)] shadow-[var(--shadow-cta)]",
                  "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgba(74,133,144,0.38)]",
                  "group"
                )}
              >
                <span
                  className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700
                    bg-gradient-to-l from-transparent via-white/20 to-transparent skew-x-[-20deg]"
                  aria-hidden="true"
                />
                {isBooking ? "Volver al inicio" : "Reservar consulta"}
              </Link>
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
              <a
                key={link.href}
                href={link.href}
                className="px-3 py-2.5 text-[14px] text-[var(--ink2)] hover:text-[var(--ink)] hover:bg-[var(--cream)] rounded-lg transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
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
                      onClick={() => { logout(); setMobileOpen(false); }}
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
              <Link
                to={isBooking ? "/" : "/booking"}
                className={cn(
                  "relative overflow-hidden px-5 py-3 rounded-[10px] text-[14px] font-semibold text-white text-center",
                  "bg-[var(--teal-dark)] shadow-[var(--shadow-cta)]",
                  "group"
                )}
                onClick={() => setMobileOpen(false)}
              >
                <span
                  className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700
                    bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]"
                  aria-hidden="true"
                />
                {isBooking ? "Volver al inicio" : "Reservar consulta"}
              </Link>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
