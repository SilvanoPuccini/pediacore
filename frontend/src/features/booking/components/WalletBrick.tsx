import { memo, useCallback, useState } from "react";
import { initMercadoPago, CardPayment } from "@mercadopago/sdk-react";
import api from "@/lib/api";

// Initialize MercadoPago SDK once with the public key from env
const MP_PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY as string;
initMercadoPago(MP_PUBLIC_KEY, { locale: "es-CL" });

interface PaymentBrickProps {
  paymentId: number;
  amount: number;
  payerEmail: string;
  onApproved: () => void;
  onError: (message: string) => void;
}

/**
 * PaymentBrick
 *
 * Renders the MercadoPago CardPayment Brick inline — the user fills in
 * card details directly on the page. On submit, the brick tokenizes the
 * card and we send the token to our backend to process the payment.
 *
 * No redirect. No new tab. Everything happens on this page.
 */
export default memo(function PaymentBrick({
  paymentId,
  amount,
  payerEmail,
  onApproved,
  onError,
}: PaymentBrickProps) {
  const [processing, setProcessing] = useState(false);

  const handleSubmit = useCallback(
    async (formData: Record<string, unknown>) => {
      setProcessing(true);
      try {
        const { data } = await api.post(`/payments/${paymentId}/process-card/`, formData);
        if (data.status === "approved") {
          onApproved();
        } else {
          onError("El pago está siendo procesado. Te notificaremos cuando se confirme.");
        }
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        const message = axiosErr?.response?.data?.detail ?? "No se pudo procesar el pago. Verificá los datos e intentá de nuevo.";
        onError(message);
      } finally {
        setProcessing(false);
      }
    },
    [paymentId, onApproved, onError]
  );

  const onReady = useCallback(() => console.log("PaymentBrick ready"), []);
  const onBrickError = useCallback((err: unknown) => console.error("PaymentBrick error:", err), []);

  return (
    <div className="rounded-[16px] overflow-hidden border border-line bg-surface">
      {processing && (
        <div className="bg-teal/5 border-b border-teal/20 px-4 py-3 flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-teal-dark border-t-transparent rounded-full animate-spin" />
          <p className="text-[13px] text-teal-dark font-medium">Procesando pago...</p>
        </div>
      )}
      <div className="p-2">
        <CardPayment
          initialization={{ amount, payer: { email: payerEmail } }}
          onSubmit={handleSubmit}
          onReady={onReady}
          onError={onBrickError}
        />
      </div>
    </div>
  );
});
