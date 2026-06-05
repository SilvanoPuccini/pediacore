import { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "default",
  onConfirm,
  onCancel,
  isPending = false,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const isDanger = variant === "danger";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="relative w-full max-w-[400px] bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] p-6 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Close */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 rounded-lg text-ink3 hover:text-ink hover:bg-cream transition-colors"
        >
          <X size={16} />
        </button>

        {/* Icon */}
        <div
          className={`mx-auto mb-4 h-12 w-12 rounded-full flex items-center justify-center ${
            isDanger
              ? "bg-coral/10 text-coral"
              : "bg-teal/10 text-teal-dark"
          }`}
        >
          <AlertTriangle size={22} />
        </div>

        {/* Title */}
        <h2
          id="confirm-title"
          className="text-center font-display text-[18px] font-semibold text-ink mb-2"
        >
          {title}
        </h2>

        {/* Message */}
        <p className="text-center text-[14px] text-ink2 leading-relaxed mb-6">
          {message}
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={onConfirm}
            disabled={isPending}
            className={`w-full py-3 rounded-[12px] text-[14px] font-semibold text-white transition-all ${
              isDanger
                ? "bg-coral hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(207,112,96,0.35)] disabled:opacity-60 disabled:translate-y-0"
                : "bg-teal-dark hover:-translate-y-0.5 hover:shadow-[var(--shadow-cta)] disabled:opacity-60 disabled:translate-y-0"
            }`}
          >
            {isPending ? `${confirmLabel}...` : confirmLabel}
          </button>
          <button
            onClick={onCancel}
            disabled={isPending}
            className="w-full py-3 rounded-[12px] text-[14px] font-medium text-ink2 hover:text-ink hover:bg-cream transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
