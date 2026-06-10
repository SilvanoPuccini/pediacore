/**
 * Shared UI primitives for the Tutor Portal.
 * Matches the reference design system.
 */
import { type ReactNode, useEffect, useCallback } from "react";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Child color palette ──────────────────────────────────────────────────────

const PALETTES = [
  { fg: "#3F7079", bg: "rgba(123,181,189,0.22)", solid: "#7BB5BD", soft: "#E1EEF1" },
  { fg: "#B5604F", bg: "rgba(243,168,161,0.28)", solid: "#F3A8A1", soft: "#FBE6E2" },
  { fg: "#8A6A1F", bg: "rgba(229,184,71,0.28)", solid: "#E5B847", soft: "#F8EDCF" },
  { fg: "#3F7059", bg: "rgba(168,201,168,0.30)", solid: "#A8C9A8", soft: "#E2EEE2" },
] as const;

export function childPalette(childIndex: number) {
  return PALETTES[childIndex % PALETTES.length];
}

// ─── CLP formatter ────────────────────────────────────────────────────────────

export function clp(n: number): string {
  return "$" + n.toLocaleString("es-CL");
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

interface AvatarProps {
  name: string;
  childIndex?: number;
  size?: number;
  className?: string;
}

export function Avatar({ name, childIndex = 0, size = 40, className }: AvatarProps) {
  const pal = childPalette(childIndex);
  return (
    <div
      className={cn("rounded-full flex items-center justify-center shrink-0 font-bold", className)}
      style={{
        width: size,
        height: size,
        backgroundColor: pal.soft,
        color: pal.fg,
        fontSize: size * 0.4,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

const STATUS_MAP = {
  asistencia: { color: "sage" as const, label: "Asistencia confirmada" },
  confirmado: { color: "teal" as const, label: "Confirmado" },
  pendiente: { color: "mustard" as const, label: "Pendiente de pago" },
  cancelado: { color: "err" as const, label: "Cancelado" },
  realizado: { color: "neutral" as const, label: "Realizada" },
} as const;

const STATUS_STYLES = {
  teal: { bg: "rgba(123,181,189,0.22)", text: "#3F7079", dot: "#7BB5BD" },
  coral: { bg: "rgba(243,168,161,0.28)", text: "#B5604F", dot: "#F3A8A1" },
  mustard: { bg: "rgba(229,184,71,0.28)", text: "#8A6A1F", dot: "#E5B847" },
  sage: { bg: "rgba(168,201,168,0.30)", text: "#3F7059", dot: "#A8C9A8" },
  err: { bg: "rgba(232,160,160,0.26)", text: "#A85050", dot: "#E8A0A0" },
  neutral: { bg: "#F2F1EC", text: "#6B6B6B", dot: "#A0A0A0" },
} as const;

export function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase() as keyof typeof STATUS_MAP;
  const cfg = STATUS_MAP[key] ?? STATUS_MAP.realizado;
  const style = STATUS_STYLES[cfg.color];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: style.dot }} />
      {cfg.label}
    </span>
  );
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

type ChipColor = "teal" | "coral" | "mustard" | "sage" | "err" | "neutral";

interface ChipProps {
  children: ReactNode;
  color?: ChipColor;
  icon?: keyof typeof LucideIcons;
  className?: string;
}

export function Chip({ children, color = "neutral", icon, className }: ChipProps) {
  const style = STATUS_STYLES[color];
  const IconComp = icon ? (LucideIcons[icon] as React.ComponentType<{ size: number }>) : null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-semibold",
        className
      )}
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {IconComp && <IconComp size={12} />}
      {children}
    </span>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}

export function Card({ children, className, padding = true }: CardProps) {
  return (
    <div
      className={cn(
        "bg-surface border border-line rounded-[16px] shadow-card",
        padding && "p-5",
        className
      )}
    >
      {children}
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: keyof typeof LucideIcons;
  title: string;
  text?: string;
  action?: ReactNode;
}

export function EmptyState({ icon = "Inbox", title, text, action }: EmptyStateProps) {
  const IconComp = (LucideIcons[icon] as React.ComponentType<{ size: number; className?: string }>) ?? LucideIcons.Inbox;
  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto w-16 h-16 rounded-full bg-bg flex items-center justify-center">
        <IconComp size={24} className="text-ink3" />
      </div>
      <p className="text-[15px] font-bold text-ink mt-4">{title}</p>
      {text && <p className="text-[13px] text-ink2 mt-1.5 max-w-sm mx-auto">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ─── Btn ──────────────────────────────────────────────────────────────────────

type BtnVariant = "primary" | "soft" | "ghost" | "danger" | "quiet";
type BtnSize = "sm" | "md" | "lg";

interface BtnProps {
  children: ReactNode;
  variant?: BtnVariant;
  size?: BtnSize;
  icon?: keyof typeof LucideIcons;
  iconRight?: keyof typeof LucideIcons;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}

const BTN_SIZES: Record<BtnSize, string> = {
  sm: "px-3 py-1.5 text-[12.5px]",
  md: "px-4 py-2.5 text-[13px]",
  lg: "px-5 py-3 text-[14px]",
};

const BTN_VARIANTS: Record<BtnVariant, string> = {
  primary: "bg-teal-dark text-white hover:opacity-90 shadow-soft",
  soft: "bg-teal/15 text-teal-dark hover:bg-teal/25",
  ghost: "bg-surface border border-line text-ink2 hover:bg-bg",
  danger: "bg-surface border border-destructive/40 text-[#A85050] hover:bg-destructive/10",
  quiet: "text-ink2 hover:bg-bg",
};

export function Btn({
  children,
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  onClick,
  className,
  type = "button",
  disabled,
}: BtnProps) {
  const LeftIcon = icon ? (LucideIcons[icon] as React.ComponentType<{ size: number }>) : null;
  const RightIcon = iconRight ? (LucideIcons[iconRight] as React.ComponentType<{ size: number }>) : null;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-[10px] font-semibold transition-all cursor-pointer",
        BTN_SIZES[size],
        BTN_VARIANTS[variant],
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {LeftIcon && <LeftIcon size={15} />}
      {children}
      {RightIcon && <RightIcon size={15} />}
    </button>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const MODAL_SIZES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

export function Modal({ open, onClose, title, subtitle, children, footer, size = "md" }: ModalProps) {
  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [open, handleEsc]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/25 backdrop-blur-sm"
        style={{ animation: "portalFade 180ms ease-out" }}
        onClick={onClose}
      />
      <div
        className={cn(
          "relative w-full rounded-[18px] bg-surface shadow-pop border border-line max-h-[90vh] flex flex-col",
          MODAL_SIZES[size]
        )}
        style={{ animation: "portalPop 220ms cubic-bezier(0.22,1,0.36,1)" }}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-line flex items-start justify-between">
          <div>
            {subtitle && (
              <span className="block text-[11px] uppercase tracking-[0.14em] text-ink3 font-semibold mb-1">
                {subtitle}
              </span>
            )}
            <h2 className="text-[18px] font-bold font-display text-ink">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[8px] text-ink3 hover:text-ink hover:bg-bg transition-colors"
          >
            <LucideIcons.X size={16} />
          </button>
        </div>
        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-line bg-bg/40 flex items-center justify-end gap-2 rounded-b-[18px]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
}

export function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 rounded-full transition-colors shrink-0 cursor-pointer",
        checked ? "bg-teal" : "bg-[#E0DED8]"
      )}
    >
      <span
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? "translateX(22px)" : "translateX(2px)" }}
      />
    </button>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

export type ToastKind = "success" | "info" | "error";

interface ToastProps {
  message: string;
  kind?: ToastKind;
}

const TOAST_ICONS: Record<ToastKind, { bg: string; icon: React.ComponentType<{ size: number; className?: string }> }> = {
  success: { bg: "#3F7059", icon: LucideIcons.Check },
  info: { bg: "#4A8590", icon: LucideIcons.AlertCircle },
  error: { bg: "#A85050", icon: LucideIcons.AlertCircle },
};

export function Toast({ message, kind = "success" }: ToastProps) {
  const cfg = TOAST_ICONS[kind];
  const Icon = cfg.icon;
  return (
    <div
      className="fixed bottom-6 right-6 z-[70] px-4 py-3 rounded-[12px] bg-surface border border-line shadow-pop flex items-center gap-3 text-[13px] font-semibold text-ink"
      style={{ animation: "portalToast 260ms cubic-bezier(0.22,1,0.36,1)" }}
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: cfg.bg }}
      >
        <Icon size={14} className="text-white" />
      </div>
      {message}
    </div>
  );
}
