import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBookingStore } from "../store/bookingStore";
import WalletBrick from "../components/WalletBrick";

/**
 * StepPayment (step 8)
 *
 * Renders the MercadoPago Wallet Brick inline for MP payments.
 * Replaces the old HoldCountdown redirect flow.
 *
 * - Shows a countdown timer for the slot hold duration
 * - Renders WalletBrick with preferenceId from booking store
 * - On payment success: navigates to /booking/confirmed
 */
export default function StepPayment() {
  const navigate = useNavigate();
  const preferenceId = useBookingStore((s) => s.preferenceId);
  const holdExpiresAt = useBookingStore((s) => s.holdExpiresAt);
  const reset = useBookingStore((s) => s.reset);

  const [secondsLeft, setSecondsLeft] = useState(() =>
    holdExpiresAt
      ? Math.max(0, Math.round((new Date(holdExpiresAt).getTime() - Date.now()) / 1000))
      : 0
  );

  // Countdown timer
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  function handlePaymentSuccess() {
    navigate("/booking/confirmed");
  }

  const minutes = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeDisplay = minutes > 0
    ? `${minutes}:${String(secs).padStart(2, "0")} min`
    : `${secs}s`;

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
              onSuccess={handlePaymentSuccess}
              onError={(err) => {
                console.error("WalletBrick error:", err);
              }}
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
