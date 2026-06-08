import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle, Clock, ExternalLink, X } from "lucide-react";
import { useState } from "react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import type { OcrResult, PaginatedResponse, PendingTransferPayment } from "@/types/api";

// ─── helpers ────────────────────────────────────────────────────────────────────

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

// ─── OCR analysis card ──────────────────────────────────────────────────────────

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
  if (match === true) { icon = "✅"; statusText = "coincide"; }
  else if (match === false) { icon = "❌"; statusText = "no coincide"; }
  else { icon = "ℹ️"; statusText = ""; }

  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span>{icon}</span>
      <span className="text-ink2 font-medium">{label}:</span>
      <span className="text-ink">{value}</span>
      {statusText && <span className="text-ink3">({statusText})</span>}
    </div>
  );
}

function OcrAnalysisCard({ ocr }: { ocr: OcrResult }) {
  if (ocr.error) return null;
  const { extracted, matches, confidence } = ocr;
  const colorClass = confidenceColorClass(confidence);

  const formattedMonto = extracted.monto !== null
    ? new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(extracted.monto)
    : null;
  const formattedFecha = extracted.fecha !== null
    ? new Date(extracted.fecha + "T12:00:00").toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" })
    : null;

  return (
    <div className="mt-3 rounded-[12px] border border-line bg-bg px-4 py-3 space-y-1.5">
      <p className="text-[11px] font-semibold text-ink2 uppercase tracking-wide mb-2">Analisis del comprobante</p>
      <OcrFieldRow label="Monto" value={formattedMonto} match={matches.monto} />
      <OcrFieldRow label="Fecha" value={formattedFecha} match={matches.fecha} />
      <OcrFieldRow label="RUT" value={extracted.rut_remitente} />
      <OcrFieldRow label="Banco" value={extracted.banco_origen} />
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-line">
        <span className="text-[12px] text-ink2">Confianza:</span>
        <span className={cn("text-[12px] font-bold px-2 py-0.5 rounded-full", colorClass)}>
          {confidence}%
        </span>
      </div>
    </div>
  );
}

// ─── reject modal ────────────────────────────────────────────────────────────────

function RejectModal({
  onClose,
  onConfirm,
  isPending,
}: {
  paymentId: number;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] w-full max-w-[440px] p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <h3 className="font-display text-[18px] font-semibold text-ink">Rechazar transferencia</h3>
          <button onClick={onClose} className="text-ink3 hover:text-ink transition-colors"><X size={18} /></button>
        </div>
        <p className="text-[13px] text-ink2 mb-4">Indica el motivo del rechazo. El tutor recibira un email explicando la razon.</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Ej: El monto transferido no coincide con el indicado..."
          className="w-full px-4 py-3 rounded-[12px] border border-line bg-bg text-ink text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral"
        />
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-[10px] border border-line text-[13px] font-semibold text-ink2 hover:bg-bg transition-colors">
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

// ─── PendingTransfersSection ────────────────────────────────────────────────────

export default function PendingTransfersSection() {
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["payments", "pending-transfers"] }); },
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

  if (pendingTransfersQ.isLoading || count === 0) return null;

  return (
    <>
      <div className="flex items-center gap-3 bg-coral/10 border border-coral/30 rounded-[16px] px-5 py-4">
        <AlertCircle size={18} className="text-coral shrink-0" />
        <p className="text-[14px] font-semibold text-ink">
          {count} {count === 1 ? "transferencia pendiente" : "transferencias pendientes"} de revisar
        </p>
      </div>

      <section>
        <h2 className="font-display text-[16px] font-semibold text-ink mb-4">Transferencias pendientes</h2>
        <div className="bg-surface rounded-[16px] border border-line overflow-hidden">
          <div className="divide-y divide-line">
            {pendingTransfers.map((payment) => {
              const ocrResult = payment.metadata?.ocr_result;
              return (
                <div key={payment.id} className="px-5 py-4 hover:bg-bg/60 transition-colors">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <div className="flex-1 min-w-[160px]">
                      <p className="text-[13px] font-medium text-ink">{payment.patient_name}</p>
                      <p className="text-[11px] text-ink3">
                        {payment.service_name ?? "—"}
                        {payment.scheduled_date ? ` · ${formatDate(payment.scheduled_date)}` : ""}
                      </p>
                    </div>
                    <span className="text-[14px] font-bold text-teal-dark">
                      {formatCurrency(payment.amount, payment.currency)}
                    </span>
                    {payment.receipt_file && (
                      <a href={payment.receipt_file} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[12px] font-medium text-teal-dark hover:underline">
                        <ExternalLink size={13} /> Ver comprobante
                      </a>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => confirmMutation.mutate(payment.id)}
                        disabled={confirmMutation.isPending}
                        className={cn("flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-[8px] transition-colors bg-teal/15 text-teal-dark hover:bg-teal/25", confirmMutation.isPending && "opacity-50 cursor-not-allowed")}
                      >
                        <CheckCircle size={13} className="inline -mt-px" /> Confirmar
                      </button>
                      <button
                        onClick={() => setRejectTarget(payment.id)}
                        disabled={rejectMutation.isPending}
                        className={cn("flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-[8px] transition-colors bg-coral/10 text-coral hover:bg-coral/20", rejectMutation.isPending && "opacity-50 cursor-not-allowed")}
                      >
                        <X size={13} className="inline -mt-px" /> Rechazar
                      </button>
                    </div>
                  </div>
                  {ocrResult && !ocrResult.error && <OcrAnalysisCard ocr={ocrResult} />}
                  {payment.receipt_file && !ocrResult && (
                    <p className="mt-2 text-[11px] text-ink3 flex items-center gap-1.5">
                      <Clock size={11} className="shrink-0" /> Analizando comprobante...
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {rejectTarget !== null && (
        <RejectModal
          paymentId={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onConfirm={(reason) => rejectMutation.mutate({ paymentId: rejectTarget, reason })}
          isPending={rejectMutation.isPending}
        />
      )}
    </>
  );
}
