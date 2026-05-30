import { useState, useEffect, useRef } from "react";
import { useBookingStore } from "../store/bookingStore";

interface HoldCountdownProps {
  holdExpiresAt: string;   // ISO8601 UTC string
  checkoutUrl: string;
}

export default function HoldCountdown({ holdExpiresAt, checkoutUrl }: HoldCountdownProps) {
  const reset = useBookingStore((s) => s.reset);
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.round((new Date(holdExpiresAt).getTime() - Date.now()) / 1000))
  );
  const redirected = useRef(false);

  useEffect(() => {
    if (secondsLeft <= 0 && !redirected.current) {
      redirected.current = true;
      reset();
      window.location.href = checkoutUrl;
      return;
    }
    const id = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [secondsLeft, checkoutUrl, reset]);

  return (
    <div className="max-w-[560px] mx-auto px-4 py-12">
      <div className="bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] p-8 text-center">
        {/* Spinner icon */}
        <div className="w-16 h-16 bg-teal/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-teal-dark animate-spin"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>

        <h2 className="font-display text-[22px] font-semibold text-ink mb-2">
          Reserva registrada
        </h2>
        <p className="text-[14px] text-ink2 mb-1">
          Redirigiendo al pago en <span className="font-semibold text-ink">{secondsLeft}</span> segundos…
        </p>
        <p className="text-[13px] text-ink2 mb-6">
          Tu lugar está reservado. Completá el pago para confirmar el turno.
        </p>

        <a
          href={checkoutUrl}
          onClick={() => reset()}
          className="inline-block bg-teal-dark text-white rounded-[12px] px-6 py-3 font-semibold text-[14px] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-cta)]"
        >
          Ir al pago ahora
        </a>
      </div>
    </div>
  );
}
