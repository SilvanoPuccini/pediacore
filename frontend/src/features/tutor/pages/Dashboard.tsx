import { useQuery } from "@tanstack/react-query";
import {
  Sun,
  Plus,
  Syringe,
  FileText,
  Receipt,
  CreditCard,
  ChevronRight,
  Bell,
  Scale,
  Ruler,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import { useNotifications } from "@/features/tutor/hooks/useNotifications";
import HeroAppointmentCard from "@/features/tutor/components/HeroAppointmentCard";
import {
  Avatar,
  Card,
  Btn,
  clp,
  childPalette,
} from "@/features/tutor/components/portal-ui";
import type { Appointment, Patient, PaginatedResponse, PaymentListItem } from "@/types/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WEEKDAYS = [
  "domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado",
];
const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function todayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatFullDate(date: Date): string {
  const weekday = WEEKDAYS[date.getDay()];
  const day = date.getDate();
  const month = MONTHS_ES[date.getMonth()];
  const year = date.getFullYear();
  // Capitalize first letter
  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${day} de ${month} de ${year}`;
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "hace un momento";
  if (diffMins < 60) return `hace ${diffMins} min`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  return `hace ${diffDays} día${diffDays !== 1 ? "s" : ""}`;
}

function formatAge(age: { years: number; months: number }): string {
  if (age.years === 0) return `${age.months} m`;
  if (age.months === 0) return `${age.years} a`;
  return `${age.years} a ${age.months} m`;
}

// ─── GrowthMini — simple inline SVG sparkline ─────────────────────────────────

interface GrowthMiniProps {
  color: string;
  // Points normalised 0–1 on both axes
  points?: [number, number][];
}

function GrowthMini({ color, points }: GrowthMiniProps) {
  const W = 120;
  const H = 36;

  // Default placeholder curve if no real data
  const defaultPoints: [number, number][] = [
    [0, 0.7], [0.2, 0.6], [0.4, 0.45], [0.6, 0.38], [0.8, 0.28], [1, 0.2],
  ];
  const pts = points ?? defaultPoints;

  const svgPoints = pts
    .map(([x, y]) => `${x * W},${H - y * H}`)
    .join(" ");

  // Build filled area path
  const linePath = pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x * W} ${H - y * H}`)
    .join(" ");
  const areaPath =
    linePath +
    ` L ${pts[pts.length - 1][0] * W} ${H} L ${pts[0][0] * W} ${H} Z`;

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      fill="none"
      className="overflow-visible"
    >
      {/* Area fill */}
      <path d={areaPath} fill={color} fillOpacity={0.12} />
      {/* Line */}
      <polyline
        points={svgPoints}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last dot */}
      <circle
        cx={pts[pts.length - 1][0] * W}
        cy={H - pts[pts.length - 1][1] * H}
        r={3}
        fill={color}
      />
    </svg>
  );
}

// ─── ChildMiniCard ─────────────────────────────────────────────────────────────

interface ChildMiniCardProps {
  patient: Patient;
  index: number;
}

function ChildMiniCard({ patient, index }: ChildMiniCardProps) {
  const pal = childPalette(index);
  return (
    <Link
      to={`/portal/hijos/${patient.id}`}
      className="flex items-center gap-3 py-2.5 rounded-[12px] hover:bg-bg transition-colors px-1 -mx-1 group"
    >
      <Avatar name={patient.first_name} childIndex={index} size={36} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-ink truncate">
          {patient.full_name}
        </p>
        <p className="text-[11.5px] text-ink3">
          {formatAge(patient.age)} ·{" "}
          {patient.sex_at_birth === "M"
            ? "niño"
            : patient.sex_at_birth === "F"
              ? "niña"
              : "—"}
        </p>
      </div>
      <ChevronRight
        size={14}
        style={{ color: pal.fg }}
        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
      />
    </Link>
  );
}

// ─── QuickAction ──────────────────────────────────────────────────────────────

interface QuickActionProps {
  label: string;
  to: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}

function QuickAction({ label, to, icon, iconBg, iconColor }: QuickActionProps) {
  return (
    <Link
      to={to}
      className="rounded-[14px] p-4 border border-line shadow-card bg-surface hover:shadow-soft transition-shadow flex flex-col gap-2.5"
    >
      <div
        className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
        style={{ backgroundColor: iconBg, color: iconColor }}
      >
        {icon}
      </div>
      <span className="text-[12.5px] font-semibold text-ink leading-tight">
        {label}
      </span>
    </Link>
  );
}

// ─── GrowthSnapshotCard ────────────────────────────────────────────────────────

interface GrowthSnapshotCardProps {
  patient: Patient;
  index: number;
}

function GrowthSnapshotCard({ patient, index }: GrowthSnapshotCardProps) {
  const pal = childPalette(index);

  return (
    <Card className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Avatar name={patient.first_name} childIndex={index} size={40} />
        <div className="flex-1 min-w-0">
          <p className="text-[13.5px] font-semibold text-ink truncate">
            {patient.full_name}
          </p>
          <p className="text-[11.5px] text-ink3">
            Curva de peso · {formatAge(patient.age)}
          </p>
        </div>
        <Link
          to={`/portal/hijos/${patient.id}`}
          className="text-[11.5px] font-semibold hover:underline underline-offset-2 transition-colors"
          style={{ color: pal.fg }}
        >
          Ver historia
        </Link>
      </div>

      {/* Sparkline */}
      <div className="flex justify-center">
        <GrowthMini color={pal.solid} />
      </div>

      {/* Stat boxes */}
      <div className="grid grid-cols-3 gap-2">
        {/* Peso */}
        <div
          className="rounded-[10px] p-2.5 text-center"
          style={{ backgroundColor: pal.soft }}
        >
          <Scale size={13} style={{ color: pal.fg }} className="mx-auto mb-1" />
          <p className="text-[11px] text-ink3 mb-0.5">Peso</p>
          <p className="text-[13px] font-bold" style={{ color: pal.fg }}>
            —
          </p>
        </div>

        {/* Talla */}
        <div
          className="rounded-[10px] p-2.5 text-center"
          style={{ backgroundColor: pal.soft }}
        >
          <Ruler size={13} style={{ color: pal.fg }} className="mx-auto mb-1" />
          <p className="text-[11px] text-ink3 mb-0.5">Talla</p>
          <p className="text-[13px] font-bold" style={{ color: pal.fg }}>
            —
          </p>
        </div>

        {/* Percentil */}
        <div
          className="rounded-[10px] p-2.5 text-center"
          style={{ backgroundColor: pal.soft }}
        >
          <TrendingUp
            size={13}
            style={{ color: pal.fg }}
            className="mx-auto mb-1"
          />
          <p className="text-[11px] text-ink3 mb-0.5">Percentil</p>
          <p className="text-[13px] font-bold" style={{ color: pal.fg }}>
            —
          </p>
        </div>
      </div>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const today = todayDateString();
  const todayDate = new Date();

  // Appointments
  const { data: appointmentsData, isLoading: loadingAppts } = useQuery({
    queryKey: ["appointments", "dashboard-upcoming"],
    queryFn: () =>
      api
        .get<PaginatedResponse<Appointment>>("/appointments/", {
          params: {
            status: "CONFIRMED,HOLD,PENDING",
            ordering: "scheduled_date,start_time",
            page_size: 10,
          },
        })
        .then((r) => r.data),
  });

  // Patients
  const { data: patientsData, isLoading: loadingPatients } = useQuery({
    queryKey: ["my-patients"],
    queryFn: () =>
      api.get<PaginatedResponse<Patient>>("/patients/").then((r) => r.data),
  });

  // Pending payments
  const { data: paymentsData } = useQuery({
    queryKey: ["my-payments", "pending"],
    queryFn: () =>
      api
        .get<PaginatedResponse<PaymentListItem>>("/payments/", {
          params: { status: "PENDING,TRANSFER_PENDING", page_size: 20 },
        })
        .then((r) => r.data),
  });

  // Notifications (last 3 unread for activity feed)
  const { data: notificationsData } = useNotifications(1);

  // Derived data
  const upcomingAppointments = (appointmentsData?.results ?? []).filter(
    (a) => a.scheduled_date >= today
  );
  const nextAppointment =
    [...upcomingAppointments].sort((a, b) => {
      const dc = a.scheduled_date.localeCompare(b.scheduled_date);
      return dc !== 0 ? dc : a.start_time.localeCompare(b.start_time);
    })[0] ?? null;

  const upcomingCount = upcomingAppointments.length;
  const patients = patientsData?.results ?? [];
  const pendingPayments = paymentsData?.results ?? [];
  const pendingCount = pendingPayments.length;
  const pendingTotal = pendingPayments.reduce(
    (sum, p) => sum + parseFloat(p.amount),
    0
  );
  const recentNotifications = (notificationsData?.results ?? []).slice(0, 3);

  // Subtitle
  function buildSubtitle(): string {
    const parts: string[] = [];
    if (upcomingCount === 1) parts.push("1 turno próximo");
    else if (upcomingCount > 1) parts.push(`${upcomingCount} turnos próximos`);
    if (pendingCount === 1) parts.push("1 pago pendiente");
    else if (pendingCount > 1) parts.push(`${pendingCount} pagos pendientes`);
    if (parts.length === 0) return "Todo al día. ¡Buen día!";
    return `Tenés ${parts.join(" y ")}.`;
  }

  return (
    <div className="space-y-8">
      {/* ── 1. Greeting header ─────────────────────────────────────────── */}
      <div>
        <p className="flex items-center gap-1.5 text-[12.5px] text-ink3 font-medium mb-1">
          <Sun size={13} style={{ color: "#F3A8A1" }} />
          {formatFullDate(todayDate)}
        </p>
        <h1 className="font-display text-[28px] lg:text-[32px] text-ink leading-tight mb-1">
          Hola,{" "}
          <em className="not-italic font-semibold" style={{ color: "#4A8590" }}>
            {user?.first_name ?? "bienvenida"}
          </em>
        </h1>
        <p className="text-[13.5px] text-ink2">
          {loadingAppts ? "Cargando..." : buildSubtitle()}
        </p>
      </div>

      {/* ── 2. Two-column grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-6">
        {/* LEFT */}
        <div className="flex flex-col gap-5">
          {/* Next appointment */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-semibold text-ink">
                Próximo turno
              </h2>
              <Link
                to="/portal/turnos"
                className="text-[12px] font-semibold text-teal-dark hover:underline underline-offset-2 transition-colors"
              >
                Ver todos
              </Link>
            </div>
            <HeroAppointmentCard
              appointment={nextAppointment}
              loading={loadingAppts}
            />
          </div>

          {/* Quick actions */}
          <div>
            <h2 className="text-[15px] font-semibold text-ink mb-3">
              Acciones rápidas
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <QuickAction
                label="Reservar turno"
                to="/booking"
                icon={<Plus size={18} />}
                iconBg="rgba(123,181,189,0.22)"
                iconColor="#4A8590"
              />
              <QuickAction
                label="Ver vacunas"
                to="/portal/vacunas"
                icon={<Syringe size={18} />}
                iconBg="rgba(229,184,71,0.22)"
                iconColor="#8A6A1F"
              />
              <QuickAction
                label="Resúmenes"
                to="/portal/documentos"
                icon={<FileText size={18} />}
                iconBg="rgba(168,201,168,0.28)"
                iconColor="#3F7059"
              />
              <QuickAction
                label="Boletas"
                to="/portal/pagos"
                icon={<Receipt size={18} />}
                iconBg="rgba(243,168,161,0.22)"
                iconColor="#B5604F"
              />
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex flex-col gap-4">
          <Card padding={false} className="flex flex-col divide-y divide-line">
            {/* Mis hijos */}
            <div className="p-5">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-[15px] font-semibold text-ink">
                  Mis hijos
                </h2>
                <Link
                  to="/portal/hijos"
                  className="text-[12px] font-semibold text-teal-dark hover:underline underline-offset-2 transition-colors"
                >
                  Ver todos
                </Link>
              </div>

              {loadingPatients ? (
                <div className="space-y-2 animate-pulse">
                  {[0, 1].map((i) => (
                    <div key={i} className="flex items-center gap-3 py-2">
                      <div className="h-9 w-9 rounded-full bg-cream shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-2/3 bg-cream rounded-full" />
                        <div className="h-2.5 w-1/3 bg-cream rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : patients.length === 0 ? (
                <p className="text-[12.5px] text-ink3 py-3">
                  Aún no hay pacientes registrados.{" "}
                  <Link
                    to="/booking"
                    className="text-teal-dark font-semibold hover:underline"
                  >
                    Reservar turno
                  </Link>
                </p>
              ) : (
                <div className="flex flex-col">
                  {patients.slice(0, 4).map((patient, idx) => (
                    <ChildMiniCard
                      key={patient.id}
                      patient={patient}
                      index={idx}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Pending payments — only if there are any */}
            {pendingCount > 0 && (
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-[10px] bg-[rgba(243,168,161,0.22)] flex items-center justify-center shrink-0">
                    <CreditCard size={18} style={{ color: "#B5604F" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11.5px] text-ink3 font-medium mb-0.5">
                      Pagos pendientes
                    </p>
                    <p
                      className="font-display text-[26px] leading-none"
                      style={{ color: "#B5604F" }}
                    >
                      {clp(pendingTotal)}
                    </p>
                    <p className="text-[11.5px] text-ink3 mt-0.5">
                      {pendingCount} pago{pendingCount !== 1 ? "s" : ""} por
                      confirmar
                    </p>
                  </div>
                  <Link to="/portal/pagos">
                    <Btn variant="ghost" size="sm" iconRight="ChevronRight">
                      Ver detalle
                    </Btn>
                  </Link>
                </div>
              </div>
            )}

            {/* Actividad reciente */}
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[14px] font-semibold text-ink">
                  Actividad reciente
                </h2>
                <Link
                  to="/portal/notificaciones"
                  className="text-[12px] font-semibold text-teal-dark hover:underline underline-offset-2 transition-colors"
                >
                  Ver todas
                </Link>
              </div>

              {recentNotifications.length === 0 ? (
                <p className="text-[12.5px] text-ink3">
                  Sin actividad reciente.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {recentNotifications.map((n) => (
                    <div key={n.id} className="flex items-start gap-3">
                      <div
                        className={cn(
                          "h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                          n.is_read
                            ? "bg-cream"
                            : "bg-[rgba(123,181,189,0.22)]"
                        )}
                      >
                        <Bell
                          size={12}
                          className={cn(
                            n.is_read ? "text-ink3" : "text-teal-dark"
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] font-semibold text-ink truncate">
                          {n.title}
                        </p>
                        <p className="text-[11.5px] text-ink3 mt-0.5 line-clamp-1">
                          {n.message}
                        </p>
                      </div>
                      <span className="text-[11px] text-ink3 shrink-0 mt-0.5 whitespace-nowrap">
                        {formatRelativeTime(n.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ── 3. Growth snapshots ────────────────────────────────────────── */}
      {patients.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold text-ink">
              Crecimiento
            </h2>
            <Link
              to="/portal/hijos"
              className="text-[12px] font-semibold text-teal-dark hover:underline underline-offset-2 transition-colors"
            >
              Ver historias
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {patients.map((patient, idx) => (
              <GrowthSnapshotCard
                key={patient.id}
                patient={patient}
                index={idx}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
