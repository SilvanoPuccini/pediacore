import type { AvailableSlot } from "@/types/api";
import { formatTime } from "../utils";
import Skeleton from "./Skeleton";

interface TimeSlotGridProps {
  slots: AvailableSlot[] | undefined;
  isLoading: boolean;
  selectedSlot: AvailableSlot | null;
  onSelect: (slot: AvailableSlot) => void;
}

export default function TimeSlotGrid({ slots, isLoading, selectedSlot, onSelect }: TimeSlotGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    );
  }

  if (!slots || !Array.isArray(slots) || slots.length === 0) {
    return (
      <div className="bg-cream rounded-[14px] px-5 py-4 text-[14px] text-ink2">
        No hay turnos disponibles para este día. Probá con otra fecha.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
      {slots.map((slot) => {
        const isSelected = selectedSlot?.start_time === slot.start_time;
        return (
          <button
            key={slot.start_time}
            disabled={!slot.available}
            onClick={() => onSelect(slot)}
            className={[
              "h-10 rounded-[10px] text-[13px] font-medium transition-colors border",
              !slot.available
                ? "bg-bg text-ink3 border-line cursor-not-allowed"
                : isSelected
                ? "bg-teal text-white border-teal shadow-sm"
                : "bg-surface text-ink border-line hover:border-teal/50 hover:bg-cream",
            ].join(" ")}
          >
            {formatTime(slot.start_time)}
          </button>
        );
      })}
    </div>
  );
}
