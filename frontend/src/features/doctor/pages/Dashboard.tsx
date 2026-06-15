import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  CalendarRange,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  Info,
  Sun,
  CheckCircle,
  MapPin,
  ChevronRight,
  Sparkles,
  Download,
  Plus,
  Syringe,
  Mail,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import { useSedeStore } from "../stores/useSedeStore";
import { useDashboardMetrics } from "../hooks/useDashboardMetrics";
import { useRevenueChart } from "../hooks/useRevenueChart";
import { useReminders } from "../hooks/useReminders";
import MetricCard from "../components/MetricCard";
import RevenueChart from "../components/RevenueChart";
import PendingTransfersSection from "../components/PendingTransfersSection";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Appointment, PaginatedResponse, DashboardAlert } from "@/types/api";

// ─── helpers ────────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(time: string): string {
  return time.slice(0, 5);
}

function formatCurrency(amount: string): string {
  const n = parseFloat(amount);
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(n);
}

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

// ─── status chip ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Confirmado:     { bg: "rgba(168, 213, 181, 0.30)", text: "#3F8358" },
  "Pendiente pago": { bg: "rgba(245, 212, 160, 0.45)", text: "#9C7423" },
  Cancelado:      { bg: "rgba(232, 160, 160, 0.30)", text: "#A85050" },
  CONFIRMED:      { bg: "rgba(168, 213, 181, 0.30)", text: "#3F8358" },
  PENDING:        { bg: "rgba(245, 212, 160, 0.45)", text: "#9C7423" },
  CANCELLED:      { bg: "rgba(232, 160, 160, 0.30)", text: "#A85050" },
  COMPLETED:      { bg: "rgba(168, 213, 181, 0.30)", text: "#3F8358" },
};

function StatusChip({ status, label }: { status: string; label?: string }) {
  const s = STATUS_COLORS[status] ?? STATUS_COLORS.CONFIRMED;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{ background: s.bg, color: s.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.text }} />
      {label ?? status}
    </span>
  );
}

// ─── type chip ──────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  "Control sano": { bg: "rgba(125, 211, 192, 0.20)", text: "#3E8E7C" },
  "Consulta":     { bg: "rgba(199, 184, 232, 0.30)", text: "#6B569E" },
  "Online":       { bg: "rgba(244, 168, 154, 0.25)", text: "#B5604F" },
};

function TypeChip({ label }: { label: string }) {
  const colors = TYPE_COLORS[label] ?? { bg: "rgba(199, 184, 232, 0.30)", text: "#6B569E" };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-semibold"
      style={{ background: colors.bg, color: colors.text }}
    >
      {label}
    </span>
  );
}

// ─── agenda item ────────────────────────────────────────────────────────────────

function AgendaItem({
  appointment,
  onConfirm,
  confirmPending,
}: {
  appointment: Appointment;
  onConfirm: (id: number) => void;
  confirmPending: boolean;
}) {
  return (
    <div className="group flex items-stretch gap-4 px-4 py-3.5 rounded-[12px] hover:bg-bg transition-colors cursor-pointer">
      <div className="w-14 shrink-0 text-teal-dark font-bold text-[15px] leading-tight pt-0.5">
        {formatTime(appointment.start_time)}
      </div>
      <div className="w-px bg-line shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13.5px] font-semibold text-ink">{appointment.patient_name}</span>
          {appointment.service_name && <TypeChip label={appointment.service_name} />}
        </div>
      </div>
      <div className="flex flex-col items-end justify-between shrink-0 gap-2">
        {appointment.location_name && (
          <div className="flex items-center gap-1 text-[11px] text-ink3">
            <MapPin size={11} />
            {appointment.location_name}
          </div>
        )}
        <StatusChip status={appointment.status} label={appointment.status_display} />
        {appointment.status === "PENDING" && (
          <button
            onClick={() => onConfirm(appointment.id)}
            disabled={confirmPending}
            className={cn(
              "text-[11px] font-semibold px-2.5 py-1 rounded-[8px] transition-colors",
              "bg-teal/15 text-teal-dark hover:bg-teal/25",
              confirmPending && "opacity-50"
            )}
          >
            <CheckCircle size={12} className="inline mr-1 -mt-px" />
            Confirmar
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Dashboard page ─────────────────────────────────────────────────────────────

export default function Dashboard() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const sedeId = useSedeStore((s) => s.sedeId);
  const today = todayISO();

  // Data hooks
  const metricsQ = useDashboardMetrics();
  const revenueQ = useRevenueChart();
  const remindersQ = useReminders();

  // Today's agenda
  const agendaQ = useQuery<PaginatedResponse<Appointment>>({
    queryKey: ["appointments", "today", today, sedeId],
    queryFn: async () => {
      const params = new URLSearchParams({ date: today, page_size: "100" });
      if (sedeId) params.set("location_id", String(sedeId));
      const { data } = await api.get<PaginatedResponse<Appointment>>(
        `/appointments/?${params}`
      );
      return data;
    },
    staleTime: 1000 * 60 * 2,
  });

  const confirmMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/appointments/${id}/confirm/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    },
  });

  const agenda = [...(agendaQ.data?.results ?? [])].sort((a, b) =>
    a.start_time.localeCompare(b.start_time)
  );

  const metrics = metricsQ.data;
  const revenue = revenueQ.data ?? [];
  const reminders = remindersQ.data ?? [];
  const loading = metricsQ.isLoading;
  const firstName = user?.first_name ?? "Doctora";

  const totalRevenue = metrics
    ? formatCurrency(metrics.month_revenue)
    : "...";

  return (
    <div className="space-y-7 max-w-[1200px]">
      {/* Pending transfers */}
      <PendingTransfersSection />

      {/* Greeting */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-[12.5px] text-ink3 font-medium">
            <Sun size={14} className="text-coral" />
            {todayFormatted()}
          </div>
          <h1 className="mt-1.5 text-[28px] font-bold text-ink tracking-tight">
            {greetingText()}, {firstName}
          </h1>
          <p className="mt-1 text-[13.5px] text-ink2">
            Hoy tenes <span className="font-semibold text-ink">{metrics?.today_count ?? "..."} turnos</span>
            {(metrics?.pending_count ?? 0) > 0 && (
              <> y <span className="font-semibold text-ink">{metrics?.pending_count} pendientes</span> por confirmar</>
            )}
            .
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.open("/gestion-9f3a/scheduling/appointment/?export=csv", "_blank")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] text-[13px] font-semibold text-ink2 border border-line hover:bg-bg transition-colors"
          >
            <Download size={14} />
            Exportar
          </button>
          <Link
            to="/dashboard/calendario"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] text-[13px] font-semibold text-white transition-colors"
            style={{ background: "#3E8E7C" }}
          >
            <Plus size={14} />
            Nuevo turno
          </Link>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard icon={Calendar} iconBg="rgba(125, 211, 192, 0.20)" iconColor="#3E8E7C" value={metrics?.today_count ?? 0} label="Turnos hoy" loading={loading} />
        <MetricCard icon={CalendarRange} iconBg="rgba(199, 184, 232, 0.28)" iconColor="#6B569E" value={metrics?.week_count ?? 0} label="Esta semana" loading={loading} />
        <MetricCard icon={TrendingUp} iconBg="rgba(244, 168, 154, 0.25)" iconColor="#B5604F" value={loading ? "..." : totalRevenue} label="Ingresos del mes" loading={loading} />
        <MetricCard icon={AlertCircle} iconBg="rgba(245, 212, 160, 0.40)" iconColor="#9C7423" value={loading ? "..." : `${(parseFloat(metrics?.no_show_rate ?? "0") * 100).toFixed(1)}%`} label="Tasa de no-show" loading={loading} />
      </div>

      {/* Two-column: Agenda + Revenue/Reminders */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Agenda */}
        <div className="xl:col-span-2 bg-surface border border-line rounded-[14px] shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div>
              <h3 className="text-[15px] font-bold text-ink">Agenda de hoy</h3>
              <p className="text-[11.5px] text-ink3 mt-0.5">
                {agenda.length} turno{agenda.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Link
              to="/dashboard/calendario"
              className="text-[12px] font-semibold text-teal-dark hover:underline inline-flex items-center gap-1"
            >
              Ver semana <ChevronRight size={13} />
            </Link>
          </div>
          <div className="px-2 pb-3">
            {agendaQ.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-5 w-5 rounded-full border-2 border-line border-t-teal animate-spin" />
              </div>
            ) : agenda.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-ink3">
                <Calendar size={32} className="opacity-40" />
                <p className="text-[14px]">Sin turnos hoy</p>
              </div>
            ) : (
              agenda.map((a, i) => (
                <div key={a.id}>
                  <AgendaItem
                    appointment={a}
                    onConfirm={(id) => confirmMutation.mutate(id)}
                    confirmPending={confirmMutation.isPending}
                  />
                  {i < agenda.length - 1 && <div className="ml-[88px] h-px bg-line/70" />}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Revenue + Reminders */}
        <div className="space-y-5">
          {/* Revenue chart */}
          <div className="bg-surface border border-line rounded-[14px] shadow-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-[14px] font-bold text-ink">Ingresos · 30 dias</h3>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-[22px] font-bold text-ink tracking-tight">{totalRevenue}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-ink3">
                <span className="w-2 h-2 rounded-full bg-teal" />
                CLP
              </div>
            </div>
            <div className="mt-3 -ml-2">
              <RevenueChart data={revenue} loading={revenueQ.isLoading} />
            </div>
          </div>

          {/* Reminders */}
          <div className="bg-surface border border-line rounded-[14px] shadow-card p-5">
            <h3 className="text-[14px] font-bold text-ink">Recordatorios</h3>
            {reminders.length === 0 ? (
              <p className="mt-4 text-[12px] text-ink3">Sin recordatorios esta semana</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {reminders.map((r, i) => {
                  const rtype = r.type as string;
                  const iconProps =
                    rtype === "vaccine"
                      ? { Icon: Syringe, bg: "rgba(199,184,232,0.30)", color: "#6B569E" }
                      : rtype === "email"
                      ? { Icon: Mail, bg: "rgba(244,168,154,0.25)", color: "#B5604F" }
                      : { Icon: Sparkles, bg: "rgba(125,211,192,0.20)", color: "#3E8E7C" };
                  return (
                    <li key={i} className="flex items-start gap-3">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: iconProps.bg }}
                      >
                        <iconProps.Icon size={13} style={{ color: iconProps.color }} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-semibold text-ink leading-tight">{r.title}</div>
                        <div className="text-[11.5px] text-ink2 mt-0.5">{r.detail}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Desglose rápido */}
      {!loading && metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Top servicios */}
          <div className="bg-surface border border-line rounded-[14px] shadow-card p-5">
            <h3 className="text-[14px] font-bold text-ink mb-3">Top servicios del mes</h3>
            {metrics.top_services.length === 0 ? (
              <p className="text-[12px] text-ink3">Sin datos este mes</p>
            ) : (
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-ink3 text-left border-b border-line">
                    <th className="pb-2 font-medium">Servicio</th>
                    <th className="pb-2 font-medium text-right">Turnos</th>
                    <th className="pb-2 font-medium text-right">Ingresos</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.top_services.map((s, i) => (
                    <tr key={i} className="border-b border-line/50 last:border-0">
                      <td className="py-2 text-ink font-medium truncate max-w-[140px]">{s.name}</td>
                      <td className="py-2 text-ink2 text-right">{s.count}</td>
                      <td className="py-2 text-ink font-semibold text-right">
                        {formatCurrency(s.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Método de pago */}
          <div className="bg-surface border border-line rounded-[14px] shadow-card p-5">
            <h3 className="text-[14px] font-bold text-ink mb-3">Método de pago</h3>
            {metrics.by_payment_method.length === 0 ? (
              <p className="text-[12px] text-ink3">Sin datos este mes</p>
            ) : (
              <ul className="space-y-3">
                {(() => {
                  const grandTotal = metrics.by_payment_method.reduce(
                    (sum, m) => sum + parseFloat(m.total),
                    0
                  );
                  return metrics.by_payment_method.map((m, i) => {
                    const pct = grandTotal > 0
                      ? Math.round((parseFloat(m.total) / grandTotal) * 100)
                      : 0;
                    return (
                      <li key={i}>
                        <div className="flex items-center justify-between text-[12px] mb-1">
                          <span className="text-ink font-medium">{m.method}</span>
                          <span className="text-ink2">{pct}% · {m.count} pago{m.count !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="h-1.5 w-full bg-line rounded-full overflow-hidden">
                          <div
                            className="h-full bg-teal rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </li>
                    );
                  });
                })()}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Alertas */}
      {!loading && metrics && metrics.alerts.length > 0 && (
        <div className="bg-surface border border-line rounded-[14px] shadow-card p-5">
          <h3 className="text-[14px] font-bold text-ink mb-3">Alertas</h3>
          <ul className="space-y-2">
            {metrics.alerts.map((alert: DashboardAlert, i: number) => (
              <li
                key={i}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[12.5px]",
                  alert.severity === "warning"
                    ? "bg-[rgba(245,212,160,0.25)] text-[#9C7423]"
                    : "bg-[rgba(168,210,255,0.20)] text-[#2E6EA6]"
                )}
              >
                {alert.severity === "warning" ? (
                  <AlertTriangle size={15} className="shrink-0" />
                ) : (
                  <Info size={15} className="shrink-0" />
                )}
                <span className="flex-1 font-medium">{alert.message}</span>
                <span
                  className={cn(
                    "shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full",
                    alert.severity === "warning"
                      ? "bg-[rgba(245,212,160,0.50)] text-[#9C7423]"
                      : "bg-[rgba(168,210,255,0.40)] text-[#2E6EA6]"
                  )}
                >
                  {alert.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
