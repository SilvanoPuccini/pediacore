import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Clock, MapPin, Stethoscope, User, Wifi, Baby, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import type { Appointment, Patient, PaginatedResponse } from "@/types/api";

// ─── Date helpers ─────────────────────────────────────────────────────────────

function formatTime(timeStr: string): string {
  return timeStr.slice(0, 5);
}

function todayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ─── Compact appointment card ─────────────────────────────────────────────────

function UpcomingCard({ appointment }: { appointment: Appointment }) {
  return (
    <Link
      to={`/portal/turnos/${appointment.id}`}
      className={cn(
        "bg-surface rounded-[16px] border border-line shadow-[var(--shadow-soft)]",
        "p-4 flex items-start gap-4 hover:border-teal/40 transition-colors group"
      )}
    >
      {/* Date block */}
      <div className="shrink-0 flex flex-col items-center justify-center bg-cream rounded-[12px] h-14 w-14 text-center">
        <span className="text-[18px] font-bold text-ink leading-none">
          {new Date(
            ...appointment.scheduled_date.split("-").map(Number) as [number, number, number]
          ).getDate()}
        </span>
        <span className="text-[10px] font-semibold text-ink3 uppercase tracking-wide mt-0.5">
          {new Intl.DateTimeFormat("es-CL", { month: "short", timeZone: "America/Santiago" }).format(
            new Date(
              ...appointment.scheduled_date.split("-").map(Number) as [number, number, number]
            )
          )}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <Clock size={11} className="text-ink3 shrink-0" />
          <span className="text-[12px] text-ink3">
            {formatTime(appointment.start_time)}
            {appointment.end_time ? ` — ${formatTime(appointment.end_time)}` : ""}
          </span>
        </div>
        <p className="text-[13px] font-semibold text-ink truncate flex items-center gap-1.5">
          <Stethoscope size={12} className="text-teal-dark shrink-0" />
          {appointment.service_name}
        </p>
        <div className="flex items-center gap-3 mt-1">
          <span className="flex items-center gap-1 text-[12px] text-ink3">
            <User size={11} className="shrink-0" />
            {appointment.patient_name}
          </span>
          <span className="flex items-center gap-1 text-[12px] text-ink3">
            {appointment.is_online ? (
              <>
                <Wifi size={11} className="text-teal-dark shrink-0" />
                <span className="text-teal-dark font-medium">Online</span>
              </>
            ) : (
              <>
                <MapPin size={11} className="shrink-0" />
                {appointment.location_name}
              </>
            )}
          </span>
        </div>
      </div>

      <ArrowRight size={15} className="text-ink3 shrink-0 mt-0.5 group-hover:text-teal-dark transition-colors" />
    </Link>
  );
}

// ─── Loading spinner ──────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex justify-center py-8">
      <div className="h-6 w-6 rounded-full border-2 border-line border-t-teal animate-spin" />
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function SectionHeader({
  title,
  linkTo,
  linkLabel,
}: {
  title: string;
  linkTo: string;
  linkLabel: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
      <Link
        to={linkTo}
        className="text-[12px] font-semibold text-teal-dark hover:underline underline-offset-2 transition-colors"
      >
        {linkLabel}
      </Link>
    </div>
  );
}

// ─── Quick action button ──────────────────────────────────────────────────────

function QuickAction({
  to,
  icon: Icon,
  label,
  variant = "primary",
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-[13px] font-semibold transition-colors",
        variant === "primary"
          ? "bg-teal-dark text-white hover:opacity-90"
          : "bg-surface border border-line text-ink hover:bg-cream shadow-[var(--shadow-soft)]"
      )}
    >
      <Icon size={15} />
      {label}
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const today = todayDateString();

  const { data: appointmentsData, isLoading: loadingAppts } = useQuery({
    queryKey: ["appointments", "confirmed-upcoming"],
    queryFn: () =>
      api
        .get<PaginatedResponse<Appointment>>("/appointments/", {
          params: { status: "CONFIRMED" },
        })
        .then((r) => r.data),
  });

  const { data: patientsData, isLoading: loadingPatients } = useQuery({
    queryKey: ["my-patients"],
    queryFn: () =>
      api.get<PaginatedResponse<Patient>>("/patients/").then((r) => r.data),
  });

  const upcomingThree = (appointmentsData?.results ?? [])
    .filter((a) => a.scheduled_date >= today)
    .sort((a, b) => {
      const dc = a.scheduled_date.localeCompare(b.scheduled_date);
      return dc !== 0 ? dc : a.start_time.localeCompare(b.start_time);
    })
    .slice(0, 3);

  const patientCount = patientsData?.count ?? 0;

  return (
    <div className="max-w-2xl space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="font-display text-[28px] font-semibold text-ink mb-1">
          Hola, {user?.first_name ?? "bienvenida"}
        </h1>
        <p className="text-[14px] text-ink3">
          Desde acá podés gestionar los turnos y los perfiles de tus hijos.
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <QuickAction to="/booking" icon={CalendarDays} label="Reservar turno" variant="primary" />
        <QuickAction to="/portal/turnos" icon={CalendarDays} label="Ver todos los turnos" variant="secondary" />
      </div>

      {/* Upcoming appointments */}
      <section>
        <SectionHeader
          title="Próximos turnos"
          linkTo="/portal/turnos"
          linkLabel="Ver todos"
        />

        {loadingAppts ? (
          <Spinner />
        ) : upcomingThree.length === 0 ? (
          <div className="bg-surface border border-line rounded-[16px] p-6 text-center shadow-[var(--shadow-soft)]">
            <p className="text-[13px] text-ink3">No tenés turnos próximos</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {upcomingThree.map((appointment) => (
              <UpcomingCard key={appointment.id} appointment={appointment} />
            ))}
          </div>
        )}
      </section>

      {/* My children summary */}
      <section>
        <SectionHeader
          title="Mis hijos"
          linkTo="/portal/hijos"
          linkLabel="Administrar"
        />

        <div className="bg-surface rounded-[16px] border border-line shadow-[var(--shadow-soft)] p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-cream flex items-center justify-center shrink-0">
            <Baby size={22} className="text-teal-dark" />
          </div>
          {loadingPatients ? (
            <div className="h-4 w-32 bg-cream rounded-full animate-pulse" />
          ) : (
            <div>
              <p className="text-[15px] font-semibold text-ink">
                {patientCount === 0
                  ? "Sin perfiles registrados"
                  : patientCount === 1
                    ? "1 hijo vinculado"
                    : `${patientCount} hijos vinculados`}
              </p>
              <p className="text-[12px] text-ink3 mt-0.5">
                {patientCount === 0
                  ? "Al reservar un turno se crea el perfil automáticamente."
                  : "Podés ver y completar sus perfiles en la sección Mis hijos."}
              </p>
            </div>
          )}
          <Link
            to="/portal/hijos"
            className="ml-auto shrink-0 text-ink3 hover:text-teal-dark transition-colors"
            aria-label="Ir a Mis hijos"
          >
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
