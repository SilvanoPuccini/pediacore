import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Receipt,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CalendarDays,
  Clock,
  Stethoscope,
  User,
  MapPin,
  Wifi,
  Download,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import type { PaymentListItem, InvoiceListItem, PaginatedResponse } from "@/types/api";

// ─── Status labels (Spanish) ─────────────────────────────────────────────────

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  COMPLETED: "Completado",
  PENDING: "Pendiente",
  PROCESSING: "Procesando",
  FAILED: "Fallido",
  REFUNDED: "Reembolsado",
};

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: "bg-teal/10 text-teal-dark border border-teal/30",
  PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
  PROCESSING: "bg-blue-50 text-blue-600 border border-blue-200",
  FAILED: "bg-coral/10 text-coral border border-coral/30",
  REFUNDED: "bg-[var(--line)] text-ink3 border border-line",
};

function statusLabel(status: string): string {
  return PAYMENT_STATUS_LABELS[status] ?? status;
}

function statusClass(status: string): string {
  return STATUS_STYLES[status] ?? STATUS_STYLES["REFUNDED"];
}

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

function formatScheduledDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  const formatted = new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Santiago",
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

// ─── API calls ───────────────────────────────────────────────────────────────

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

// ─── Detail row ──────────────────────────────────────────────────────────────

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-dashed border-line/60 last:border-0">
      <div className="h-7 w-7 rounded-lg bg-cream flex items-center justify-center shrink-0">
        <Icon size={13} className="text-teal-dark" />
      </div>
      <p className="text-[12px] text-ink3 font-medium w-20 shrink-0">{label}</p>
      <p className="text-[14px] text-ink font-medium flex-1 text-right">{value}</p>
    </div>
  );
}

// ─── Payment card ────────────────────────────────────────────────────────────

function PaymentCard({
  payment,
  invoice,
}: {
  payment: PaymentListItem;
  invoice?: InvoiceListItem;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const displayDate = payment.paid_at ?? payment.created_at;

  return (
    <div className="bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] overflow-hidden">
      {/* Clickable header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-5 text-left hover:bg-cream/30 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <p className="text-[15px] font-semibold text-ink truncate">
              {payment.patient_name}
            </p>
            <p className="text-[13px] text-ink3">
              {payment.payment_method_display}
            </p>
            <p className="text-[13px] text-ink3">{formatDate(displayDate)}</p>
          </div>

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
              {statusLabel(payment.status)}
            </span>
          </div>
        </div>

        {/* Expand indicator */}
        <div className="flex items-center justify-center mt-3">
          <ChevronDown
            size={16}
            className={cn(
              "text-ink3 transition-transform duration-200",
              expanded && "rotate-180"
            )}
          />
        </div>
      </button>

      {/* Expandable detail */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-line">
          {/* Amount highlight */}
          <div className="my-4 p-4 border border-line rounded-xl text-center">
            <p className="text-[11px] uppercase tracking-widest text-ink3 font-bold mb-1">
              Total pagado
            </p>
            <p className="font-display text-[28px] font-bold text-ink">
              {formatCLP(payment.amount)}
            </p>
          </div>

          {/* Structured detail rows */}
          <div className="mb-4">
            <p className="text-[11px] uppercase tracking-widest text-ink3 font-bold mb-2 pb-1 border-b border-line">
              Detalles del servicio
            </p>

            <DetailRow
              icon={User}
              label="Paciente"
              value={payment.patient_name}
            />
            {payment.service_name && (
              <DetailRow
                icon={Stethoscope}
                label="Servicio"
                value={payment.service_name}
              />
            )}
            {payment.scheduled_date && (
              <DetailRow
                icon={CalendarDays}
                label="Fecha"
                value={formatScheduledDate(payment.scheduled_date)}
              />
            )}
            {payment.start_time && (
              <DetailRow
                icon={Clock}
                label="Hora"
                value={payment.start_time}
              />
            )}
            <DetailRow
              icon={payment.is_online ? Wifi : MapPin}
              label="Lugar"
              value={
                payment.is_online
                  ? "Consulta online"
                  : payment.location_name ?? "—"
              }
            />
            <DetailRow
              icon={CreditCard}
              label="Método"
              value={payment.payment_method_display}
            />
          </div>

          {/* PDF download */}
          {invoice && (
            <button
              onClick={async () => {
                setIsDownloading(true);
                try {
                  await downloadInvoice(invoice.id);
                } finally {
                  setIsDownloading(false);
                }
              }}
              disabled={isDownloading}
              className={cn(
                "w-full flex items-center justify-center gap-2 rounded-[12px] px-4 py-3",
                "bg-teal-dark text-cream text-[13px] font-semibold",
                "hover:opacity-90 active:opacity-75 transition-opacity disabled:opacity-50"
              )}
            >
              <Download size={15} />
              {isDownloading ? "Descargando..." : "Descargar comprobante PDF"}
            </button>
          )}

          {/* Disclaimer */}
          <p className="text-[11px] text-ink3 text-center mt-3">
            Este es un comprobante de pago interno, no constituye boleta ni
            factura tributaria.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 5;

export default function BillingHistory() {
  const [page, setPage] = useState(1);

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

  const invoiceMap = new Map<number, InvoiceListItem>();
  invoices?.forEach((inv) => invoiceMap.set(inv.payment, inv));

  if (loadingPayments) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-4 border-teal border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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

      <div className="space-y-4">
        {paginated.map((payment) => (
          <PaymentCard
            key={payment.id}
            payment={payment}
            invoice={invoiceMap.get(payment.id)}
          />
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
