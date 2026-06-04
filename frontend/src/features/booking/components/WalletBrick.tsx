import { memo, useCallback, useState } from "react";
import { initMercadoPago, CardPayment } from "@mercadopago/sdk-react";
import type { ICardPaymentFormData, ICardPaymentBrickPayer } from "@mercadopago/sdk-react/esm/bricks/cardPayment/type";
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
    async (formData: ICardPaymentFormData<ICardPaymentBrickPayer>) => {
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
      {/* MP branding header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-line bg-[#f5f5f5]">
        <img src="/images/logo_MercadoPago.svg" alt="MercadoPago" className="h-6 w-auto" />
        <span className="text-[12px] text-ink3 ml-auto flex items-center gap-1">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
          Pago seguro
        </span>
      </div>
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
