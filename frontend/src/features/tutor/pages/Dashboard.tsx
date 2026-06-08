import { useQuery } from "@tanstack/react-query";
import { Bell, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { useNotifications } from "@/features/tutor/hooks/useNotifications";
import HeroAppointmentCard from "@/features/tutor/components/HeroAppointmentCard";
import ChildStatCard from "@/features/tutor/components/ChildStatCard";
import type { Appointment, Patient, PaginatedResponse } from "@/types/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  title,
  linkTo,
  linkLabel,
}: {
  title: string;
  linkTo?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
      {linkTo && linkLabel && (
        <Link
          to={linkTo}
          className="text-[12px] font-semibold text-teal-dark hover:underline underline-offset-2 transition-colors"
        >
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] p-5 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-full bg-cream shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-1/2 bg-cream rounded-full" />
          <div className="h-3 w-1/3 bg-cream rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const today = todayDateString();

  // Appointments
  const { data: appointmentsData, isLoading: loadingAppts } = useQuery({
    queryKey: ["appointments", "dashboard-upcoming"],
    queryFn: () =>
      api
        .get<PaginatedResponse<Appointment>>("/appointments/", {
          params: { status: "CONFIRMED,HOLD,PENDING", ordering: "scheduled_date,start_time", page_size: 10 },
        })
        .then((r) => r.data),
  });

  // Patients
  const { data: patientsData, isLoading: loadingPatients } = useQuery({
    queryKey: ["my-patients"],
    queryFn: () =>
      api.get<PaginatedResponse<Patient>>("/patients/").then((r) => r.data),
  });

  // Notifications (last 5 unread)
  const { data: notificationsData } = useNotifications(1);

  // Next upcoming appointment
  const nextAppointment = (appointmentsData?.results ?? [])
    .filter((a) => a.scheduled_date >= today)
    .sort((a, b) => {
      const dc = a.scheduled_date.localeCompare(b.scheduled_date);
      return dc !== 0 ? dc : a.start_time.localeCompare(b.start_time);
    })[0] ?? null;

  // Upcoming count (for greeting subtitle)
  const upcomingCount = (appointmentsData?.results ?? []).filter(
    (a) => a.scheduled_date >= today
  ).length;

  const patients = patientsData?.results ?? [];

  // Recent unread notifications (up to 5)
  const recentNotifications = (notificationsData?.results ?? [])
    .filter((n) => !n.is_read)
    .slice(0, 5);

  return (
    <div className="max-w-2xl space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="font-display text-[28px] font-semibold text-ink mb-1">
          Hola, {user?.first_name ?? "bienvenida"}
        </h1>
        <p className="text-[14px] text-ink3">
          {loadingAppts
            ? "Cargando tus próximos turnos..."
            : upcomingCount === 0
              ? "No tenés turnos próximos."
              : upcomingCount === 1
                ? "Tenés 1 turno próximo."
                : `Tenés ${upcomingCount} turnos próximos.`}
        </p>
      </div>

      {/* Hero appointment */}
      <section>
        <SectionHeader title="Próximo turno" linkTo="/portal/turnos" linkLabel="Ver todos" />
        <HeroAppointmentCard appointment={nextAppointment} loading={loadingAppts} />
      </section>

      {/* Children */}
      <section>
        <SectionHeader
          title="Mis hijos"
          linkTo="/portal/hijos"
          linkLabel="Administrar"
        />
        {loadingPatients ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : patients.length === 0 ? (
          <div className="bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] p-6 text-center">
            <p className="text-[13px] text-ink3">
              Al reservar un turno se crea el perfil del paciente automáticamente.
            </p>
            <Link
              to="/booking"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-[10px] bg-teal-dark text-white text-[12px] font-semibold hover:opacity-90 transition-opacity"
            >
              <CalendarDays size={13} />
              Reservar primer turno
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {patients.map((patient, idx) => (
              <ChildStatCard key={patient.id} patient={patient} index={idx} />
            ))}
          </div>
        )}
      </section>

      {/* Recent notifications */}
      <section>
        <SectionHeader
          title="Notificaciones recientes"
          linkTo="/portal/notificaciones"
          linkLabel="Ver todas"
        />
        {recentNotifications.length === 0 ? (
          <div className="bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] p-5 text-center">
            <p className="text-[13px] text-ink3">No tenés notificaciones sin leer.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recentNotifications.map((notification) => (
              <div
                key={notification.id}
                className="bg-surface rounded-[16px] border border-line shadow-[var(--shadow-soft)] px-4 py-3 flex items-start gap-3"
              >
                <div className="h-7 w-7 rounded-full bg-teal/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bell size={12} className="text-teal-dark" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-ink truncate">{notification.title}</p>
                  <p className="text-[12px] text-ink3 mt-0.5 line-clamp-1">{notification.message}</p>
                </div>
                <span className="text-[11px] text-ink3 shrink-0 mt-0.5">
                  {formatRelativeTime(notification.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
