import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useBookingStore } from "../store/bookingStore";
import { useServices } from "../hooks/useBookingQueries";
import api from "@/lib/api";
import WalletBrick from "../components/WalletBrick";
import TransferInstructions from "../components/TransferInstructions";

/**
 * StepPayment (step 8)
 *
 * Renders the correct payment UI based on the selected payment method:
 * - MERCADOPAGO: renders WalletBrick inline + polls payment status
 * - TRANSFER: renders TransferInstructions with bank details and receipt upload
 */
export default function StepPayment() {
  const navigate = useNavigate();
  const preferenceId = useBookingStore((s) => s.preferenceId);
  const holdExpiresAt = useBookingStore((s) => s.holdExpiresAt);
  const paymentMethod = useBookingStore((s) => s.paymentMethod);
  const paymentId = useBookingStore((s) => s.paymentId);
  const bankDetails = useBookingStore((s) => s.bankDetails);
  const transferExpiresAt = useBookingStore((s) => s.transferExpiresAt);
  const serviceId = useBookingStore((s) => s.serviceId);
  const appointmentId = useBookingStore((s) => s.appointmentId);
  const reset = useBookingStore((s) => s.reset);

  const [cancelling, setCancelling] = useState(false);
  const [receiptUploaded, setReceiptUploaded] = useState(false);

  const { data: servicesResp } = useServices();
  const selectedService = (servicesResp?.results ?? []).find((s) => s.id === serviceId) ?? null;

  const [secondsLeft, setSecondsLeft] = useState(() => {
    if (paymentMethod === "TRANSFER" && transferExpiresAt) {
      return Math.max(0, Math.round((new Date(transferExpiresAt).getTime() - Date.now()) / 1000));
    }
    return holdExpiresAt
      ? Math.max(0, Math.round((new Date(holdExpiresAt).getTime() - Date.now()) / 1000))
      : 0;
  });

  // Countdown timer (only for MP — transfer has 48h window)
  useEffect(() => {
    if (paymentMethod === "TRANSFER") return;
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [secondsLeft, paymentMethod]);

  // ── Poll payment status every 3s (only for MP) ──────────────────────────────
  const { data: paymentData } = useQuery({
    queryKey: ["payment-poll", paymentId],
    queryFn: () => api.get(`/payments/${paymentId}/`).then((r) => r.data),
    enabled: !!paymentId && paymentMethod === "MERCADOPAGO",
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (paymentData?.status === "COMPLETED") {
      navigate("/booking/confirmed");
    }
  }, [paymentData, navigate]);

  // ── Go back: cancel hold + clear booking data ───────────────────────────────
  async function handleGoBack() {
    if (cancelling) return;

    if (appointmentId) {
      setCancelling(true);
      try {
        await api.post(`/appointments/${appointmentId}/cancel/`, { reason: "user_cancelled_hold" });
      } catch {
        // Silently ignore — hold expires naturally in 10 min
      }
      setCancelling(false);
    }

    useBookingStore.setState({
      appointmentId: null,
      paymentId: null,
      preferenceId: null,
      bankDetails: null,
      checkoutUrl: null,
      holdExpiresAt: null,
      transferExpiresAt: null,
    });

    useBookingStore.getState().setStep(7);
  }

  const minutes = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeDisplay = minutes > 0
    ? `${minutes}:${String(secs).padStart(2, "0")} min`
    : `${secs}s`;

  // ── Transfer flow ──────────────────────────────────────────────────────────

  if (paymentMethod === "TRANSFER") {
    if (!paymentId || !bankDetails) {
      return (
        <div className="max-w-[560px] mx-auto px-4 pt-[110px] pb-12">
          <div className="bg-coral/10 border border-coral/30 rounded-[12px] px-4 py-3 text-center">
            <p className="text-[13px] text-ink font-semibold">
              No se pudieron cargar los datos de transferencia
            </p>
            <p className="text-[12px] text-ink2 mt-1">
              Por favor, intentá de nuevo.
            </p>
            <button
              onClick={() => { reset(); }}
              className="mt-3 text-[13px] text-teal-dark font-semibold hover:underline"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-[560px] mx-auto px-4 pt-[110px] pb-12">
        {!receiptUploaded && (
          <button
            onClick={handleGoBack}
            disabled={cancelling}
            className="flex items-center gap-1.5 text-[14px] text-ink2 hover:text-teal-dark transition-colors mb-6 disabled:opacity-50"
          >
            <ArrowLeft size={16} />
            {cancelling ? "Cancelando..." : "Volver"}
          </button>
        )}
        <div className="space-y-4">
          {!receiptUploaded && (
            <h2 className="font-display text-[22px] font-semibold text-ink">
              Instrucciones de pago
            </h2>
          )}
          <TransferInstructions
            paymentId={paymentId}
            amount={selectedService?.price_clp ?? 0}
            bankDetails={bankDetails}
            onUploadComplete={() => setReceiptUploaded(true)}
          />
        </div>
      </div>
    );
  }

  // ── MercadoPago flow ───────────────────────────────────────────────────────

  return (
    <div className="max-w-[560px] mx-auto px-4 pt-[110px] pb-12">
      <div className="space-y-6">
        {/* Hold countdown banner */}
        <div
          data-testid="hold-countdown"
          className="bg-amber-50 border border-amber-200 rounded-[16px] px-5 py-4"
        >
          <p className="text-[14px] text-amber-800 text-center">
            Tu lugar está reservado por{" "}
            <span className="font-bold">{timeDisplay}</span>.
            Completá el pago para confirmar el turno.
          </p>
        </div>

        {/* Wallet Brick or error */}
        {preferenceId ? (
          <div>
            <h2 className="font-display text-[20px] font-semibold text-ink mb-4 text-center">
              Completá el pago
            </h2>
            <WalletBrick
              preferenceId={preferenceId}
            />
          </div>
        ) : (
          <div className="bg-coral/10 border border-coral/30 rounded-[12px] px-4 py-3 text-center">
            <p className="text-[13px] text-ink font-semibold">
              No se pudo cargar el método de pago
            </p>
            <p className="text-[12px] text-ink2 mt-1">
              Por favor, intentá de nuevo o contactanos.
            </p>
            <button
              onClick={() => { reset(); }}
              className="mt-3 text-[13px] text-teal-dark font-semibold hover:underline"
            >
              Volver al inicio
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
