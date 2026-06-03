import { initMercadoPago, Wallet } from "@mercadopago/sdk-react";

// Initialize MercadoPago SDK once with the public key from env
const MP_PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY as string;
initMercadoPago(MP_PUBLIC_KEY, { locale: "es-CL" });

interface WalletBrickProps {
  preferenceId: string;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

/**
 * WalletBrick
 *
 * Renders the MercadoPago Wallet Brick inline — no external redirect.
 * The user completes payment within the embedded checkout frame.
 *
 * Props:
 *   preferenceId - MP preference ID returned by the booking API
 *   onSuccess    - called after successful payment (optional)
 *   onError      - called on Brick error (optional)
 */
export default function WalletBrick({ preferenceId, onSuccess, onError }: WalletBrickProps) {
  return (
    <div className="rounded-[16px] overflow-hidden border border-line bg-surface p-2">
      <Wallet
        initialization={{ preferenceId, redirectMode: "blank" }}
        onReady={onSuccess}
        onError={onError}
      />
    </div>
  );
}
