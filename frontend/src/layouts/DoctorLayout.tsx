import { useState, useRef, useEffect, useCallback } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  LogOut,
  ExternalLink,
  Globe,
  LayoutDashboard,
  Calendar,
  Users,
  Clock,
  CalendarClock,
  FileText,
  Video,
  CreditCard,
  Calculator,
  Settings,
  MapPin,
  ChevronUp,
  ChevronRight,
  Check,
  Search,
  CalendarPlus,
  Bell,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { useSedeStore } from "@/features/doctor/stores/useSedeStore";
import { cn } from "@/lib/utils";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import NotificationBell from "@/features/tutor/components/NotificationBell";
import api from "@/lib/api";
import type { ElementType, KeyboardEvent as ReactKeyboardEvent } from "react";
import type { Location } from "@/types/api";

// ─── Nav items ─────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, exact: true },
  { label: "Calendario", href: "/dashboard/calendario", icon: Calendar },
  { label: "Pacientes", href: "/dashboard/pacientes", icon: Users },
  { label: "Lista de espera", href: "/dashboard/espera", icon: Clock },
  { label: "Horarios", href: "/dashboard/horarios", icon: CalendarClock },
  { label: "Pagos", href: "/dashboard/pagos", icon: CreditCard },
  { label: "Finanzas", href: "/dashboard/finanzas", icon: Calculator },
  { label: "Blog", href: "/dashboard/blog", icon: FileText },
  { label: "Videos", href: "/dashboard/videos", icon: Video },
  { label: "Notificaciones", href: "/dashboard/notificaciones", icon: Bell },
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
  if (pathname.startsWith("/dashboard/videos")) return "Videos";
  if (pathname.startsWith("/dashboard/pagos")) return "Pagos";
  if (pathname.startsWith("/dashboard/finanzas")) return "Finanzas";
  if (pathname.startsWith("/dashboard/notificaciones")) return "Notificaciones";
  if (pathname.startsWith("/dashboard/config")) return "Configuración";
  return "Dashboard";
}

// ─── Debounce hook ──────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Quick actions ──────────────────────────────────────────────────────────────

type QuickAction = { id: string; label: string; href: string; icon: ElementType };

const QUICK_ACTIONS: QuickAction[] = [
  { id: "new-appt",    label: "Nuevo turno",     href: "/booking",               icon: CalendarPlus },
  { id: "calendar",   label: "Ver calendario",   href: "/dashboard/calendario",  icon: Calendar },
  { id: "patients",   label: "Ver pacientes",    href: "/dashboard/pacientes",   icon: Users },
];

// ─── Patient search result type ─────────────────────────────────────────────────

type PatientResult = {
  id: number;
  full_name: string;
  rut: string;
  age_display?: string;
};

type PatientPage = {
  results: PatientResult[];
};

// ─── Command palette ────────────────────────────────────────────────────────────

type CommandPaletteProps = {
  onClose: () => void;
};

function CommandPalette({ onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  // Autofocus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const { data: patientPage, isFetching } = useQuery<PatientPage>({
    queryKey: ["cmd-search", debouncedQuery],
    queryFn: () =>
      api
        .get<PatientPage>(`/patients/?search=${encodeURIComponent(debouncedQuery)}&page_size=5`)
        .then((r) => r.data),
    enabled: debouncedQuery.length >= 2,
    staleTime: 1000 * 30,
  });

  const patientResults = patientPage?.results ?? [];
  const showQuickActions = query.length < 2;

  // Unified list for keyboard nav
  const totalItems = showQuickActions ? QUICK_ACTIONS.length : patientResults.length;

  // Reset index when results change
  useEffect(() => {
    setActiveIdx(0);
  }, [debouncedQuery]);

  function handleSelect(href: string) {
    navigate(href);
    onClose();
  }

  function handleKeyDown(e: ReactKeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, totalItems - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && totalItems > 0) {
      e.preventDefault();
      if (showQuickActions) {
        handleSelect(QUICK_ACTIONS[activeIdx].href);
      } else {
        handleSelect(`/dashboard/pacientes/${patientResults[activeIdx].id}`);
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/30 flex justify-center"
      onClick={onClose}
    >
      <div
        className="max-w-lg w-full mx-4 mt-[15vh] h-fit"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search box */}
        <div className="bg-surface rounded-[14px] shadow-[var(--shadow-pop)] overflow-hidden border border-line">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-line">
            <Search size={16} className="text-ink3 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Buscar pacientes, turnos..."
              className="flex-1 bg-transparent text-[14px] text-ink placeholder:text-ink3 outline-none"
            />
            {isFetching && (
              <div className="h-4 w-4 rounded-full border-2 border-line border-t-teal animate-spin shrink-0" />
            )}
            <kbd className="text-[10.5px] text-ink3 bg-bg border border-line rounded-[5px] px-1.5 py-0.5 shrink-0">
              Esc
            </kbd>
          </div>

          {/* Results */}
          <div className="py-1.5 max-h-72 overflow-y-auto">
            {showQuickActions && (
              <>
                <p className="text-[10px] uppercase tracking-[0.14em] text-ink3 font-semibold px-4 py-1.5 pt-2">
                  Acciones rápidas
                </p>
                {QUICK_ACTIONS.map((action, i) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      onClick={() => handleSelect(action.href)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                        i === activeIdx ? "bg-bg" : "hover:bg-bg"
                      )}
                    >
                      <Icon size={15} className="text-ink3 shrink-0" />
                      <span className="text-[13px] text-ink">{action.label}</span>
                    </button>
                  );
                })}
              </>
            )}

            {!showQuickActions && patientResults.length === 0 && !isFetching && (
              <p className="text-[13px] text-ink3 px-4 py-4 text-center">
                Sin resultados para "{query}"
              </p>
            )}

            {!showQuickActions && patientResults.length > 0 && (
              <>
                <p className="text-[10px] uppercase tracking-[0.14em] text-ink3 font-semibold px-4 py-1.5 pt-2">
                  Pacientes
                </p>
                {patientResults.map((p, i) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelect(`/dashboard/pacientes/${p.id}`)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                      i === activeIdx ? "bg-bg" : "hover:bg-bg"
                    )}
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#D6F1EA] to-[#EDE4FF] flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-teal-dark">
                        {p.full_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-ink truncate">{p.full_name}</p>
                      <p className="text-[11.5px] text-ink3">
                        {p.rut}{p.age_display ? ` · ${p.age_display}` : ""}
                      </p>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DoctorLayout ──────────────────────────────────────────────────────────────

export default function DoctorLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const [sedeOpen, setSedeOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const sedeRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuthStore();
  const { sedeId, sedeName, setSede } = useSedeStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const pageTitle = usePageTitle(pathname);

  // Fetch locations for sede selector
  const { data: locations } = useQuery({
    queryKey: ["locations"],
    queryFn: () =>
      api
        .get<{ results: Location[] }>("/practices/dra-estefi/locations/")
        .then((r) => r.data.results),
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

  // Cmd+K / Ctrl+K shortcut
  const openSearch = useCallback(() => setSearchOpen(true), []);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        openSearch();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openSearch]);

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
    ...(locations ?? []).map((l) => ({ id: l.id, name: l.city || l.name })),
    { id: -1, name: "Online" },
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
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F4A89A] to-[#C7B8E8] flex items-center justify-center text-white font-semibold text-sm">
                  {initials}
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-sage border-2 border-surface" />
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

        {/* External links + Logout */}
        <div className="px-3 pb-4 shrink-0 space-y-0.5">
          <a
            href="/gestion-9f3a/"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13px] font-medium text-ink2 hover:text-ink hover:bg-bg transition-colors"
          >
            <ExternalLink size={15} className="shrink-0 text-ink3" />
            Admin Django
          </a>
          <a
            href="/"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13px] font-medium text-ink2 hover:text-ink hover:bg-bg transition-colors"
          >
            <Globe size={15} className="shrink-0 text-ink3" />
            Ver sitio público
          </a>
          <button
            onClick={() => setLogoutOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13px] font-medium text-ink2 hover:text-ink hover:bg-bg transition-colors"
          >
            <LogOut size={15} className="shrink-0 text-ink3" />
            Cerrar sesión
          </button>
        </div>

      </aside>

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
        <header className="sticky top-0 z-30 bg-bg/85 backdrop-blur border-b border-line shrink-0">
          <div className="px-8 py-4 flex items-center gap-4">
            <button
              className="lg:hidden p-2 rounded-[8px] text-ink2 hover:bg-bg transition-colors -ml-2"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={sidebarOpen ? "Cerrar menú" : "Abrir menú"}
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <div className="min-w-0 flex-1">
              <div className="text-[11.5px] text-ink3 font-medium flex items-center gap-1.5">
                <span>Inicio</span>
                <ChevronRight size={11} />
                <span className="text-ink2 font-semibold">{pageTitle}</span>
              </div>
              <h1 className="mt-0.5 text-[20px] font-bold text-ink tracking-tight">{pageTitle}</h1>
            </div>

            {/* Global search */}
            <button
              onClick={() => setSearchOpen(true)}
              className="relative w-[300px] hidden md:flex items-center gap-2 pl-9 pr-3 py-2 rounded-[10px] bg-surface border border-line hover:bg-bg transition-colors text-left"
            >
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink3" />
              <span className="flex-1 text-[12.5px] text-ink3">Buscar en Pediacore...</span>
            </button>

            <div className="flex items-center gap-2">
              <NotificationBell notificationsPath="/dashboard/notificaciones" />
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#F4A89A] to-[#C7B8E8] flex items-center justify-center shrink-0 cursor-default">
                  <span className="text-[12px] font-bold text-white">{initials}</span>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 px-8 py-7 max-w-[1400px] overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* ── Command palette ── */}
      {searchOpen && <CommandPalette onClose={() => setSearchOpen(false)} />}
    </div>
  );
}
