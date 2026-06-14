import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Stethoscope,
  MapPin,
  Video,
} from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { StatusBadge, Avatar } from "@/features/tutor/components/portal-ui";
import type { Appointment, PaginatedResponse } from "@/types/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function formatTime(t: string): string {
  return t.slice(0, 5);
}

function mapStatus(status: string, attendanceConfirmed?: boolean): string {
  if (status === "CONFIRMED" && attendanceConfirmed) return "asistencia";
  switch (status) {
    case "CONFIRMED": return "confirmado";
    case "HOLD":
    case "PENDING": return "pendiente";
    case "CANCELLED":
    case "NO_SHOW":
    case "EXPIRED": return "cancelado";
    default: return "realizado";
  }
}

function getCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  // Convert Sunday=0 to Monday-based: Mon=0, Tue=1, ..., Sun=6
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  // Pad to complete last week
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CalendarView() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const todayStr = toDateStr(now.getFullYear(), now.getMonth(), now.getDate());

  // Fetch all appointments for this month
  const firstDay = toDateStr(year, month, 1);
  const lastDay = toDateStr(year, month, new Date(year, month + 1, 0).getDate());

  const { data } = useQuery({
    queryKey: ["appointments", "calendar", year, month],
    queryFn: () =>
      api
        .get<PaginatedResponse<Appointment>>("/appointments/", {
          params: {
            date_from: firstDay,
            date_to: lastDay,
            ordering: "scheduled_date,start_time",
            page_size: 100,
          },
        })
        .then((r) => r.data),
  });

  const appointments = data?.results ?? [];

  // Group appointments by date
  const byDate = new Map<string, Appointment[]>();
  for (const apt of appointments) {
    const list = byDate.get(apt.scheduled_date) ?? [];
    list.push(apt);
    byDate.set(apt.scheduled_date, list);
  }

  const calendarDays = getCalendarDays(year, month);
  const selectedAppointments = selectedDate ? (byDate.get(selectedDate) ?? []) : [];

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDate(null);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDate(null);
  }

  return (
    <div className="max-w-3xl">
      {/* Back */}
      <Link
        to="/portal/turnos"
        className="inline-flex items-center gap-1.5 text-[13px] text-ink3 hover:text-ink transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Volver a mis turnos
      </Link>

      <h1 className="font-display text-[28px] font-semibold text-ink mb-6">
        Calendario
      </h1>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="w-9 h-9 rounded-[10px] border border-line bg-surface flex items-center justify-center hover:bg-bg transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <h2 className="text-[16px] font-semibold text-ink">
          {MONTH_NAMES[month]} {year}
        </h2>
        <button
          onClick={nextMonth}
          className="w-9 h-9 rounded-[10px] border border-line bg-surface flex items-center justify-center hover:bg-bg transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="bg-surface rounded-[16px] border border-line shadow-[var(--shadow-soft)] overflow-hidden mb-5">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-line">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="text-center py-2.5 text-[11px] uppercase tracking-wider font-bold text-ink3"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="h-16 border-b border-r border-line/40" />;
            }

            const dateStr = toDateStr(year, month, day);
            const dayAppts = byDate.get(dateStr) ?? [];
            const hasAppts = dayAppts.length > 0;
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={cn(
                  "h-16 border-b border-r border-line/40 flex flex-col items-center justify-start pt-2 gap-1 transition-colors relative",
                  isSelected ? "bg-teal/10" : "hover:bg-bg",
                )}
              >
                <span
                  className={cn(
                    "text-[13px] font-semibold w-7 h-7 flex items-center justify-center rounded-full",
                    isToday && "bg-teal-dark text-white",
                    isSelected && !isToday && "bg-teal/20 text-teal-dark",
                    !isToday && !isSelected && "text-ink",
                  )}
                >
                  {day}
                </span>
                {hasAppts && (
                  <div className="flex gap-0.5">
                    {dayAppts.slice(0, 3).map((a) => (
                      <span
                        key={a.id}
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          a.status === "CONFIRMED" ? "bg-teal-dark" :
                          a.status === "CANCELLED" ? "bg-ink3" :
                          "bg-amber-500"
                        )}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selectedDate && (
        <div className="bg-surface rounded-[16px] border border-line shadow-[var(--shadow-soft)] overflow-hidden">
          <div className="px-5 py-3 border-b border-line">
            <h3 className="text-[14px] font-semibold text-ink">
              {new Date(year, month, parseInt(selectedDate.split("-")[2]), 12).toLocaleDateString("es-CL", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </h3>
          </div>

          {selectedAppointments.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-[13px] text-ink3">Sin turnos este día.</p>
            </div>
          ) : (
            <ul className="divide-y divide-line/60">
              {selectedAppointments.map((apt) => (
                <li key={apt.id}>
                  <Link
                    to={`/portal/turnos/${apt.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-bg transition-colors"
                  >
                    <div className="text-center shrink-0">
                      <p className="font-display text-[18px] font-medium text-ink leading-none">
                        {formatTime(apt.start_time)}
                      </p>
                      {apt.end_time && (
                        <p className="text-[11px] text-ink3 mt-0.5">
                          {formatTime(apt.end_time)}
                        </p>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar name={apt.patient_name} childIndex={apt.patient % 4} size={22} />
                        <span className="text-[13px] font-semibold text-ink truncate">
                          {apt.patient_name}
                        </span>
                        <StatusBadge status={mapStatus(apt.status, apt.attendance_confirmed)} />
                      </div>
                      <div className="flex items-center gap-3 text-[11.5px] text-ink3">
                        <span className="flex items-center gap-1">
                          <Stethoscope size={11} />
                          {apt.service_name}
                        </span>
                        <span className="flex items-center gap-1">
                          {apt.is_online ? (
                            <><Video size={11} className="text-teal-dark" /> Online</>
                          ) : (
                            <><MapPin size={11} /> {apt.location_name}</>
                          )}
                        </span>
                      </div>
                    </div>

                    <ChevronRight size={14} className="text-ink3 shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
