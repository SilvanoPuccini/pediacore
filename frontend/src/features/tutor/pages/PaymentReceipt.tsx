import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Download,
  AlertTriangle,
  AlertCircle,
  XCircle,
} from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import type { PaymentDetail } from "@/types/api";

// Lazy-load PaymentBrick only when needed (it pulls in the MP SDK)
import PaymentBrick from "@/features/booking/components/WalletBrick";

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
  return date.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

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

// ─── PDF Download ────────────────────────────────────────────────────────────

async function downloadInvoice(invoiceId: number, invoiceNumber: string): Promise<void> {
  const response = await api.get(`/invoices/${invoiceId}/download/`, {
    responseType: "blob",
  });
  const url = URL.createObjectURL(response.data as Blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${invoiceNumber}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Loading ─────────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="max-w-2xl mx-auto p-6 animate-pulse space-y-4">
      <div className="h-4 w-32 bg-cream rounded-full" />
      <div className="bg-surface rounded-[20px] border border-line p-8 space-y-4">
        <div className="h-6 w-48 bg-cream rounded-full" />
        <div className="h-4 w-64 bg-cream rounded-full" />
        <div className="h-4 w-56 bg-cream rounded-full" />
        <div className="h-32 bg-cream rounded-xl" />
        <div className="h-20 bg-cream rounded-xl" />
      </div>
    </div>
  );
}

// ─── Pending Payment View ────────────────────────────────────────────────────

function PendingPaymentView({ payment }: { payment: PaymentDetail }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [paymentApproved, setPaymentApproved] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  const amount = parseFloat(payment.amount);

  if (paymentApproved) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-green-50 border border-green-200 rounded-[16px] px-6 py-8 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="font-display text-[20px] font-semibold text-ink mb-1">
            Pago confirmado
          </h2>
          <p className="text-[14px] text-ink2">
            Tu pago fue procesado correctamente.
          </p>
          <button
            onClick={() => navigate("/portal/pagos")}
            className="mt-4 text-[13px] text-teal-dark font-semibold hover:underline"
          >
            Volver a pagos
          </button>
        </div>
      </div>
    );
  }

  if (payment.payment_method !== "MERCADOPAGO") {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Link
          to="/portal/pagos"
          className="inline-flex items-center gap-1.5 text-[13px] text-ink3 hover:text-ink transition-colors mb-6"
        >
          <ArrowLeft size={14} />
          Volver a pagos
        </Link>
        <div className="bg-amber-50 border border-amber-200 rounded-[20px] p-8 text-center shadow-[var(--shadow-soft)]">
          <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-3" />
          <p className="text-[14px] text-amber-700 font-semibold mb-1">
            Pago pendiente — {payment.payment_method_display}
          </p>
          <p className="text-[12px] text-ink3 mt-2 leading-relaxed">
            Este pago requiere confirmación manual.
            <br />
            Comunicate con la consulta para completar el proceso.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Link
        to="/portal/pagos"
        className="inline-flex items-center gap-1.5 text-[13px] text-ink3 hover:text-ink transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Volver a pagos
      </Link>

      <div className="space-y-5">
        {/* Payment summary */}
        <div className="bg-surface border border-line rounded-[16px] p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-[18px] font-semibold text-ink">
              Completar pago
            </h2>
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Pendiente
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-[13px]">
            <div>
              <p className="text-ink3 text-[11px] font-medium">Servicio</p>
              <p className="text-ink font-semibold">{payment.service_name ?? "Consulta"}</p>
            </div>
            <div>
              <p className="text-ink3 text-[11px] font-medium">Paciente</p>
              <p className="text-ink font-semibold">{payment.patient_name}</p>
            </div>
            <div>
              <p className="text-ink3 text-[11px] font-medium">Fecha</p>
              <p className="text-ink font-semibold">{formatScheduledDate(payment.scheduled_date)}</p>
            </div>
            <div>
              <p className="text-ink3 text-[11px] font-medium">Monto</p>
              <p className="text-ink font-bold text-[16px]">{formatCLP(payment.amount)}</p>
            </div>
          </div>
        </div>

        {/* Card error */}
        {cardError && (
          <div className="bg-coral/10 border border-coral/30 rounded-[12px] px-4 py-3">
            <p className="text-[13px] text-ink font-semibold">
              No se pudo procesar el pago
            </p>
            <p className="text-[12px] text-ink2 mt-0.5">{cardError}</p>
          </div>
        )}

        {/* Card payment form */}
        {amount > 0 ? (
          <PaymentBrick
            paymentId={payment.id}
            amount={amount}
            payerEmail={user?.email ?? payment.paid_by_email ?? ""}
            onApproved={() => {
              setPaymentApproved(true);
              queryClient.invalidateQueries({ queryKey: ["payments"] });
              queryClient.invalidateQueries({ queryKey: ["appointments"] });
            }}
            onError={(msg) => setCardError(msg)}
          />
        ) : (
          <div className="bg-coral/10 border border-coral/30 rounded-[12px] px-4 py-3 text-center">
            <p className="text-[13px] text-ink font-semibold">
              No se pudo cargar el método de pago
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Failed Payment View ─────────────────────────────────────────────────────

function FailedPaymentView(_props: { payment: PaymentDetail }) {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <Link
        to="/portal/pagos"
        className="inline-flex items-center gap-1.5 text-[13px] text-ink3 hover:text-ink transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Volver a pagos
      </Link>
      <div className="bg-surface border border-line rounded-[20px] p-8 text-center shadow-[var(--shadow-soft)]">
        <XCircle className="w-8 h-8 text-coral mx-auto mb-3" />
        <p className="text-[14px] text-coral font-semibold mb-1">
          Pago fallido
        </p>
        <p className="text-[12px] text-ink3 mt-2 leading-relaxed">
          Este pago no pudo ser procesado.
          <br />
          Si necesitás asistencia, comunicate con la consulta.
        </p>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PaymentReceipt() {
  const { id } = useParams<{ id: string }>();
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: payment, isLoading, isError } = useQuery({
    queryKey: ["payments", id],
    queryFn: () =>
      api.get<PaymentDetail>(`/payments/${id}/`).then((r) => r.data),
    enabled: !!id,
  });

  if (isLoading) return <LoadingSkeleton />;

  if (isError || !payment) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Link
          to="/portal/pagos"
          className="inline-flex items-center gap-1.5 text-[13px] text-ink3 hover:text-ink transition-colors mb-6"
        >
          <ArrowLeft size={14} />
          Volver a pagos
        </Link>
        <div className="bg-surface border border-line rounded-[20px] p-8 text-center shadow-[var(--shadow-soft)]">
          <AlertCircle className="w-8 h-8 text-coral mx-auto mb-3" />
          <p className="text-[14px] text-coral font-semibold mb-1">
            No se pudo cargar el comprobante
          </p>
          <p className="text-[12px] text-ink3">
            Intentá recargar la página. Si el problema persiste, contactanos.
          </p>
        </div>
      </div>
    );
  }

  // ── Route by payment status ──────────────────────────────────────────────
  if (payment.status === "PENDING") {
    return <PendingPaymentView payment={payment} />;
  }

  if (payment.status === "FAILED") {
    return <FailedPaymentView payment={payment} />;
  }

  // ── Receipt view (COMPLETED / REFUNDED / PROCESSING) ────────────────────
  const displayDate = payment.paid_at ?? payment.created_at;
  const statusLabel = PAYMENT_STATUS_LABELS[payment.status] ?? payment.status;
  const statusStyle = STATUS_STYLES[payment.status] ?? STATUS_STYLES.REFUNDED;

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Back */}
      <Link
        to="/portal/pagos"
        className="inline-flex items-center gap-1.5 text-[13px] text-ink3 hover:text-ink transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Volver a pagos
      </Link>

      {/* Receipt document */}
      <div className="bg-white rounded-[20px] border border-line shadow-[var(--shadow-soft)] overflow-hidden">
        {/* Warning banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center gap-2.5">
          <AlertTriangle size={16} className="text-amber-600 shrink-0" />
          <p className="text-[12px] text-amber-700 font-medium">
            Este documento es un comprobante interno de pago. No constituye boleta ni factura tributaria.
          </p>
        </div>

        <div className="p-6 sm:p-8">
          {/* Header: practice info + receipt number */}
          <div className="flex items-start justify-between gap-4 pb-5 mb-5 border-b-2 border-teal-dark">
            <div>
              <h1 className="font-display text-[22px] font-bold text-teal-dark">
                Dra. Estefanía Ortigosa
              </h1>
              <p className="text-[12px] text-ink3 mt-0.5">
                Pediatría — Pucón &amp; Villarrica
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="bg-cream border border-line rounded-lg px-4 py-2.5">
                <p className="text-[10px] uppercase tracking-widest text-ink3 font-bold mb-0.5">
                  Comprobante
                </p>
                <p className="text-[14px] font-bold text-ink font-mono">
                  {payment.invoice_number ?? `P-${payment.id}`}
                </p>
              </div>
              <p className="text-[11px] text-ink3 mt-1.5">
                {formatDate(displayDate)}
              </p>
            </div>
          </div>

          {/* Payer data grid */}
          <div className="mb-6">
            <p className="text-[10px] uppercase tracking-widest text-ink3 font-bold mb-3 pb-1.5 border-b border-line">
              Datos del pagador
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <div>
                <p className="text-[11px] text-ink3 font-medium">Responsable</p>
                <p className="text-[13px] text-ink font-semibold">
                  {payment.paid_by_name ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-ink3 font-medium">RUT titular</p>
                <p className="text-[13px] text-ink font-semibold">
                  {payment.patient_rut || "No registrado"}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-ink3 font-medium">Paciente</p>
                <p className="text-[13px] text-ink font-semibold">
                  {payment.patient_name}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-ink3 font-medium">Email</p>
                <p className="text-[13px] text-ink font-semibold">
                  {payment.paid_by_email ?? "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Service detail table */}
          <div className="mb-6">
            <p className="text-[10px] uppercase tracking-widest text-ink3 font-bold mb-3 pb-1.5 border-b border-line">
              Detalle del servicio
            </p>
            <div className="border border-line rounded-xl overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-12 bg-teal-dark text-white text-[11px] font-semibold px-4 py-2.5">
                <div className="col-span-5">Descripcion</div>
                <div className="col-span-2 text-center">Fecha</div>
                <div className="col-span-2 text-center">Duracion</div>
                <div className="col-span-1 text-center">Cant.</div>
                <div className="col-span-2 text-right">Valor</div>
              </div>
              {/* Table row */}
              <div className="grid grid-cols-12 px-4 py-3 text-[13px] text-ink border-b border-line last:border-0">
                <div className="col-span-5 font-medium">
                  {payment.service_name ?? "Consulta"}
                  {payment.is_online && (
                    <span className="ml-1.5 text-[10px] text-teal-dark font-semibold">(Online)</span>
                  )}
                </div>
                <div className="col-span-2 text-center text-ink2">
                  {formatScheduledDate(payment.scheduled_date)}
                </div>
                <div className="col-span-2 text-center text-ink2">
                  {payment.duration_minutes ? `${payment.duration_minutes} min` : "—"}
                </div>
                <div className="col-span-1 text-center text-ink2">1</div>
                <div className="col-span-2 text-right font-semibold">
                  {formatCLP(payment.amount)}
                </div>
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-6">
            <div className="w-64 border border-line rounded-xl overflow-hidden">
              <div className="flex justify-between px-4 py-2 text-[12px] text-ink2 border-b border-line">
                <span>Bruto</span>
                <span className="font-medium">{formatCLP(payment.amount)}</span>
              </div>
              <div className="flex justify-between px-4 py-2 text-[12px] text-ink2 border-b border-line">
                <span>Retención (13%)</span>
                <span className="font-medium">—</span>
              </div>
              <div className="flex justify-between px-4 py-2.5 bg-teal-dark text-white text-[13px] font-bold">
                <span>Total pagado</span>
                <span>{formatCLP(payment.amount)}</span>
              </div>
            </div>
          </div>

          {/* Payment status + transaction */}
          <div className="flex items-center justify-between p-4 bg-cream/50 border border-line rounded-xl mb-6">
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-ink3 font-semibold uppercase tracking-wide">
                Estado
              </span>
              <span
                className={cn(
                  "text-[11px] font-bold px-3 py-1 rounded-full",
                  statusStyle
                )}
              >
                {statusLabel}
              </span>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-ink3 uppercase tracking-wide font-semibold">
                Método
              </p>
              <p className="text-[12px] text-ink font-medium">
                {payment.payment_method_display}
              </p>
            </div>
            {payment.external_id && (
              <div className="text-right">
                <p className="text-[10px] text-ink3 uppercase tracking-wide font-semibold">
                  Transacción
                </p>
                <p className="text-[12px] text-ink font-mono font-medium">
                  #{payment.external_id}
                </p>
              </div>
            )}
          </div>

          {/* Location info */}
          {(payment.location_name || payment.is_online) && (
            <div className="flex items-center gap-2 p-3 bg-cream/30 border border-line rounded-xl mb-6 text-[12px] text-ink2">
              <span className="font-semibold text-ink3">Lugar:</span>
              <span className="font-medium">
                {payment.is_online ? "Consulta online" : payment.location_name}
              </span>
              {payment.start_time && (
                <>
                  <span className="text-ink3">·</span>
                  <span className="font-medium">{payment.start_time}</span>
                </>
              )}
            </div>
          )}

          {/* PDF download */}
          {payment.has_invoice && payment.invoice_id && (
            <button
              onClick={async () => {
                setIsDownloading(true);
                try {
                  await downloadInvoice(
                    payment.invoice_id!,
                    payment.invoice_number ?? `comprobante-${payment.id}`
                  );
                } finally {
                  setIsDownloading(false);
                }
              }}
              disabled={isDownloading}
              className={cn(
                "w-full flex items-center justify-center gap-2 rounded-[12px] px-4 py-3 mb-4",
                "bg-teal-dark text-white text-[13px] font-semibold",
                "hover:opacity-90 active:opacity-75 transition-opacity disabled:opacity-50"
              )}
            >
              <Download size={15} />
              {isDownloading ? "Descargando..." : "Descargar comprobante PDF"}
            </button>
          )}

          {/* Legal footer */}
          <div className="pt-4 border-t border-line text-center">
            <p className="text-[10px] text-ink3 leading-relaxed">
              Dra. Estefanía Ortigosa — Consulta Pediátrica
              <br />
              Este documento es un comprobante de pago interno y NO constituye boleta tributaria.
              <br />
              Generado por PEDIACORE — Sistema de Gestión de Consultorios Pediátricos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
