import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  value: string | number;
  label: string;
  loading?: boolean;
}

function SkeletonBox({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-[8px] bg-line/60", className)} />;
}

export default function MetricCard({ icon: Icon, iconBg, iconColor, value, label, loading }: MetricCardProps) {
  if (loading) {
    return (
      <div className="bg-surface border border-line rounded-[14px] p-5 shadow-[var(--shadow-card)]">
        <SkeletonBox className="h-9 w-9 rounded-[10px]" />
        <SkeletonBox className="mt-5 h-8 w-16" />
        <SkeletonBox className="mt-2 h-4 w-24" />
      </div>
    );
  }

  return (
    <div className="bg-surface border border-line rounded-[14px] p-5 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-soft)] transition-shadow duration-200">
      <div
        className="w-9 h-9 rounded-[10px] flex items-center justify-center"
        style={{ background: iconBg }}
      >
        <Icon size={18} style={{ color: iconColor }} />
      </div>
      <div className="mt-5 text-[34px] font-bold text-ink leading-none tracking-tight">{value}</div>
      <div className="mt-2 text-[13px] font-medium text-ink2">{label}</div>
    </div>
  );
}
