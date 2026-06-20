import { useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Clock,
  Stethoscope,
  Check,
  Sun,
  Plus,
  FileText,
  AlertCircle,
  CreditCard,
  ChevronRight,
  MapPin,
  Loader2,
} from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { useSedeStore } from "../stores/useSedeStore";
import type { Appointment, PaginatedResponse } from "@/types/api";

// ─── Types ───────────────────────────────────────────────────────────────────

type FlowState = "confirmado" | "espera" | "consulta" | "atendido";

// Backend status → frontend flow state
const STATUS_TO_FLOW: Record<string, FlowState> = {
  CONFIRMED: "confirmado",
  CHECKED_IN: "espera",
  IN_PROGRESS: "consulta",
  COMPLETED: "atendido",
};

// Frontend flow state → backend status (for PATCH)
const FLOW_TO_STATUS: Record<FlowState, string> = {
  confirmado: "CONFIRMED",
  espera: "CHECKED_IN",
  consulta: "IN_PROGRESS",
  atendido: "COMPLETED",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function greetingText(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

function todayFormatted(): string {
  return new Date().toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function todayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatAge(age: { years: number; months: number }): string {
  if (age.years === 0) return `${age.months} meses`;
  if (age.months === 0) return `${age.years} año${age.years !== 1 ? "s" : ""}`;
  return `${age.years} a ${age.months} m`;
}

function patientInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

type AvatarColors = { fg: string; bg: string };

function avatarColor(name: string): AvatarColors {
  const palettes: AvatarColors[] = [
    { fg: "#F4A89A", bg: "#FFE2D9" },
    { fg: "#7DD3C0", bg: "#D6F1EA" },
    { fg: "#C7B8E8", bg: "#EDE4FF" },
    { fg: "#A8D5B5", bg: "#DAEFE0" },
    { fg: "#F5D4A0", bg: "#FCEACB" },
  ];
  return palettes[name.charCodeAt(0) % palettes.length];
}

function flowStateFromAppointment(appt: Appointment): FlowState {
  return STATUS_TO_FLOW[appt.status] ?? "confirmado";
}

// ─── Static metadata ──────────────────────────────────────────────────────────

const FLOW_ORDER: FlowState[] = ["confirmado", "espera", "consulta", "atendido"];

const STATE_META: Record<FlowState, {
  label: string;
  short: string;
  color: string;
  bg: string;
  dot: string;
  Icon: React.ElementType;
}> = {
  confirmado: { label: "Confirmado",  short: "Confirmados", color: "#6B569E", bg: "rgba(199, 184, 232, 0.30)", dot: "#C7B8E8", Icon: Calendar    },
  espera:     { label: "En sala",     short: "En sala",     color: "#9C7423", bg: "rgba(245, 212, 160, 0.45)", dot: "#F5D4A0", Icon: Clock        },
  consulta:   { label: "En consulta", short: "En consulta", color: "#3E8E7C", bg: "rgba(125, 211, 192, 0.28)", dot: "#7DD3C0", Icon: Stethoscope  },
  atendido:   { label: "Atendido",    short: "Atendidos",   color: "#3F8358", bg: "rgba(168, 213, 181, 0.35)", dot: "#A8D5B5", Icon: Check        },
};

const NEXT_ACTION: Partial<Record<FlowState, { label: string; Icon: React.ElementType }>> = {
  confirmado: { label: "Marcar llegada",   Icon: Check       },
  espera:     { label: "Iniciar consulta", Icon: Stethoscope },
  consulta:   { label: "Finalizar",        Icon: Check       },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypeChip({ type }: { type: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    "Control sano":           { bg: "rgba(125, 211, 192, 0.20)", text: "#3E8E7C" },
    "Consulta pediátrica":    { bg: "rgba(199, 184, 232, 0.30)", text: "#6B569E" },
    "Consulta online":        { bg: "rgba(244, 168, 154, 0.25)", text: "#B5604F" },
  };
  const s = map[type] ?? { bg: "rgba(199, 184, 232, 0.30)", text: "#6B569E" };
  return (
    <span
      className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold"
      style={{ background: s.bg, color: s.text }}
    >
      {type}
    </span>
  );
}

function StateBadge({ state }: { state: FlowState }) {
  const m = STATE_META[state];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{ background: m.bg, color: m.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.dot }} />
      {m.label}
    </span>
  );
}

function StageCard({
  stateKey,
  count,
  active,
  onClick,
}: {
  stateKey: FlowState;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  const m = STATE_META[stateKey];
  const IconComp = m.Icon;
  return (
    <button
      onClick={onClick}
      className={[
        "text-left bg-surface border rounded-[14px] p-4 shadow-[var(--shadow-card)] transition focus-ring",
        active
          ? "border-teal-dark ring-2 ring-teal/25"
          : "border-line hover:shadow-[var(--shadow-soft)]",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <div
          className="w-8 h-8 rounded-[9px] flex items-center justify-center"
          style={{ background: m.bg, color: m.color }}
        >
          <IconComp size={15} />
        </div>
        <span className="text-[28px] font-bold text-ink leading-none tracking-tight">
          {count}
        </span>
      </div>
      <div className="mt-2.5 text-[12.5px] font-semibold text-ink2">{m.short}</div>
    </button>
  );
}

function FocusCard({
  appt,
  advancing,
  onAdvance,
  onOpenFicha,
}: {
  appt: Appointment | null;
  advancing: boolean;
  onAdvance: (id: number) => void;
  onOpenFicha: (patientId: number) => void;
}) {
  if (!appt) {
    return (
      <div className="bg-surface border border-line rounded-[16px] shadow-[var(--shadow-card)] p-6 flex items-center gap-4">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center"
          style={{ background: "rgba(168, 213, 181, 0.30)", color: "#3F8358" }}
        >
          <Check size={20} />
        </div>
        <div>
          <h3 className="text-[15px] font-bold text-ink">Día al día</h3>
          <p className="text-[12.5px] text-ink2 mt-0.5">
            No hay pacientes en sala ni en consulta ahora mismo.
          </p>
        </div>
      </div>
    );
  }

  const state = flowStateFromAppointment(appt);
  const m = STATE_META[state];
  const av = avatarColor(appt.patient_name);
  const inConsult = state === "consulta";
  const act = NEXT_ACTION[state];
  const time = appt.start_time.slice(0, 5);

  return (
    <div
      className="rounded-[16px] shadow-[var(--shadow-card)] p-5 border"
      style={{
        borderColor: inConsult ? "rgba(125,211,192,0.5)" : "#E8E6E1",
        background: inConsult
          ? "linear-gradient(135deg, rgba(125,211,192,0.12), rgba(199,184,232,0.06))"
          : "#fff",
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-[11px] uppercase tracking-[0.14em] font-bold"
          style={{ color: m.color }}
        >
          {inConsult
            ? "● Ahora en consulta"
            : state === "espera"
            ? "Siguiente · en sala"
            : "Siguiente paciente"}
        </span>
        <span className="text-[12px] font-bold text-teal-dark">{time}</span>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={() => onOpenFicha(appt.patient)}
          className="w-12 h-12 rounded-full flex items-center justify-center text-[16px] font-bold shrink-0 focus-ring"
          style={{ background: av.bg, color: av.fg }}
        >
          {patientInitial(appt.patient_name)}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onOpenFicha(appt.patient)}
              className="text-[16px] font-bold text-ink hover:text-teal-dark transition text-left focus-ring"
            >
              {appt.patient_name}
            </button>
            <span className="text-[12px] text-ink3">· {formatAge(appt.patient_age)}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 flex-wrap text-[12px] text-ink2">
            <TypeChip type={appt.service_name} />
            <span className="inline-flex items-center gap-1">
              <MapPin size={11} className="text-ink3" />
              {appt.location_name}
            </span>
          </div>
        </div>
      </div>

      {appt.notes && (
        <div className="mt-3 px-3 py-2 rounded-[10px] text-[12.5px] text-ink2" style={{ background: "rgba(250, 250, 247, 0.70)" }}>
          <span className="font-semibold text-ink">Motivo:</span> {appt.notes}
          {!appt.payment_id && state !== "atendido" && (
            <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#9C7423]">
              <AlertCircle size={11} /> Pago pendiente
            </span>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        {act && (
          <button
            onClick={() => onAdvance(appt.id)}
            disabled={advancing}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[10px] text-white text-[13px] font-semibold hover:opacity-90 transition shadow-[var(--shadow-soft)] focus-ring disabled:opacity-60"
            style={{ background: "#5CB8A4" }}
          >
            {advancing ? <Loader2 size={15} className="animate-spin" /> : <act.Icon size={15} />}
            {act.label}
          </button>
        )}
        <button
          onClick={() => onOpenFicha(appt.patient)}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[10px] bg-surface border border-line text-[13px] font-semibold text-ink2 hover:bg-bg transition focus-ring"
        >
          <FileText size={15} />
          Ficha
        </button>
      </div>
    </div>
  );
}

function AgendaRow({
  appt,
  advancing,
  onAdvance,
  onOpenFicha,
}: {
  appt: Appointment;
  advancing: boolean;
  onAdvance: (id: number) => void;
  onOpenFicha: (patientId: number) => void;
}) {
  const state = flowStateFromAppointment(appt);
  const av = avatarColor(appt.patient_name);
  const act = NEXT_ACTION[state];
  const done = state === "atendido";
  const time = appt.start_time.slice(0, 5);

  return (
    <div
      className={[
        "group flex items-center gap-4 px-4 py-3 rounded-[12px] transition",
        done ? "opacity-70" : "hover:bg-bg",
      ].join(" ")}
    >
      <div className="w-12 shrink-0 text-teal-dark font-bold text-[14px] leading-tight">
        {time}
      </div>
      <div className="w-px self-stretch bg-line shrink-0" />
      <button
        onClick={() => onOpenFicha(appt.patient)}
        className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 focus-ring"
        style={{ background: av.bg, color: av.fg }}
      >
        {patientInitial(appt.patient_name)}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onOpenFicha(appt.patient)}
            className="text-[13.5px] font-semibold text-ink hover:text-teal-dark transition text-left focus-ring"
          >
            {appt.patient_name}
          </button>
          <span className="text-[11px] text-ink3">· {formatAge(appt.patient_age)}</span>
          <TypeChip type={appt.service_name} />
        </div>
        {appt.notes && (
          <div className="mt-0.5 text-[11.5px] text-ink2 truncate">{appt.notes}</div>
        )}
      </div>
      <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0">
        <StateBadge state={state} />
        {!appt.payment_id && !done && (
          <span className="text-[10.5px] font-semibold text-[#9C7423] inline-flex items-center gap-1">
            <CreditCard size={10} /> Por cobrar
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0 w-[150px] justify-end">
        {act ? (
          <button
            onClick={() => onAdvance(appt.id)}
            disabled={advancing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[9px] text-white text-[11.5px] font-semibold hover:opacity-90 transition focus-ring whitespace-nowrap disabled:opacity-60"
            style={{ background: "#5CB8A4" }}
          >
            {advancing ? <Loader2 size={13} className="animate-spin" /> : <act.Icon size={13} />}
            {act.label}
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-2 text-[11.5px] font-semibold text-[#3F8358]">
            <Check size={14} /> Listo
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-[12px] text-white text-[12.5px] font-semibold shadow-[var(--shadow-pop)] flex items-center gap-2" style={{ background: "#2C2C2C" }}>
      <Check size={14} style={{ color: "#7DD3C0" }} />
      {message}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const sedeName = useSedeStore((s) => s.sedeName);

  const [filter, setFilter] = useState<FlowState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [advancingId, setAdvancingId] = useState<number | null>(null);

  const firstName = user?.first_name ?? "Estefi";
  const today = todayDateString();

  // Flash toast
  const flash = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  // ─── Data fetching ─────────────────────────────────────────────────────────

  const { data: appointmentsData, isLoading } = useQuery({
    queryKey: ["appointments", "doctor-dashboard", today],
    queryFn: () =>
      api
        .get<PaginatedResponse<Appointment>>("/appointments/", {
          params: {
            date: today,
            status: "CONFIRMED,CHECKED_IN,IN_PROGRESS,COMPLETED",
            page_size: 50,
          },
        })
        .then((r) => r.data),
    refetchInterval: 30_000,
  });

  const allAppointments = appointmentsData?.results ?? [];

  // ─── Advance mutation ──────────────────────────────────────────────────────

  const advanceMutation = useMutation({
    mutationFn: async ({ appointmentId, nextStatus }: { appointmentId: number; nextStatus: string }) => {
      const res = await api.patch<Appointment>(`/appointments/${appointmentId}/`, {
        status: nextStatus,
      });
      return res.data;
    },
    onMutate: ({ appointmentId }) => {
      setAdvancingId(appointmentId);
    },
    onSuccess: (data) => {
      const stateLabel: Partial<Record<string, string>> = {
        CHECKED_IN: "en sala de espera",
        IN_PROGRESS: "en consulta",
        COMPLETED: "atendido",
      };
      flash(`${data.patient_name} → ${stateLabel[data.status] ?? data.status_display}`);
      queryClient.invalidateQueries({ queryKey: ["appointments", "doctor-dashboard"] });
    },
    onError: () => {
      flash("Error al cambiar estado");
    },
    onSettled: () => {
      setAdvancingId(null);
    },
  });

  // ─── Sede filter ───────────────────────────────────────────────────────────

  const sedeAppointments = useMemo(() => {
    if (sedeName === "Todas") return allAppointments;
    return allAppointments.filter(
      (a) => a.location_name === sedeName || a.is_online
    );
  }, [allAppointments, sedeName]);

  const counts = useMemo(() => {
    const c: Record<FlowState, number> = { confirmado: 0, espera: 0, consulta: 0, atendido: 0 };
    sedeAppointments.forEach((a) => {
      const s = flowStateFromAppointment(a);
      c[s]++;
    });
    return c;
  }, [sedeAppointments]);

  // Focus: patient in consulta → espera → first confirmado → null
  const focus = useMemo(
    () =>
      sedeAppointments.find((a) => a.status === "IN_PROGRESS") ??
      sedeAppointments.find((a) => a.status === "CHECKED_IN") ??
      sedeAppointments.find((a) => a.status === "CONFIRMED") ??
      null,
    [sedeAppointments]
  );

  const shown = useMemo(() => {
    if (!filter) return sedeAppointments;
    const targetStatus = FLOW_TO_STATUS[filter];
    return sedeAppointments.filter((a) => a.status === targetStatus);
  }, [filter, sedeAppointments]);

  // ─── Actions ───────────────────────────────────────────────────────────────

  const advance = useCallback(
    (appointmentId: number) => {
      const appt = allAppointments.find((a) => a.id === appointmentId);
      if (!appt) return;
      const currentFlow = flowStateFromAppointment(appt);
      const idx = FLOW_ORDER.indexOf(currentFlow);
      const nextFlow = FLOW_ORDER[Math.min(idx + 1, FLOW_ORDER.length - 1)];
      if (nextFlow === currentFlow) return;
      const nextStatus = FLOW_TO_STATUS[nextFlow];
      advanceMutation.mutate({ appointmentId, nextStatus });
    },
    [allAppointments, advanceMutation]
  );

  const openFicha = useCallback(
    (patientId: number) => navigate(`/dashboard/pacientes/${patientId}`),
    [navigate]
  );

  const goCalendar = useCallback(
    () => navigate("/dashboard/calendario"),
    [navigate]
  );

  // ─── Money ─────────────────────────────────────────────────────────────────

  const completedWithPayment = sedeAppointments.filter(
    (a) => a.status === "COMPLETED" && a.payment_id
  ).length;
  const pendingPayment = sedeAppointments.filter(
    (a) => !a.payment_id && a.status !== "COMPLETED"
  ).length;

  // ─── Loading state ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-teal" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-[12.5px] text-ink3 font-medium">
            <Sun size={14} style={{ color: "#F4A89A" }} />
            {todayFormatted()} · {sedeName === "Todas" ? "Todas las sedes" : sedeName}
          </div>
          <h1 className="mt-1.5 text-[28px] font-bold text-ink tracking-tight">
            {greetingText()}, {firstName}
          </h1>
          <p className="mt-1 text-[13.5px] text-ink2">
            {counts.atendido} de {sedeAppointments.length} atendidos ·{" "}
            <span className="font-semibold text-ink">{counts.consulta + counts.espera}</span> en curso
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goCalendar}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-surface border border-line text-[13px] font-semibold text-ink2 hover:bg-bg transition focus-ring"
          >
            <Calendar size={15} />
            Ver agenda
          </button>
          <button
            onClick={goCalendar}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-white text-[13px] font-semibold hover:opacity-90 transition shadow-[var(--shadow-soft)] focus-ring"
            style={{ background: "#5CB8A4" }}
          >
            <Plus size={15} />
            Nuevo turno
          </button>
        </div>
      </div>

      {/* Flow pipeline */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-[13px] font-bold text-ink">Flujo del día</h2>
          {filter && (
            <button
              onClick={() => setFilter(null)}
              className="text-[11.5px] font-semibold hover:underline focus-ring"
              style={{ color: "#5CB8A4" }}
            >
              Ver todos
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {FLOW_ORDER.map((s) => (
            <StageCard
              key={s}
              stateKey={s}
              count={counts[s]}
              active={filter === s}
              onClick={() => setFilter(filter === s ? null : s)}
            />
          ))}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Left: focus card + agenda */}
        <div className="xl:col-span-2 space-y-5">
          {/* Focus card */}
          <FocusCard
            appt={focus}
            advancing={advancingId === focus?.id}
            onAdvance={advance}
            onOpenFicha={openFicha}
          />

          {/* Agenda de hoy */}
          <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div>
                <h3 className="text-[15px] font-bold text-ink">Agenda de hoy</h3>
                <p className="text-[11.5px] text-ink3 mt-0.5">
                  {filter
                    ? `Filtrando: ${STATE_META[filter].short}`
                    : `${sedeAppointments.length} ${sedeAppointments.length === 1 ? "turno" : "turnos"} · ${sedeName === "Todas" ? "Pucón y Villarrica" : sedeName}`}
                </p>
              </div>
              <button
                onClick={goCalendar}
                className="text-[12px] font-semibold hover:underline inline-flex items-center gap-1 focus-ring"
                style={{ color: "#5CB8A4" }}
              >
                Ver semana <ChevronRight size={13} />
              </button>
            </div>
            <div className="px-2 pb-3">
              {shown.length > 0 ? (
                shown.map((appt, i) => (
                  <div key={appt.id}>
                    <AgendaRow
                      appt={appt}
                      advancing={advancingId === appt.id}
                      onAdvance={advance}
                      onOpenFicha={openFicha}
                    />
                    {i < shown.length - 1 && (
                      <div className="ml-[68px] h-px bg-line/70" />
                    )}
                  </div>
                ))
              ) : (
                <div className="px-4 py-10 text-center text-[12.5px] text-ink3">
                  {sedeAppointments.length === 0
                    ? "Sin turnos agendados para hoy."
                    : "Sin turnos en este estado."}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: summary */}
        <div className="space-y-5">
          {/* Resumen de hoy */}
          <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] p-5">
            <h3 className="text-[14px] font-bold text-ink">Resumen de hoy</h3>
            <div className="mt-4 flex items-stretch gap-3">
              <div className="flex-1 rounded-[12px] p-3.5" style={{ background: "rgba(168, 213, 181, 0.15)" }}>
                <div className="text-[11px] font-semibold text-[#3F8358]">Atendidos</div>
                <div className="mt-1 text-[20px] font-bold text-ink leading-none tracking-tight">
                  {counts.atendido}
                </div>
              </div>
              <div className="flex-1 rounded-[12px] p-3.5" style={{ background: "rgba(245, 212, 160, 0.25)" }}>
                <div className="text-[11px] font-semibold text-[#9C7423]">Pendientes</div>
                <div className="mt-1 text-[20px] font-bold text-ink leading-none tracking-tight">
                  {counts.confirmado + counts.espera}
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-1.5 text-[11.5px] text-ink3">
              <p>{completedWithPayment} con pago registrado</p>
              {pendingPayment > 0 && (
                <p className="text-[#9C7423] font-medium">
                  {pendingPayment} sin pago asociado
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      <Toast message={toast} />
    </div>
  );
}
