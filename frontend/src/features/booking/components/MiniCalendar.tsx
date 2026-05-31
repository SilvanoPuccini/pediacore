import { useState } from "react";
import { formatDate } from "../utils";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const WEEKDAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];

interface MiniCalendarProps {
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  allowedDaysOfWeek?: number[] | null; // 0=Mon, 1=Tue, ..., 6=Sun (Python weekday)
}

export default function MiniCalendar({ selectedDate, onSelectDate, allowedDaysOfWeek }: MiniCalendarProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 90);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1);
  // Monday-first: 0=Mon, 6=Sun
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function canGoBack() {
    return viewYear > today.getFullYear() || viewMonth > today.getMonth();
  }

  function canGoForward() {
    const maxMonth = maxDate.getMonth();
    const maxYear = maxDate.getFullYear();
    return viewYear < maxYear || (viewYear === maxYear && viewMonth < maxMonth);
  }

  function prevMonth() {
    if (!canGoBack()) return;
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (!canGoForward()) return;
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function isDisabled(day: number) {
    const date = new Date(viewYear, viewMonth, day);
    date.setHours(0, 0, 0, 0);
    if (date < today || date > maxDate) return true;
    // Filter by allowed days of week (Python weekday: 0=Mon, 6=Sun)
    if (allowedDaysOfWeek && allowedDaysOfWeek.length > 0) {
      const jsDow = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      const pyDow = jsDow === 0 ? 6 : jsDow - 1; // Convert to Python: 0=Mon, 6=Sun
      if (!allowedDaysOfWeek.includes(pyDow)) return true;
    }
    return false;
  }

  function isToday(day: number) {
    return (
      day === today.getDate() &&
      viewMonth === today.getMonth() &&
      viewYear === today.getFullYear()
    );
  }

  function isSelected(day: number) {
    const dateStr = formatDate(new Date(viewYear, viewMonth, day));
    return dateStr === selectedDate;
  }

  return (
    <div className="bg-surface rounded-[16px] border border-line p-4 shadow-[var(--shadow-soft)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          disabled={!canGoBack()}
          className="w-8 h-8 flex items-center justify-center rounded-[8px] text-ink2 hover:bg-cream disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="font-semibold text-[14px] text-ink">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          disabled={!canGoForward()}
          className="w-8 h-8 flex items-center justify-center rounded-[8px] text-ink2 hover:bg-cream disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS.map((wd) => (
          <div key={wd} className="text-center text-[11px] font-semibold text-ink3 py-1">
            {wd}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} />;
          }
          const disabled = isDisabled(day);
          const today_ = isToday(day);
          const selected = isSelected(day);

          return (
            <button
              key={day}
              onClick={() => {
                if (!disabled) {
                  onSelectDate(formatDate(new Date(viewYear, viewMonth, day)));
                }
              }}
              disabled={disabled}
              className={[
                "h-8 w-full rounded-[8px] text-[13px] font-medium transition-colors",
                disabled
                  ? "text-ink3/40 cursor-not-allowed"
                  : selected
                  ? "bg-teal text-white font-semibold shadow-sm"
                  : today_
                  ? "bg-cream text-teal-dark font-semibold ring-1 ring-teal/30"
                  : "text-ink hover:bg-cream",
              ].join(" ")}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
