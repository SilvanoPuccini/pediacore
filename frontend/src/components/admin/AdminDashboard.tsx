import SEOHead from "@/components/seo/SEOHead";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle,
  Clock,
  DollarSign,
  ExternalLink,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Appointment, OcrResult, Patient, Payment, PaginatedResponse, PendingTransferPayment } from "@/types/api";

// ─── helpers ────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function currentMonthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);
  return { start, end };
}

function formatTime(time: string): string {
  // "09:30:00" → "09:30"
  return time.slice(0, 5);
}

function calcAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function formatSexAtBirth(s: string): string {
  if (s === "M") return "Masculino";
  if (s === "F") return "Femenino";
  if (s === "NO_ESPECIFICA") return "No especifica";
  return s;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatCurrency(amount: string, currency = "CLP"): string {
  const n = parseFloat(amount);
  return new Intl.NumberFormat("es-CL", { style: "currency", currency }).format(n);
}

// ─── status badge ────────────────────────────────────────────────────────────

type StatusKind = "appointment" | "payment";

const APPOINTMENT_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-mustard/20 text-mustard",
  CONFIRMED: "bg-teal/20 text-teal-dark",
  COMPLETED: "bg-sage/20 text-sage",
  CANCELLED: "bg-coral/20 text-coral",
};

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-mustard/20 text-mustard",
  COMPLETED: "bg-sage/20 text-sage",
  FAILED: "bg-coral/20 text-coral",
  REFUNDED: "bg-line text-ink2",
};

function StatusBadge({
  status,
  label,
  kind,
}: {
  status: string;
  label?: string;
  kind: StatusKind;
}) {
  const map = kind === "appointment" ? APPOINTMENT_STATUS_STYLES : PAYMENT_STATUS_STYLES;
  const cls = map[status] ?? "bg-line text-ink2";
  return (
    <span
      className={cn(
        "inline-flex items-center text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide",
        cls
      )}
    >
      {label ?? status}
    </span>
  );
}

// ─── skeleton primitives ─────────────────────────────────────────────────────

function SkeletonBox({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-[8px] bg-line/60", className)} />
  );
}

function StatCardSkeleton() {
  return (
    <div className="bg-surface rounded-[16px] border border-line p-5 flex flex-col gap-3">
      <SkeletonBox className="h-8 w-8 rounded-full" />
      <SkeletonBox className="h-7 w-16" />
      <SkeletonBox className="h-4 w-28" />
    </div>
  );
}

function AgendaRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <SkeletonBox className="h-4 w-12" />
      <SkeletonBox className="h-4 flex-1" />
      <SkeletonBox className="h-4 w-20" />
      <SkeletonBox className="h-5 w-20 rounded-full" />
    </div>
  );
}

function TableRowSkeleton({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <SkeletonBox className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

// ─── stat card ───────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  iconBg: string;
}

function StatCard({ icon, value, label, iconBg }: StatCardProps) {
  return (
    <div className="bg-surface rounded-[16px] border border-line p-5 flex flex-col gap-3">
      <div className={cn("h-9 w-9 rounded-[10px] flex items-center justify-center", iconBg)}>
        {icon}
      </div>
      <div className="font-display text-[26px] font-bold text-ink leading-none">
        {value}
      </div>
      <div className="text-[13px] text-ink2">{label}</div>
    </div>
  );
}

// ─── section header ──────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="font-display text-[16px] font-semibold text-ink mb-4">
      {title}
    </h2>
  );
}

// ─── reject modal ─────────────────────────────────────────────────────────────

interface RejectModalProps {
  paymentId: number;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
}

function RejectModal({ onClose, onConfirm, isPending }: RejectModalProps) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] w-full max-w-[440px] p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <h3 className="font-display text-[18px] font-semibold text-ink">
            Rechazar transferencia
          </h3>
          <button
            onClick={onClose}
            className="text-ink3 hover:text-ink transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <p className="text-[13px] text-ink2 mb-4">
          Indicá el motivo del rechazo. El tutor recibirá un email explicando la razón.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Ej: El monto transferido no coincide con el indicado..."
          className="w-full px-4 py-3 rounded-[12px] border border-line bg-bg text-ink text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral"
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-[10px] border border-line text-[13px] font-semibold text-ink2 hover:bg-bg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={!reason.trim() || isPending}
            className="flex-1 px-4 py-2.5 rounded-[10px] bg-coral text-white text-[13px] font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
          >
            {isPending ? "Rechazando..." : "Rechazar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── OCR analysis card ────────────────────────────────────────────────────────

function confidenceColorClass(confidence: number): string {
  if (confidence >= 80) return "text-teal-dark bg-teal/10";
  if (confidence >= 50) return "text-mustard bg-mustard/10";
  return "text-coral bg-coral/10";
}

function OcrFieldRow({
  label,
  value,
  match,
}: {
  label: string;
  value: string | null;
  match?: boolean;
}) {
  if (value === null || value === undefined) return null;

  let icon: string;
  let statusText: string;

  if (match === true) {
    icon = "✅";
    statusText = "coincide";
  } else if (match === false) {
    icon = "❌";
    statusText = "no coincide";
  } else {
    icon = "ℹ️";
    statusText = "";
  }

  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span>{icon}</span>
      <span className="text-ink2 font-medium">{label}:</span>
      <span className="text-ink">{value}</span>
      {statusText && (
        <span className="text-ink3">({statusText})</span>
      )}
    </div>
  );
}

function OcrAnalysisCard({ ocr }: { ocr: OcrResult }) {
  if (ocr.error) return null;

  const { extracted, matches, confidence } = ocr;
  const colorClass = confidenceColorClass(confidence);

  const formattedMonto =
    extracted.monto !== null
      ? new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(
          extracted.monto
        )
      : null;

  const formattedFecha =
    extracted.fecha !== null
      ? new Date(extracted.fecha + "T12:00:00").toLocaleDateString("es-CL", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : null;

  return (
    <div className="mt-3 rounded-[12px] border border-line bg-bg px-4 py-3 space-y-1.5">
      <p className="text-[11px] font-semibold text-ink2 uppercase tracking-wide mb-2">
        Análisis del comprobante
      </p>
      <OcrFieldRow
        label="Monto"
        value={formattedMonto}
        match={matches.monto}
      />
      <OcrFieldRow
        label="Fecha"
        value={formattedFecha}
        match={matches.fecha}
      />
      <OcrFieldRow
        label="RUT"
        value={extracted.rut_remitente}
      />
      <OcrFieldRow
        label="Banco"
        value={extracted.banco_origen}
      />
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-line">
        <span className="text-[12px] text-ink2">Confianza:</span>
        <span
          className={cn(
            "text-[12px] font-bold px-2 py-0.5 rounded-full",
            colorClass
          )}
        >
          {confidence}%
        </span>
      </div>
    </div>
  );
}

// ─── pending transfers section ───────────────────────────────────────────────

function PendingTransfersSection() {
  const queryClient = useQueryClient();
  const [rejectTarget, setRejectTarget] = useState<number | null>(null);

  const pendingTransfersQ = useQuery<PaginatedResponse<PendingTransferPayment>>({
    queryKey: ["payments", "pending-transfers"],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<PendingTransferPayment>>(
        `/payments/?status=PENDING&payment_method=TRANSFER&receipt_uploaded=true&page_size=50`
      );
      return data;
    },
    staleTime: 1000 * 60,
  });

  const confirmMutation = useMutation({
    mutationFn: async (paymentId: number) => {
      const { data } = await api.post(`/payments/${paymentId}/confirm-transfer/`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments", "pending-transfers"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ paymentId, reason }: { paymentId: number; reason: string }) => {
      const { data } = await api.post(`/payments/${paymentId}/reject-transfer/`, { reason });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments", "pending-transfers"] });
      setRejectTarget(null);
    },
  });

  const pendingTransfers = pendingTransfersQ.data?.results ?? [];
  const count = pendingTransfersQ.data?.count ?? 0;

  if (pendingTransfersQ.isLoading) return null;
  if (count === 0) return null;

  return (
    <>
      {/* Banner */}
      <div className="flex items-center gap-3 bg-coral/10 border border-coral/30 rounded-[16px] px-5 py-4">
        <AlertCircle size={18} className="text-coral shrink-0" />
        <p className="text-[14px] font-semibold text-ink">
          {count} {count === 1 ? "transferencia pendiente" : "transferencias pendientes"} de revisar
        </p>
      </div>

      {/* Cards */}
      <section>
        <SectionHeader title="Transferencias pendientes" />
        <div className="bg-surface rounded-[16px] border border-line overflow-hidden">
          <div className="divide-y divide-line">
            {pendingTransfers.map((payment) => {
              const ocrResult = payment.metadata?.ocr_result;

              return (
                <div
                  key={payment.id}
                  className="px-5 py-4 hover:bg-bg/60 transition-colors"
                >
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    {/* Patient + service info */}
                    <div className="flex-1 min-w-[160px]">
                      <p className="text-[13px] font-medium text-ink">
                        {payment.patient_name}
                      </p>
                      <p className="text-[11px] text-ink3">
                        {payment.service_name ?? "—"}
                        {payment.scheduled_date ? ` · ${formatDate(payment.scheduled_date)}` : ""}
                      </p>
                    </div>

                    {/* Amount */}
                    <span className="text-[14px] font-bold text-teal-dark">
                      {formatCurrency(payment.amount, payment.currency)}
                    </span>

                    {/* Receipt link */}
                    {payment.receipt_file && (
                      <a
                        href={payment.receipt_file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[12px] font-medium text-teal-dark hover:underline"
                      >
                        <ExternalLink size={13} />
                        Ver comprobante
                      </a>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => confirmMutation.mutate(payment.id)}
                        disabled={confirmMutation.isPending}
                        className={cn(
                          "flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-[8px] transition-colors",
                          "bg-teal/15 text-teal-dark hover:bg-teal/25",
                          confirmMutation.isPending && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <CheckCircle size={13} className="inline -mt-px" />
                        Confirmar
                      </button>
                      <button
                        onClick={() => setRejectTarget(payment.id)}
                        disabled={rejectMutation.isPending}
                        className={cn(
                          "flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-[8px] transition-colors",
                          "bg-coral/10 text-coral hover:bg-coral/20",
                          rejectMutation.isPending && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <X size={13} className="inline -mt-px" />
                        Rechazar
                      </button>
                    </div>
                  </div>

                  {/* OCR analysis — shown when result is available (advisory only) */}
                  {ocrResult && !ocrResult.error && (
                    <OcrAnalysisCard ocr={ocrResult} />
                  )}
                  {/* Pending state: receipt uploaded but OCR not yet done */}
                  {payment.receipt_file && !ocrResult && (
                    <p className="mt-2 text-[11px] text-ink3 flex items-center gap-1.5">
                      <Clock size={11} className="shrink-0" />
                      Analizando comprobante...
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Reject modal */}
      {rejectTarget !== null && (
        <RejectModal
          paymentId={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onConfirm={(reason) => {
            rejectMutation.mutate({ paymentId: rejectTarget, reason });
          }}
          isPending={rejectMutation.isPending}
        />
      )}
    </>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const today = todayISO();
  const { start: monthStart, end: monthEnd } = currentMonthRange();

  // Appointments today
  const todayAppointmentsQ = useQuery<PaginatedResponse<Appointment>>({
    queryKey: ["appointments", "today", today],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Appointment>>(
        `/appointments/?date=${today}&page_size=100`
      );
      return data;
    },
    staleTime: 1000 * 60 * 2,
  });

  // Pending appointments (all, not just today)
  const pendingAppointmentsQ = useQuery<PaginatedResponse<Appointment>>({
    queryKey: ["appointments", "pending"],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Appointment>>(
        `/appointments/?status=PENDING&page_size=100`
      );
      return data;
    },
    staleTime: 1000 * 60 * 2,
  });

  // All patients
  const patientsQ = useQuery<PaginatedResponse<Patient>>({
    queryKey: ["patients", "all"],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Patient>>(
        `/patients/?page_size=100`
      );
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Payments (all, for month revenue + recent list)
  const paymentsQ = useQuery<PaginatedResponse<Payment>>({
    queryKey: ["payments", "all"],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Payment>>(
        `/payments/?page_size=200`
      );
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Confirm appointment mutation
  const confirmMutation = useMutation({
    mutationFn: async (appointmentId: number) => {
      const { data } = await api.post(`/appointments/${appointmentId}/confirm/`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });

  // ── derived data ────────────────────────────────────────────────────────────

  const todayAppointments: Appointment[] = todayAppointmentsQ.data?.results ?? [];
  const sortedTodayAppointments = [...todayAppointments].sort((a, b) =>
    a.start_time.localeCompare(b.start_time)
  );

  const pendingCount = pendingAppointmentsQ.data?.count ?? 0;
  const totalPatients = patientsQ.data?.count ?? 0;

  const monthRevenue = (paymentsQ.data?.results ?? [])
    .filter(
      (p) =>
        p.status === "COMPLETED" &&
        p.created_at >= monthStart &&
        p.created_at <= monthEnd + "T23:59:59"
    )
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  const recentPatients = [...(patientsQ.data?.results ?? [])]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5);

  const recentPayments = [...(paymentsQ.data?.results ?? [])]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5);

  // ── loading flags ───────────────────────────────────────────────────────────

  const statsLoading =
    todayAppointmentsQ.isLoading ||
    pendingAppointmentsQ.isLoading ||
    patientsQ.isLoading ||
    paymentsQ.isLoading;

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 max-w-[1100px]">
      <SEOHead
        title="Panel de administración"
        description="Administración de turnos y pacientes — Dra. Estefi Pediatría."
        url="https://estefipediatra.com/admin"
      />

      {/* ── Pending transfers alert + section ── */}
      <PendingTransfersSection />

      {/* ── Section 1: Stats ── */}
      <section>
        <SectionHeader title="Resumen de hoy" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statsLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <StatCard
                icon={<CalendarDays size={18} className="text-teal-dark" />}
                iconBg="bg-teal/15"
                value={todayAppointmentsQ.data?.count ?? 0}
                label="Consultas hoy"
              />
              <StatCard
                icon={<Users size={18} className="text-coral" />}
                iconBg="bg-coral/15"
                value={totalPatients}
                label="Pacientes registrados"
              />
              <StatCard
                icon={<Clock size={18} className="text-mustard" />}
                iconBg="bg-mustard/15"
                value={pendingCount}
                label="Pendientes de confirmar"
              />
              <StatCard
                icon={<DollarSign size={18} className="text-sage" />}
                iconBg="bg-sage/15"
                value={
                  paymentsQ.isLoading
                    ? "..."
                    : formatCurrency(monthRevenue.toFixed(0))
                }
                label="Ingresos este mes"
              />
            </>
          )}
        </div>
      </section>

      {/* ── Section 2: Today's agenda ── */}
      <section>
        <SectionHeader title="Agenda de hoy" />
        <div className="bg-surface rounded-[16px] border border-line overflow-hidden">
          {todayAppointmentsQ.isLoading ? (
            <div className="divide-y divide-line">
              {Array.from({ length: 4 }).map((_, i) => (
                <AgendaRowSkeleton key={i} />
              ))}
            </div>
          ) : sortedTodayAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-ink3">
              <CalendarDays size={32} className="opacity-40" />
              <p className="text-[14px]">Sin consultas hoy</p>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {sortedTodayAppointments.map((appt) => (
                <div
                  key={appt.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 hover:bg-bg/60 transition-colors"
                >
                  {/* time */}
                  <span className="text-[13px] font-semibold text-ink w-[52px] shrink-0">
                    {formatTime(appt.start_time)}
                  </span>

                  {/* patient + service */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-ink truncate">
                      {appt.patient_name}
                    </p>
                    <p className="text-[11px] text-ink3 truncate">
                      {appt.service_name}
                      {appt.location_name ? ` · ${appt.location_name}` : ""}
                    </p>
                  </div>

                  {/* status badge */}
                  <StatusBadge
                    status={appt.status}
                    label={appt.status_display ?? appt.status}
                    kind="appointment"
                  />

                  {/* confirm button */}
                  {appt.status === "PENDING" && (
                    <button
                      onClick={() => confirmMutation.mutate(appt.id)}
                      disabled={confirmMutation.isPending}
                      className={cn(
                        "text-[12px] font-semibold px-3 py-1.5 rounded-[8px] transition-colors",
                        "bg-teal/15 text-teal-dark hover:bg-teal/25",
                        confirmMutation.isPending && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <CheckCircle size={13} className="inline mr-1 -mt-px" />
                      Confirmar
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Sections 3 & 4: side by side on lg ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Section 3: Recent patients ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-[16px] font-semibold text-ink">
              Últimos pacientes
            </h2>
            <a
              href="#"
              className="text-[12px] font-medium text-teal-dark hover:underline"
            >
              Ver todos
            </a>
          </div>
          <div className="bg-surface rounded-[16px] border border-line overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-ink2 uppercase tracking-wide">
                    Nombre
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-ink2 uppercase tracking-wide hidden sm:table-cell">
                    Edad
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-ink2 uppercase tracking-wide hidden sm:table-cell">
                    Sexo
                  </th>
                </tr>
              </thead>
              <tbody>
                {patientsQ.isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRowSkeleton key={i} cols={3} />
                  ))
                ) : recentPatients.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center text-ink3 text-[13px]"
                    >
                      Sin pacientes registrados
                    </td>
                  </tr>
                ) : (
                  recentPatients.map((patient, idx) => (
                    <tr
                      key={patient.id}
                      className={cn(idx % 2 === 1 && "bg-surface/50")}
                    >
                      <td className="px-4 py-3 text-ink font-medium">
                        {patient.full_name}
                        <div className="text-[11px] text-ink3 font-normal sm:hidden">
                          {patient.date_of_birth
                            ? `${calcAge(patient.date_of_birth)} años · ${formatSexAtBirth(patient.sex_at_birth)}`
                            : "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink2 hidden sm:table-cell">
                        {patient.date_of_birth
                          ? `${calcAge(patient.date_of_birth)} años`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-ink2 hidden sm:table-cell">
                        {formatSexAtBirth(patient.sex_at_birth)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Section 4: Recent payments ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-[16px] font-semibold text-ink">
              Últimos pagos
            </h2>
          </div>
          <div className="bg-surface rounded-[16px] border border-line overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-ink2 uppercase tracking-wide">
                    Fecha
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-ink2 uppercase tracking-wide">
                    Monto
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-ink2 uppercase tracking-wide">
                    Estado
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-ink2 uppercase tracking-wide hidden sm:table-cell">
                    Ref.
                  </th>
                </tr>
              </thead>
              <tbody>
                {paymentsQ.isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRowSkeleton key={i} cols={4} />
                  ))
                ) : recentPayments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-ink3 text-[13px]"
                    >
                      Sin pagos registrados
                    </td>
                  </tr>
                ) : (
                  recentPayments.map((payment, idx) => (
                    <tr
                      key={payment.id}
                      className={cn(idx % 2 === 1 && "bg-surface/50")}
                    >
                      <td className="px-4 py-3 text-ink2">
                        {formatDate(payment.created_at)}
                      </td>
                      <td className="px-4 py-3 font-medium text-ink">
                        {formatCurrency(payment.amount, payment.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          status={payment.status}
                          kind="payment"
                        />
                      </td>
                      <td className="px-4 py-3 text-ink3 font-mono text-[11px] hidden sm:table-cell truncate max-w-[100px]">
                        {payment.reference_id || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
