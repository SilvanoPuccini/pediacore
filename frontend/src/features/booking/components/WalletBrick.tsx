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
 * Props:
 *   preferenceId - MP preference ID returned by the booking API
 */
export default function WalletBrick({ preferenceId }: WalletBrickProps) {
  return (
    <div className="rounded-[16px] overflow-hidden border border-line bg-surface p-2">
      <Wallet
        initialization={{ preferenceId, redirectMode: "blank" }}
        onReady={() => console.log("WalletBrick ready")}
        onError={(err) => console.error("WalletBrick error:", err)}
      />
    </div>
  );
}
