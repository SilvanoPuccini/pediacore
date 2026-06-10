import type { LucideIcon } from "lucide-react";
import { MoreHorizontal, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  value: string | number;
  label: string;
  loading?: boolean;
  trend?: number;
  trendLabel?: string;
}

function SkeletonBox({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-[8px] bg-line/60", className)} />;
}

export default function MetricCard({
  icon: Icon,
  iconBg,
  iconColor,
  value,
  label,
  loading,
  trend,
  trendLabel = "vs semana pasada",
}: MetricCardProps) {
  if (loading) {
    return (
      <div className="bg-surface border border-line rounded-[14px] p-5 shadow-card">
        <div className="flex items-start justify-between">
          <SkeletonBox className="h-9 w-9 rounded-[10px]" />
          <SkeletonBox className="h-5 w-5 rounded-md" />
        </div>
        <SkeletonBox className="mt-5 h-8 w-16" />
        <SkeletonBox className="mt-2 h-4 w-24" />
        <SkeletonBox className="mt-3 h-3 w-32" />
      </div>
    );
  }

  const trendUp = trend !== undefined && trend >= 0;
  const trendDown = trend !== undefined && trend < 0;

  return (
    <div className="bg-surface border border-line rounded-[14px] p-5 shadow-card hover:shadow-soft transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div
          className="w-9 h-9 rounded-[10px] flex items-center justify-center"
          style={{ background: iconBg }}
        >
          <Icon size={18} style={{ color: iconColor }} />
        </div>
        <button className="text-ink3 hover:text-ink2 transition-colors -mr-1 -mt-1 p-1">
          <MoreHorizontal size={16} />
        </button>
      </div>
      <div className="mt-5 text-[34px] font-bold text-ink leading-none tracking-tight">{value}</div>
      <div className="mt-2 text-[13px] font-medium text-ink2">{label}</div>
      {trend !== undefined && (
        <div className="mt-3 flex items-center gap-1 text-[12px]">
          {trendUp ? (
            <ArrowUpRight size={13} className="text-[#3F8358] shrink-0" />
          ) : trendDown ? (
            <ArrowDownRight size={13} className="text-[#A85050] shrink-0" />
          ) : null}
          <span className={trendUp ? "text-[#3F8358] font-medium" : trendDown ? "text-[#A85050] font-medium" : "text-ink3"}>
            {trend > 0 ? "+" : ""}{trend}%
          </span>
          <span className="text-ink3">{trendLabel}</span>
        </div>
      )}
    </div>
  );
}
