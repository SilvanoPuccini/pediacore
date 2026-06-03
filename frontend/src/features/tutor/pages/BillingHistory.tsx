import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Receipt,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronRight as ChevronNav,
} from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import type { PaymentListItem, PaginatedResponse } from "@/types/api";

// ─── Status labels (Spanish) ─────────────────────────────────────────────────

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  COMPLETED: "Pagado",
  PENDING: "Pendiente",
  PROCESSING: "Procesando",
  FAILED: "Fallido",
  REFUNDED: "Reembolsado",
};

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: "bg-green-50 text-green-700 border border-green-200",
  PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
  PROCESSING: "bg-blue-50 text-blue-600 border border-blue-200",
  FAILED: "bg-coral/10 text-coral border border-coral/30",
  REFUNDED: "bg-gray-100 text-gray-500 border border-gray-200",
};

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

// ─── API ─────────────────────────────────────────────────────────────────────

async function fetchPayments(): Promise<PaymentListItem[]> {
  const { data } = await api.get<PaginatedResponse<PaymentListItem>>("/payments/");
  return data.results;
}

// ─── Payment card ────────────────────────────────────────────────────────────

function PaymentCard({ payment }: { payment: PaymentListItem }) {
  const displayDate = payment.paid_at ?? payment.created_at;
  const statusLabel = PAYMENT_STATUS_LABELS[payment.status] ?? payment.status;
  const statusStyle = STATUS_STYLES[payment.status] ?? STATUS_STYLES.REFUNDED;

  return (
    <Link
      to={`/portal/pagos/${payment.id}`}
      className="group block bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] p-5 hover:border-teal/40 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <p className="text-[15px] font-semibold text-ink truncate">
            {payment.patient_name}
          </p>
          <p className="text-[13px] text-ink3">
            {payment.service_name ?? "Consulta"}
          </p>
          <p className="text-[13px] text-ink3">{formatDate(displayDate)}</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex flex-col items-end gap-2">
            <p className="text-[16px] font-semibold text-ink">
              {formatCLP(payment.amount)}
            </p>
            <span
              className={cn(
                "text-[11px] font-semibold px-2.5 py-1 rounded-full",
                statusStyle
              )}
            >
              {statusLabel}
            </span>
          </div>
          <ChevronNav
            size={16}
            className="text-ink3 group-hover:text-teal-dark transition-colors"
          />
        </div>
      </div>
    </Link>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 5;

export default function BillingHistory() {
  const [page, setPage] = useState(1);

  const {
    data: payments,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["payments"],
    queryFn: fetchPayments,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-4 border-teal border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] p-6 flex items-center gap-3 text-coral">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-[14px]">No se pudo cargar el historial de pagos.</p>
        </div>
      </div>
    );
  }

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

  const totalPages = Math.ceil(payments.length / PAGE_SIZE);
  const paginated = payments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="font-display text-[28px] text-ink">Historial de pagos</h1>

      <div className="space-y-3">
        {paginated.map((payment) => (
          <PaymentCard key={payment.id} payment={payment} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className={cn(
              "flex items-center justify-center w-9 h-9 rounded-[12px] border border-line",
              "bg-surface text-ink transition-opacity",
              page === 1 ? "opacity-30 cursor-not-allowed" : "hover:opacity-70"
            )}
            aria-label="Página anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-[13px] font-semibold text-ink2">
            Página {page} de {totalPages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className={cn(
              "flex items-center justify-center w-9 h-9 rounded-[12px] border border-line",
              "bg-surface text-ink transition-opacity",
              page === totalPages
                ? "opacity-30 cursor-not-allowed"
                : "hover:opacity-70"
            )}
            aria-label="Página siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
