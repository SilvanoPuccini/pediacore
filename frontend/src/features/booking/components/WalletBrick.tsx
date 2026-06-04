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
        <svg viewBox="0 0 340 72" className="h-5 w-auto" aria-label="MercadoPago">
          <g fill="#00AAFF">
            <path d="M45.6 21.6c-7.2-4-16-4-23.2 0C15.2 25.6 8 33.2 8 42v22h12V42c0-4 3.2-8 8-10.4 2.4-1.2 5.2-1.2 7.6 0C40.4 34 43.6 38 43.6 42v22h12V42c0-8.8-7.2-16.4-14.4-20.4z"/>
            <path d="M78 26.8c-2-2-4.4-3.6-7.2-4.4-5.6-2-12-.8-16.4 3.2-3.2 2.8-5.2 7.2-5.2 11.6v26.4h12V37.2c0-2 .8-3.6 2-4.8 2-2 5.2-2.4 7.6-1.2 1.2.4 2 1.2 2.8 2.4.8 1.2 1.2 2.4 1.2 4v26h12V37.2c0-4-2.8-7.6-6.4-10.4z"/>
          </g>
          <text x="100" y="52" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="36" fill="#2D3277">Mercado</text>
          <text x="248" y="52" fontFamily="Arial,sans-serif" fontWeight="300" fontSize="36" fill="#2D3277">Pago</text>
        </svg>
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
