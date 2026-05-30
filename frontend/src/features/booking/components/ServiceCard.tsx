import type { Service } from "@/types/api";
import { formatPrice } from "../utils";

interface ServiceCardProps {
  service: Service;
  isSelected: boolean;
  onClick: () => void;
}

export default function ServiceCard({ service, isSelected, onClick }: ServiceCardProps) {
  return (
    <button
      onClick={onClick}
      className={[
        "w-full text-left p-5 rounded-[16px] border-2 transition-all",
        isSelected
          ? "border-teal bg-teal/8 shadow-[var(--shadow-soft)]"
          : "border-line bg-surface hover:border-teal/40 hover:shadow-[var(--shadow-soft)]",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="font-semibold text-[15px] text-ink">{service.name}</p>
          {service.description && (
            <p className="text-[13px] text-ink2 mt-1 line-clamp-2">{service.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[12px] text-ink3 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {service.duration_minutes} min
            </span>
            <span className="text-[13px] font-semibold text-teal-dark">
              {formatPrice(service.price_clp)}
            </span>
          </div>
        </div>
        {isSelected && (
          <div className="w-5 h-5 rounded-full bg-teal flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
    </button>
  );
}
