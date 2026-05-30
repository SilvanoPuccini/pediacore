interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className }: SkeletonProps) {
  return <div className={`animate-pulse bg-line/60 rounded-[10px] ${className ?? ""}`} />;
}
