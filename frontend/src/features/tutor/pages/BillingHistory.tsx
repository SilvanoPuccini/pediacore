import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CreditCard,
  TrendingUp,
  Receipt,
  Download,
  Plus,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { Card, Btn, EmptyState, Avatar, clp, childPalette } from "@/features/tutor/components/portal-ui";
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
  iconColor,
}: {
  label: string;
  amount: string;
  subtitle: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <Card className="flex items-start justify-between">
      <div>
        <p className="text-[10.5px] uppercase tracking-[0.14em] font-semibold" style={{ color: iconColor }}>
          {label}
        </p>
        <p className="font-display text-[28px] font-bold text-ink mt-1">{amount}</p>
        <p className="text-[11.5px] text-ink2 mt-0.5">{subtitle}</p>
      </div>
      <div
        className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
        style={{ backgroundColor: iconBg }}
      >
        <Icon size={18} className="shrink-0" style={{ color: iconColor }} />
      </div>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BillingHistory() {
  const [page, setPage] = useState(1);

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
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          label="Por pagar"
          amount={formatCLP(pendingTotal)}
          subtitle={`${pending.length} pago${pending.length !== 1 ? "s" : ""} pendiente${pending.length !== 1 ? "s" : ""}`}
          icon={CreditCard}
          iconBg="rgba(243,168,161,0.25)"
          iconColor="#B5604F"
        />
        <SummaryCard
          label="Pagado este año"
          amount={formatCLP(paidTotal)}
          subtitle={`${paid.length} pago${paid.length !== 1 ? "s" : ""} completado${paid.length !== 1 ? "s" : ""}`}
          icon={TrendingUp}
          iconBg="rgba(123,181,189,0.20)"
          iconColor="#4A8590"
        />
        <SummaryCard
          label="Boletas"
          amount={String(paid.length)}
          subtitle="disponibles para reembolso"
          icon={Receipt}
          iconBg="rgba(229,184,71,0.30)"
          iconColor="#8A6A1F"
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
                <Btn variant="primary" size="sm" icon="CreditCard">
                  Pagar ahora
                </Btn>
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
            <Btn variant="ghost" size="sm" icon="Download">
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
                        <button className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-teal-dark hover:underline">
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
          {/* Saved payment methods */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[14px] font-bold text-ink">Métodos de pago</h4>
              <button className="inline-flex items-center gap-1 text-[12px] font-semibold text-teal-dark hover:underline">
                <Plus size={12} />
                Agregar
              </button>
            </div>
            <p className="text-[12px] text-ink3 mb-4">
              Tus métodos de pago guardados para futuras consultas.
            </p>
            <div className="space-y-3">
              <PayMethodCard brand="Visa" last4="4421" expiry="12/27" isDefault />
              <PayMethodCard brand="Mastercard" last4="7702" expiry="08/26" />
            </div>
          </Card>

          {/* Billing info */}
          <Card>
            <h4 className="text-[14px] font-bold text-ink mb-2">Facturación</h4>
            <p className="text-[12px] text-ink2">
              Los comprobantes se emiten a nombre del titular registrado.
            </p>
            <Btn variant="ghost" size="sm" className="mt-3" icon="Pencil">
              Cambiar datos de facturación
            </Btn>
          </Card>

          {/* Reembolso */}
          <Card>
            <h4 className="text-[14px] font-bold text-ink mb-2">Reembolso isapre</h4>
            <p className="text-[12px] text-ink2">
              Podés solicitar reembolso a tu isapre con la boleta PDF que emitimos por cada consulta.
            </p>
            <Btn variant="soft" size="sm" className="mt-3" icon="HelpCircle">
              ¿Cómo lo hago?
            </Btn>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Payment method card ──────────────────────────────────────────────────────

function PayMethodCard({
  brand,
  last4,
  expiry,
  isDefault = false,
}: {
  brand: string;
  last4: string;
  expiry: string;
  isDefault?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-3.5 rounded-[12px] border border-line bg-surface">
      <div className="w-10 h-10 rounded-[10px] bg-teal/15 flex items-center justify-center shrink-0">
        <CreditCard size={18} className="text-teal-dark" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-ink">
            {brand} ●●●● {last4}
          </span>
          {isDefault && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal/20 text-teal-dark">
              Predeterminada
            </span>
          )}
        </div>
        <span className="text-[11px] text-ink3">Vence {expiry}</span>
      </div>
      {!isDefault && (
        <Btn variant="quiet" size="sm">
          Usar
        </Btn>
      )}
      <button className="p-1.5 rounded-[8px] text-ink3 hover:text-[#A85050] hover:bg-destructive/10 transition-colors">
        <Trash2 size={14} />
      </button>
    </div>
  );
}
