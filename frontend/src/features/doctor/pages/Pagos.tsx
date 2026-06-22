import { useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CreditCard,
  AlertCircle,
  TrendingUp,
  Clock,
  CheckCircle,
  X,
  User,
  Calendar,
  MapPin,
  FileText,
  Receipt,
  Banknote,
  ExternalLink,
} from "lucide-react";
import api from "@/lib/api";
import type { PaymentListItem, PaymentDetail, PaginatedResponse } from "@/types/api";

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

// ─── MP helpers ───────────────────────────────────────────────────────────────

const MP_REJECTION_LABELS: Record<string, string> = {
  cc_rejected_insufficient_amount:     "Fondos insuficientes",
  cc_rejected_bad_filled_security_code: "Código de seguridad incorrecto",
  cc_rejected_bad_filled_date:         "Fecha de vencimiento incorrecta",
  cc_rejected_bad_filled_other:        "Datos de tarjeta incorrectos",
  cc_rejected_call_for_authorize:      "Requiere autorización del banco",
  cc_rejected_card_disabled:           "Tarjeta deshabilitada",
  cc_rejected_duplicated_payment:      "Pago duplicado",
  cc_rejected_high_risk:               "Rechazado por seguridad",
  cc_rejected_max_attempts:            "Máximo de intentos alcanzado",
};

const MP_PAYMENT_TYPE_LABELS: Record<string, string> = {
  credit_card:  "Tarjeta de crédito",
  debit_card:   "Tarjeta de débito",
  account_money: "Dinero en cuenta",
};

function getMpDetails(metadata: Record<string, unknown> | null) {
  if (!metadata) return null;
  const mp = metadata.mp_details as Record<string, unknown> | undefined;
  if (!mp) return null;
  return mp;
}

// ─── section heading ──────────────────────────────────────────────────────────

function SectionHeading({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={14} className="text-ink3" />
      <span className="text-[11px] font-semibold text-ink3 uppercase tracking-wider">{title}</span>
    </div>
  );
}

// ─── detail row ───────────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "" || value === "—") return null;
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-line/50 last:border-0">
      <span className="text-[12px] text-ink3 shrink-0">{label}</span>
      <span className="text-[13px] text-ink text-right">{value}</span>
    </div>
  );
}

// ─── payment detail modal ─────────────────────────────────────────────────────

function PaymentDetailModal({
  paymentId,
  onClose,
}: {
  paymentId: number;
  onClose: () => void;
}) {
  const { data: payment, isLoading, isError } = useQuery<PaymentDetail>({
    queryKey: ["payment-detail", paymentId],
    queryFn: async () => {
      const { data } = await api.get<PaymentDetail>(`/payments/${paymentId}/`);
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const mpDetails = payment ? getMpDetails(payment.metadata) : null;
  const isMp = payment?.payment_method === "MERCADOPAGO";
  const isTransfer = payment?.payment_method === "TRANSFER";

  // Card info from mp_details
  const card = mpDetails?.card as Record<string, unknown> | undefined;
  const lastFour = card?.last_four_digits as string | undefined;
  const cardHolder = card?.cardholder as Record<string, unknown> | undefined;
  const cardName = cardHolder?.name as string | undefined;
  const paymentMethodId = mpDetails?.payment_method_id as string | undefined;
  const paymentTypeId = mpDetails?.payment_type_id as string | undefined;
  const installments = mpDetails?.installments as number | undefined;
  const statusDetail = mpDetails?.status_detail as string | undefined;
  const ocrResult = payment?.metadata?.ocr_result as string | undefined;

  const rejectionLabel = statusDetail
    ? (MP_REJECTION_LABELS[statusDetail] ?? statusDetail)
    : null;

  const paymentTypeLabel = paymentTypeId
    ? (MP_PAYMENT_TYPE_LABELS[paymentTypeId] ?? paymentTypeId)
    : null;

  const cardDisplay = lastFour ? `****${lastFour}` : null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: "rgba(0,0,0,0.35)" }}
      onClick={onClose}
    >
      {/* Slide-over panel */}
      <div
        className="relative w-full max-w-[460px] h-full bg-surface shadow-2xl flex flex-col overflow-hidden"
        style={{ animation: "slideInRight 0.22s ease-out" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Panel header */}
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-line shrink-0">
          <div className="min-w-0">
            {isLoading ? (
              <div className="h-5 w-36 bg-line/60 rounded animate-pulse" />
            ) : payment ? (
              <>
                <h2 className="text-[17px] font-bold text-ink truncate leading-tight">
                  {payment.patient_name}
                </h2>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <StatusChip status={payment.status} label={payment.status_display} />
                  <span className="text-[11px] text-ink3">#{payment.id}</span>
                  <span className="text-[11px] text-ink3">·</span>
                  <span className="text-[11px] text-ink3">{formatDate(payment.created_at)}</span>
                </div>
              </>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg text-ink3 hover:bg-bg hover:text-ink transition-colors"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <div className="h-5 w-5 rounded-full border-2 border-line border-t-teal animate-spin" />
            </div>
          )}

          {isError && (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-ink3">
              <AlertCircle size={24} className="opacity-40" />
              <p className="text-[13px]">Error al cargar el detalle</p>
            </div>
          )}

          {payment && (
            <>
              {/* ── 1. Appointment info ── */}
              <section>
                <SectionHeading icon={Calendar} title="Cita" />
                <div className="bg-bg rounded-[10px] px-4 py-1">
                  <DetailRow label="Servicio" value={payment.service_name ?? "—"} />
                  <DetailRow
                    label="Fecha"
                    value={
                      payment.appointment_date
                        ? formatDate(payment.appointment_date)
                        : "—"
                    }
                  />
                  <DetailRow
                    label="Duración"
                    value={
                      payment.duration_minutes
                        ? `${payment.duration_minutes} min`
                        : null
                    }
                  />
                  <DetailRow
                    label="Sede"
                    value={
                      <span className="flex items-center gap-1 justify-end">
                        <MapPin size={11} className="text-ink3 shrink-0" />
                        {payment.location_name ?? "Consulta Online"}
                      </span>
                    }
                  />
                </div>
              </section>

              {/* ── 2. Patient / payer ── */}
              <section>
                <SectionHeading icon={User} title="Paciente y pagador" />
                <div className="bg-bg rounded-[10px] px-4 py-1">
                  <DetailRow label="RUT paciente" value={payment.patient_rut} />
                  <DetailRow
                    label="Pagador"
                    value={
                      payment.paid_by_name
                        ? `${payment.paid_by_name}${payment.paid_by_email ? ` · ${payment.paid_by_email}` : ""}`
                        : payment.paid_by_email ?? null
                    }
                  />
                </div>
              </section>

              {/* ── 3. Financial details ── */}
              <section>
                <SectionHeading icon={Banknote} title="Detalle del pago" />
                <div className="bg-bg rounded-[10px] px-4 py-1">
                  <DetailRow label="Monto" value={formatCLP(payment.amount)} />
                  <DetailRow label="Moneda" value={payment.currency} />
                  <DetailRow label="Método" value={displayMethod(payment.payment_method)} />

                  {isMp && (
                    <>
                      <DetailRow label="ID MercadoPago" value={payment.external_id || null} />
                      <DetailRow
                        label="Estado MP"
                        value={payment.external_status || null}
                      />
                      <DetailRow label="Tipo de pago" value={paymentTypeLabel} />
                      {paymentMethodId && (
                        <DetailRow
                          label="Medio de pago"
                          value={
                            paymentMethodId.charAt(0).toUpperCase() +
                            paymentMethodId.slice(1)
                          }
                        />
                      )}
                      {cardDisplay && (
                        <DetailRow
                          label="Tarjeta"
                          value={
                            cardName
                              ? `${cardDisplay} — ${cardName}`
                              : cardDisplay
                          }
                        />
                      )}
                      {installments != null && installments > 1 && (
                        <DetailRow label="Cuotas" value={String(installments)} />
                      )}
                      {payment.status === "FAILED" && rejectionLabel && (
                        <DetailRow
                          label="Motivo de rechazo"
                          value={
                            <span className="text-[#A85050]">{rejectionLabel}</span>
                          }
                        />
                      )}
                    </>
                  )}

                  {isTransfer && (
                    <>
                      <DetailRow label="ID externo" value={payment.external_id || null} />
                      {payment.receipt_file && (
                        <DetailRow
                          label="Comprobante"
                          value={
                            <a
                              href={payment.receipt_file}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-teal hover:underline"
                            >
                              Ver archivo <ExternalLink size={11} />
                            </a>
                          }
                        />
                      )}
                      {payment.receipt_uploaded_at && (
                        <DetailRow
                          label="Subido el"
                          value={formatDate(payment.receipt_uploaded_at)}
                        />
                      )}
                      {ocrResult && (
                        <DetailRow label="Resultado OCR" value={ocrResult} />
                      )}
                    </>
                  )}
                </div>
              </section>

              {/* ── 4. Invoice ── */}
              {payment.has_invoice && payment.invoice_number && (
                <section>
                  <SectionHeading icon={Receipt} title="Comprobante" />
                  <div className="bg-bg rounded-[10px] px-4 py-1">
                    <DetailRow label="Nº comprobante" value={payment.invoice_number} />
                  </div>
                </section>
              )}

              {/* ── 5. Notes ── */}
              {payment.notes && (
                <section>
                  <SectionHeading icon={FileText} title="Notas" />
                  <div className="bg-bg rounded-[10px] px-4 py-3">
                    <p className="text-[13px] text-ink leading-relaxed">{payment.notes}</p>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0.6; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>,
    document.body
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function PagosPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);

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
                  <tr
                    key={payment.id}
                    className="hover:bg-bg transition-colors cursor-pointer"
                    onClick={() => setSelectedId(payment.id)}
                  >
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

      {selectedId !== null && (
        <PaymentDetailModal
          paymentId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
