import { Building2, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type PaymentMethod = "MERCADOPAGO" | "TRANSFER";

interface PaymentMethodSelectorProps {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PaymentMethodSelector({ value, onChange }: PaymentMethodSelectorProps) {
  return (
    <div>
      <p className="text-[13px] font-semibold text-ink mb-2">Método de pago</p>
      <div className="grid grid-cols-2 gap-3">
        {/* MercadoPago option */}
        <button
          type="button"
          onClick={() => onChange("MERCADOPAGO")}
          className={cn(
            "flex flex-col items-start gap-2 px-4 py-3.5 rounded-[16px] border text-left transition-all cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/30",
            value === "MERCADOPAGO"
              ? "border-teal bg-teal/5 ring-2 ring-teal/20"
              : "border-line bg-surface hover:border-ink3"
          )}
        >
          <CreditCard
            size={20}
            className={cn(
              "shrink-0",
              value === "MERCADOPAGO" ? "text-teal-dark" : "text-ink3"
            )}
          />
          <span
            className={cn(
              "text-[13px] font-semibold leading-tight",
              value === "MERCADOPAGO" ? "text-teal-dark" : "text-ink2"
            )}
          >
            Tarjeta de crédito o débito
          </span>
          <span className="text-[11px] text-ink3 leading-tight">
            Pago inmediato
          </span>
        </button>

        {/* Transfer option */}
        <button
          type="button"
          onClick={() => onChange("TRANSFER")}
          className={cn(
            "flex flex-col items-start gap-2 px-4 py-3.5 rounded-[16px] border text-left transition-all cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/30",
            value === "TRANSFER"
              ? "border-teal bg-teal/5 ring-2 ring-teal/20"
              : "border-line bg-surface hover:border-ink3"
          )}
        >
          <Building2
            size={20}
            className={cn(
              "shrink-0",
              value === "TRANSFER" ? "text-teal-dark" : "text-ink3"
            )}
          />
          <span
            className={cn(
              "text-[13px] font-semibold leading-tight",
              value === "TRANSFER" ? "text-teal-dark" : "text-ink2"
            )}
          >
            Transferencia bancaria
          </span>
          <span className="text-[11px] text-ink3 leading-tight">
            Acreditación manual (48h)
          </span>
        </button>
      </div>
    </div>
  );
}
