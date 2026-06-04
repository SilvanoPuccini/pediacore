import { memo, useCallback } from "react";
import { initMercadoPago, Wallet } from "@mercadopago/sdk-react";

// Initialize MercadoPago SDK once with the public key from env
const MP_PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY as string;
initMercadoPago(MP_PUBLIC_KEY, { locale: "es-CL" });

interface WalletBrickProps {
  preferenceId: string;
}

/**
 * WalletBrick
 *
 * Renders the MercadoPago Wallet Brick in "blank" mode.
 * Opens MP checkout in a new tab so the user stays on the booking page.
 * The parent component polls appointment status to detect payment completion.
 *
 * IMPORTANT: wrapped in React.memo with stable callbacks to prevent the MP SDK
 * from destroying and re-creating the brick on every parent re-render (e.g.
 * the countdown timer in StepPayment ticks every second).
 */
export default memo(function WalletBrick({ preferenceId }: WalletBrickProps) {
  const onReady = useCallback(() => console.log("WalletBrick ready"), []);
  const onError = useCallback((err: unknown) => console.error("WalletBrick error:", err), []);

  return (
    <div className="rounded-[16px] overflow-hidden border border-line bg-surface p-2">
      <Wallet
        initialization={{ preferenceId, redirectMode: "blank" }}
        onReady={onReady}
        onError={onError}
      />
    </div>
  );
});
