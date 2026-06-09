import { useQuery } from "@tanstack/react-query";
import { CreditCard, AlertCircle, TrendingUp, Clock, CheckCircle } from "lucide-react";
import api from "@/lib/api";
import type { PaymentListItem, PaginatedResponse } from "@/types/api";

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatCLP(amount: string | number): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return `$${n.toLocaleString("es-CL")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function displayMethod(method: string): string {
  if (method === "MERCADOPAGO") return "MercadoPago";
  if (method === "TRANSFER") return "Transferencia";
  return method;
}

// ─── status chip ──────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { bg: string; text: string; label: string }> = {
  COMPLETED: { bg: "rgba(168, 213, 181, 0.30)", text: "#3F8358", label: "Completado" },
  PENDING:   { bg: "rgba(245, 212, 160, 0.40)", text: "#9C7423", label: "Pendiente" },
  FAILED:    { bg: "rgba(232, 160, 160, 0.30)", text: "#A85050", label: "Fallido" },
  REFUNDED:  { bg: "rgba(180, 180, 190, 0.25)", text: "#777",    label: "Reembolsado" },
};

function StatusChip({ status, label }: { status: string; label?: string }) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.PENDING;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{ background: s.bg, color: s.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.text }} />
      {label ?? s.label}
    </span>
  );
}

// ─── summary card ─────────────────────────────────────────────────────────────

function SummaryCard({
  icon: Icon,
  iconBg,
  iconColor,
  value,
  label,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  value: string;
  label: string;
}) {
  return (
    <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] p-5 flex items-center gap-4">
      <div
        className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
        style={{ background: iconBg }}
      >
        <Icon size={18} style={{ color: iconColor }} />
      </div>
      <div>
        <div className="text-[19px] font-bold text-ink tracking-tight">{value}</div>
        <div className="text-[12px] text-ink2 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function PagosPage() {
  const { data, isLoading, isError } = useQuery<PaginatedResponse<PaymentListItem>>({
    queryKey: ["payments-admin"],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<PaymentListItem>>(
        "/payments/?page_size=100"
      );
      return data;
    },
    staleTime: 1000 * 60 * 2,
  });

  const payments = data?.results ?? [];

  // Summary metrics
  const completed = payments.filter((p) => p.status === "COMPLETED");
  const pending = payments.filter((p) => p.status === "PENDING");
  const totalCobrado = completed.reduce((acc, p) => acc + parseFloat(p.amount), 0);
  const collectionRate =
    payments.length > 0
      ? ((completed.length / payments.length) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="space-y-6 max-w-[1100px]">
      {/* Header */}
      <div>
        <h1 className="text-[20px] font-bold text-ink tracking-tight">Pagos</h1>
        <p className="text-[13px] text-ink2 mt-0.5">
          Historial de transacciones y estado de cobros
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          icon={TrendingUp}
          iconBg="rgba(125, 211, 192, 0.20)"
          iconColor="#3E8E7C"
          value={isLoading ? "..." : formatCLP(totalCobrado)}
          label="Total cobrado"
        />
        <SummaryCard
          icon={Clock}
          iconBg="rgba(245, 212, 160, 0.40)"
          iconColor="#9C7423"
          value={isLoading ? "..." : String(pending.length)}
          label="Pendientes"
        />
        <SummaryCard
          icon={CheckCircle}
          iconBg="rgba(168, 213, 181, 0.28)"
          iconColor="#3F8358"
          value={isLoading ? "..." : `${collectionRate}%`}
          label="Tasa de cobro"
        />
      </div>

      {/* Table card */}
      <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-5 w-5 rounded-full border-2 border-line border-t-teal animate-spin" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-ink3">
            <AlertCircle size={28} className="opacity-40" />
            <p className="text-[13px]">Error al cargar los pagos</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-ink3">
            <CreditCard size={32} className="opacity-40" />
            <p className="text-[14px]">Sin pagos registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-5 py-3 text-left text-[11.5px] font-semibold text-ink3 uppercase tracking-wide">
                    Paciente
                  </th>
                  <th className="px-5 py-3 text-left text-[11.5px] font-semibold text-ink3 uppercase tracking-wide">
                    Servicio
                  </th>
                  <th className="px-5 py-3 text-left text-[11.5px] font-semibold text-ink3 uppercase tracking-wide">
                    Monto
                  </th>
                  <th className="px-5 py-3 text-left text-[11.5px] font-semibold text-ink3 uppercase tracking-wide">
                    Método
                  </th>
                  <th className="px-5 py-3 text-left text-[11.5px] font-semibold text-ink3 uppercase tracking-wide">
                    Estado
                  </th>
                  <th className="px-5 py-3 text-left text-[11.5px] font-semibold text-ink3 uppercase tracking-wide">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-bg transition-colors">
                    <td className="px-5 py-3.5 text-[13px] font-semibold text-ink">
                      {payment.patient_name}
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-ink2">
                      {payment.service_name ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 text-[13px] font-semibold text-ink tabular-nums">
                      {formatCLP(payment.amount)}
                    </td>
                    <td className="px-5 py-3.5 text-[12.5px] text-ink2">
                      {displayMethod(payment.payment_method)}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusChip
                        status={payment.status}
                        label={payment.status_display}
                      />
                    </td>
                    <td className="px-5 py-3.5 text-[12.5px] text-ink2">
                      {formatDate(payment.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && (
        <p className="text-[12px] text-ink3">
          {data.count} pago{data.count !== 1 ? "s" : ""} en total
        </p>
      )}
    </div>
  );
}
