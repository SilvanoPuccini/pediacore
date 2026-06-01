import { useQuery } from "@tanstack/react-query";
import { Download, Receipt, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import type { PaymentListItem, InvoiceListItem, PaginatedResponse } from "@/types/api";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCLP(amount: string): string {
  const numeric = parseFloat(amount);
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(numeric);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

type StatusKey = "COMPLETED" | "PENDING" | "FAILED" | "REFUNDED";

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: "bg-teal/10 text-teal-dark border border-teal/30",
  PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
  FAILED: "bg-coral/10 text-coral border border-coral/30",
  REFUNDED: "bg-[var(--line)] text-ink3 border border-line",
};

function statusClass(status: string): string {
  return STATUS_STYLES[status as StatusKey] ?? STATUS_STYLES["REFUNDED"];
}

// ─── API calls ────────────────────────────────────────────────────────────────

async function fetchPayments(): Promise<PaymentListItem[]> {
  const { data } = await api.get<PaginatedResponse<PaymentListItem>>("/payments/");
  return data.results;
}

async function fetchInvoices(): Promise<InvoiceListItem[]> {
  const { data } = await api.get<PaginatedResponse<InvoiceListItem>>("/invoices/");
  return data.results;
}

async function downloadInvoice(invoiceId: number): Promise<void> {
  const response = await api.get(`/invoices/${invoiceId}/download/`, {
    responseType: "blob",
  });
  const url = URL.createObjectURL(response.data as Blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `comprobante-${invoiceId}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BillingHistory() {
  const {
    data: payments,
    isLoading: loadingPayments,
    isError: errorPayments,
  } = useQuery({
    queryKey: ["payments"],
    queryFn: fetchPayments,
  });

  const { data: invoices } = useQuery({
    queryKey: ["invoices"],
    queryFn: fetchInvoices,
  });

  // Build a map of payment_id → invoice for O(1) lookup
  const invoiceMap = new Map<number, InvoiceListItem>();
  invoices?.forEach((inv) => invoiceMap.set(inv.payment, inv));

  // ─── Loading ─────────────────────────────────────────────────────────────
  if (loadingPayments) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-4 border-teal border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ─── Error ───────────────────────────────────────────────────────────────
  if (errorPayments) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] p-6 flex items-center gap-3 text-coral">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-[14px]">No se pudo cargar el historial de pagos.</p>
        </div>
      </div>
    );
  }

  // ─── Empty state ─────────────────────────────────────────────────────────
  if (!payments || payments.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="font-display text-[28px] text-ink mb-6">Historial de pagos</h1>
        <div className="bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] p-10 flex flex-col items-center gap-3 text-center">
          <Receipt className="w-10 h-10 text-ink3" />
          <p className="text-[15px] font-semibold text-ink">Sin pagos registrados</p>
          <p className="text-[13px] text-ink3">
            Tus pagos aparecerán aquí una vez que realices una reserva.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="font-display text-[28px] text-ink">Historial de pagos</h1>

      <div className="space-y-4">
        {payments.map((payment) => {
          const invoice = invoiceMap.get(payment.id);
          const displayDate = payment.paid_at ?? payment.created_at;

          return (
            <div
              key={payment.id}
              className="bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] p-5"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left: patient + method + date */}
                <div className="space-y-1 min-w-0">
                  <p className="text-[15px] font-semibold text-ink truncate">
                    {payment.patient_name}
                  </p>
                  <p className="text-[13px] text-ink3">
                    {payment.payment_method_display}
                  </p>
                  <p className="text-[12px] text-ink3">{formatDate(displayDate)}</p>
                </div>

                {/* Right: amount + status */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <p className="text-[16px] font-semibold text-ink">
                    {formatCLP(payment.amount)}
                  </p>
                  <span
                    className={cn(
                      "text-[11px] font-semibold px-2.5 py-1 rounded-full",
                      statusClass(payment.status)
                    )}
                  >
                    {payment.status_display}
                  </span>
                </div>
              </div>

              {/* Download button — only when invoice exists */}
              {invoice && invoice.has_pdf && (
                <div className="mt-4 pt-4 border-t border-line">
                  <button
                    onClick={() => downloadInvoice(invoice.id)}
                    className="flex items-center gap-2 text-[13px] font-semibold text-teal-dark hover:opacity-75 transition-opacity"
                  >
                    <Download className="w-4 h-4" />
                    Descargar comprobante
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
