import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CreditCard,
  TrendingUp,
  Receipt,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { Card, Btn, EmptyState, Avatar, clp } from "@/features/tutor/components/portal-ui";
import type { PaymentListItem, PaginatedResponse } from "@/types/api";

const PAGE_SIZE = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCLP(amount: string | number): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return clp(n);
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  amount,
  subtitle,
  icon: Icon,
  iconBg,
  iconClassName,
}: {
  label: string;
  amount: string;
  subtitle: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  iconBg: string;
  iconClassName: string;
}) {
  return (
    <Card className="flex items-start justify-between">
      <div>
        <p className={cn("text-[10.5px] uppercase tracking-[0.14em] font-semibold", iconClassName)}>
          {label}
        </p>
        <p className="font-display text-[28px] font-bold text-ink mt-1">{amount}</p>
        <p className="text-[11.5px] text-ink2 mt-0.5">{subtitle}</p>
      </div>
      <div
        className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
        style={{ backgroundColor: iconBg }}
      >
        <Icon size={18} className={cn("shrink-0", iconClassName)} />
      </div>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BillingHistory() {
  const [page, setPage] = useState(1);
  const [cancelTarget, setCancelTarget] = useState<PaymentListItem | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const cancelMutation = useMutation({
    mutationFn: (appointmentId: number) =>
      api.post(`/appointments/${appointmentId}/cancel/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setCancelTarget(null);
    },
  });

  const exportCSV = useCallback((payments: PaymentListItem[]) => {
    const header = "Concepto,Paciente,Monto,Estado,Método,Fecha pago,Fecha creación";
    const rows = payments.map((p) =>
      [
        p.service_name ?? "Consulta",
        p.patient_name,
        p.amount,
        p.status_display,
        p.payment_method_display,
        p.paid_at ?? "",
        p.created_at,
      ]
        .map((v) => `"${v}"`)
        .join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pagos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["payments", page],
    queryFn: () =>
      api
        .get<PaginatedResponse<PaymentListItem>>("/payments/", {
          params: { page, page_size: PAGE_SIZE },
        })
        .then((r) => r.data),
  });

  const results = data?.results ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Compute summary stats
  const pending = results.filter((p) => p.status === "PENDING");
  const paid = results.filter((p) => p.status === "COMPLETED");
  const pendingTotal = pending.reduce((s, p) => s + parseFloat(String(p.amount)), 0);
  const paidTotal = paid.reduce((s, p) => s + parseFloat(String(p.amount)), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-4 border-teal border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          label="Por pagar"
          amount={formatCLP(pendingTotal)}
          subtitle={`${pending.length} pago${pending.length !== 1 ? "s" : ""} pendiente${pending.length !== 1 ? "s" : ""}`}
          icon={CreditCard}
          iconBg="rgba(243,168,161,0.25)"
          iconClassName="text-[#B5604F]"
        />
        <SummaryCard
          label="Pagado este año"
          amount={formatCLP(paidTotal)}
          subtitle={`${paid.length} pago${paid.length !== 1 ? "s" : ""} completado${paid.length !== 1 ? "s" : ""}`}
          icon={TrendingUp}
          iconBg="rgba(123,181,189,0.20)"
          iconClassName="text-[#4A8590]"
        />
        <SummaryCard
          label="Boletas"
          amount={String(paid.length)}
          subtitle="disponibles para reembolso"
          icon={Receipt}
          iconBg="rgba(229,184,71,0.30)"
          iconClassName="text-[#8A6A1F]"
        />
      </div>

      {/* Pending payments */}
      {pending.length > 0 && (
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-line">
            <h3 className="text-[15px] font-bold text-ink">Pendientes</h3>
            <p className="text-[12px] text-ink3 mt-0.5">
              Completá el pago antes de la fecha de vencimiento.
            </p>
          </div>
          <ul className="divide-y divide-line/60">
            {pending.map((payment, idx) => (
              <li key={payment.id} className="px-5 py-4 flex items-center gap-4 flex-wrap">
                <Avatar
                  name={payment.patient_name ?? "P"}
                  childIndex={idx}
                  size={36}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-semibold text-ink truncate">
                    {payment.service_name ?? "Consulta"} — {payment.patient_name}
                  </p>
                  <p className="text-[11.5px] mt-0.5" style={{ color: "#B5604F" }}>
                    Vence {formatDate(payment.created_at)}
                  </p>
                </div>
                <p className="font-display text-[20px] font-bold text-ink shrink-0">
                  {formatCLP(payment.amount)}
                </p>
                <Btn
                  variant="primary"
                  size="sm"
                  icon="CreditCard"
                  onClick={() => navigate(`/portal/pagos/${payment.id}`)}
                >
                  Pagar ahora
                </Btn>
                <button
                  onClick={() => setCancelTarget(payment)}
                  className="w-8 h-8 rounded-[8px] border border-coral/30 bg-coral/5 flex items-center justify-center text-coral hover:bg-coral/10 transition-colors shrink-0"
                  title="Cancelar pago"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Main content: history + sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
        {/* Payment history */}
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-line flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-bold text-ink">Historial de pagos</h3>
              <p className="text-[12px] text-ink3 mt-0.5">Todos tus pagos registrados.</p>
            </div>
            <Btn
              variant="ghost"
              size="sm"
              icon="Download"
              onClick={() => exportCSV(results)}
            >
              Exportar todo
            </Btn>
          </div>

          {results.length === 0 ? (
            <EmptyState
              icon="Receipt"
              title="Sin pagos registrados"
              text="Tus pagos aparecerán aquí una vez que realices una reserva."
            />
          ) : (
            <>
              {/* Column headers */}
              <div className="hidden md:grid grid-cols-[1fr_120px_100px_80px] gap-3 px-5 py-2.5 text-[10.5px] uppercase tracking-wider font-semibold text-ink3 border-b border-line/60">
                <span>Concepto</span>
                <span>Método</span>
                <span className="text-right">Monto</span>
                <span className="text-right">Boleta</span>
              </div>

              <ul className="divide-y divide-line/60">
                {results
                  .filter((p) => p.status === "COMPLETED")
                  .map((payment, idx) => (
                    <li
                      key={payment.id}
                      className="grid grid-cols-1 md:grid-cols-[1fr_120px_100px_80px] gap-3 items-center px-5 py-3.5 hover:bg-bg transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar
                          name={payment.patient_name ?? "P"}
                          childIndex={idx}
                          size={24}
                        />
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-ink truncate">
                            {payment.service_name ?? "Consulta"}
                          </p>
                          <p className="text-[11px] text-ink3">
                            {payment.patient_name} · Pagado {formatDate(payment.paid_at)}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11.5px] text-ink2">
                        {payment.payment_method_display ?? "—"}
                      </span>
                      <span className="text-[13px] font-bold text-ink text-right">
                        {formatCLP(payment.amount)}
                      </span>
                      <span className="text-right">
                        <button
                          onClick={() => navigate(`/portal/pagos/${payment.id}`)}
                          className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-teal-dark hover:underline"
                        >
                          <Download size={12} />
                          PDF
                        </button>
                      </span>
                    </li>
                  ))}
              </ul>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 px-5 py-4 border-t border-line">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className={cn(
                      "w-9 h-9 rounded-[8px] border border-line bg-surface flex items-center justify-center",
                      page === 1 ? "opacity-30 cursor-not-allowed" : "hover:bg-bg"
                    )}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-[12.5px] font-semibold text-ink2">
                    Página {page} de {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className={cn(
                      "w-9 h-9 rounded-[8px] border border-line bg-surface flex items-center justify-center",
                      page === totalPages ? "opacity-30 cursor-not-allowed" : "hover:bg-bg"
                    )}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </Card>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Payment method info */}
          <Card>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-[10px] bg-teal/15 flex items-center justify-center shrink-0">
                <CreditCard size={16} className="text-teal-dark" />
              </div>
              <h4 className="text-[14px] font-bold text-ink">Métodos de pago</h4>
            </div>
            <p className="text-[12px] text-ink2 leading-relaxed">
              Los pagos se procesan de forma segura a través de MercadoPago al momento de reservar.
              Podés pagar con tarjeta de débito, crédito o transferencia.
            </p>
          </Card>

          {/* Billing info */}
          <Card>
            <h4 className="text-[14px] font-bold text-ink mb-2">Facturación</h4>
            <p className="text-[12px] text-ink2 leading-relaxed">
              Los comprobantes se emiten a nombre del titular registrado.
              Si necesitás una boleta o factura para reembolso, podrás
              solicitarla el día de tu atención en la recepción.
            </p>
          </Card>

          {/* Reembolso */}
          <Card>
            <h4 className="text-[14px] font-bold text-ink mb-2">Reembolso isapre</h4>
            <p className="text-[12px] text-ink2 leading-relaxed">
              Podés solicitar reembolso a tu isapre con la boleta que te
              entregamos en la consulta. Presentala directo en tu isapre.
            </p>
          </Card>
        </div>
      </div>
    </div>

    {/* Cancel confirmation modal */}
    {cancelTarget && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
          onClick={() => setCancelTarget(null)}
        />
        <div className="relative bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] p-6 w-full max-w-[380px]">
          <button
            onClick={() => setCancelTarget(null)}
            className="absolute top-4 right-4 text-ink3 hover:text-ink transition-colors"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>

          <div className="h-12 w-12 rounded-full bg-coral/10 flex items-center justify-center mb-4">
            <AlertCircle size={22} className="text-coral" />
          </div>

          <h2 className="font-display text-[20px] font-semibold text-ink mb-2">
            Cancelar este pago?
          </h2>
          <p className="text-[13px] text-ink2 leading-relaxed mb-1">
            <span className="font-semibold text-ink">{cancelTarget.service_name ?? "Consulta"}</span>
            {" — "}{cancelTarget.patient_name}
          </p>
          <p className="text-[13px] text-ink2 leading-relaxed mb-6">
            Se cancelará el pago pendiente y el turno asociado. Esta acción no se puede deshacer.
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => setCancelTarget(null)}
              disabled={cancelMutation.isPending}
              className={cn(
                "flex-1 h-10 rounded-[12px] border border-line text-[13px] font-semibold text-ink2",
                "hover:bg-cream transition-colors disabled:opacity-50"
              )}
            >
              Volver
            </button>
            <button
              onClick={() => cancelMutation.mutate(cancelTarget.appointment)}
              disabled={cancelMutation.isPending}
              className={cn(
                "flex-1 h-10 rounded-[12px] bg-coral text-[13px] font-semibold text-white",
                "hover:opacity-90 transition-opacity disabled:opacity-50"
              )}
            >
              {cancelMutation.isPending ? "Cancelando..." : "Cancelar pago"}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

