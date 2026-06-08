import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, CalendarDays } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { useSedeStore } from "../stores/useSedeStore";
import type { Appointment, Location, PaginatedResponse } from "@/types/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const SLOT_HEIGHT = 56; // px per hour
const CAL_START_HOUR = 8;
const CAL_END_HOUR = 20;
const TOTAL_HOURS = CAL_END_HOUR - CAL_START_HOUR;

// ─── Service color mapping ────────────────────────────────────────────────────

type ServiceColor = { bg: string; border: string; text: string };

function getServiceColor(serviceName: string): ServiceColor {
  const name = serviceName.toLowerCase();
  if (name.includes("control sano") || name.includes("control")) {
    return { bg: "#D6F1EA", border: "#7DD3C0", text: "#3E8E7C" };
  }
  if (name.includes("online") || name.includes("telemedicina")) {
    return { bg: "#FFE2D9", border: "#F4A89A", text: "#B5604F" };
  }
  if (name.includes("consulta")) {
    return { bg: "#EDE4FF", border: "#C7B8E8", text: "#6B569E" };
  }
  // default: lavender
  return { bg: "#EDE4FF", border: "#C7B8E8", text: "#6B569E" };
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

const DAY_ABBREVS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// ─── Appointment block ────────────────────────────────────────────────────────

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function AppointmentBlock({ appt }: { appt: Appointment }) {
  const startMin = timeToMinutes(appt.start_time) - CAL_START_HOUR * 60;
  const endMin = timeToMinutes(appt.end_time) - CAL_START_HOUR * 60;
  const top = (startMin / 60) * SLOT_HEIGHT;
  const height = Math.max(((endMin - startMin) / 60) * SLOT_HEIGHT, 20);
  const color = appt.is_online
    ? getServiceColor("online")
    : getServiceColor(appt.service_name);

  return (
    <div
      className="absolute left-1 right-1 rounded-[8px] px-2 py-1 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
      style={{
        top: `${top}px`,
        height: `${height}px`,
        background: color.bg,
        border: `1.5px solid ${color.border}`,
      }}
      onClick={() => console.log("appointment", appt.id)}
    >
      <p
        className="text-[10.5px] font-semibold leading-tight truncate"
        style={{ color: color.text }}
      >
        {appt.start_time.slice(0, 5)} {appt.patient_name}
      </p>
      {height > 32 && (
        <p className="text-[10px] leading-tight truncate mt-0.5" style={{ color: color.text, opacity: 0.75 }}>
          {appt.service_name}
        </p>
      )}
    </div>
  );
}

// ─── Now indicator ────────────────────────────────────────────────────────────

function NowIndicator() {
  const [top, setTop] = useState(0);

  useEffect(() => {
    function calc() {
      const now = new Date();
      const minutes = (now.getHours() - CAL_START_HOUR) * 60 + now.getMinutes();
      setTop((minutes / 60) * SLOT_HEIGHT);
    }
    calc();
    const iv = setInterval(calc, 60_000);
    return () => clearInterval(iv);
  }, []);

  const now = new Date();
  if (now.getHours() < CAL_START_HOUR || now.getHours() >= CAL_END_HOUR) return null;

  return (
    <div
      className="absolute left-0 right-0 flex items-center pointer-events-none z-10"
      style={{ top: `${top}px` }}
    >
      <div className="w-2 h-2 rounded-full bg-coral shrink-0" style={{ marginLeft: -4 }} />
      <div className="flex-1 h-px bg-coral" />
    </div>
  );
}

// ─── Calendar page ────────────────────────────────────────────────────────────

export default function Calendar() {
  const sedeId = useSedeStore((s) => s.sedeId);
  const [monday, setMonday] = useState<Date>(() => getMondayOfWeek(new Date()));
  const [activeSede, setActiveSede] = useState<number | null>(sedeId);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to business hours on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = SLOT_HEIGHT * 1; // scroll to 9:00
    }
  }, []);

  // Sync sede filter with store
  useEffect(() => {
    setActiveSede(sedeId);
  }, [sedeId]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const dateFrom = toISO(monday);
  const dateTo = toISO(addDays(monday, 6));

  // Fetch locations
  const locationsQ = useQuery<Location[]>({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Location>>("/locations/");
      return data.results;
    },
    staleTime: 1000 * 60 * 60,
  });

  // Fetch appointments for current week
  const apptsQ = useQuery<Appointment[]>({
    queryKey: ["appointments", "week", dateFrom, dateTo, activeSede],
    queryFn: async () => {
      const params = new URLSearchParams({
        date_from: dateFrom,
        date_to: dateTo,
        page_size: "200",
      });
      if (activeSede) params.set("location_id", String(activeSede));
      const { data } = await api.get<PaginatedResponse<Appointment>>(
        `/appointments/?${params}`
      );
      return data.results;
    },
    staleTime: 1000 * 60 * 2,
  });

  const appointments = apptsQ.data ?? [];
  const locations = locationsQ.data ?? [];
  const today = new Date();
  const todayISO = toISO(today);

  // Group appointments by date
  const apptsByDate = new Map<string, Appointment[]>();
  for (const appt of appointments) {
    const key = appt.scheduled_date;
    if (!apptsByDate.has(key)) apptsByDate.set(key, []);
    apptsByDate.get(key)!.push(appt);
  }

  // Month/year title
  const startMonth = monday.getMonth();
  const endMonth = addDays(monday, 6).getMonth();
  const year = monday.getFullYear();
  const monthTitle =
    startMonth === endMonth
      ? `${MONTH_NAMES[startMonth]} ${year}`
      : `${MONTH_NAMES[startMonth]} – ${MONTH_NAMES[endMonth]} ${year}`;

  const weekNum = getWeekNumber(monday);
  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => CAL_START_HOUR + i);

  // Service legend
  const legendItems = [
    { label: "Control sano", color: "#7DD3C0", bg: "#D6F1EA" },
    { label: "Consulta", color: "#C7B8E8", bg: "#EDE4FF" },
    { label: "Online", color: "#F4A89A", bg: "#FFE2D9" },
  ];

  return (
    <div className="flex flex-col h-full max-w-[1400px] space-y-0">
      {/* ── Header bar ── */}
      <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Nav buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMonday((m) => addDays(m, -7))}
              className="w-8 h-8 rounded-[8px] flex items-center justify-center hover:bg-bg border border-line transition-colors"
            >
              <ChevronLeft size={16} className="text-ink2" />
            </button>
            <button
              onClick={() => setMonday((m) => addDays(m, 7))}
              className="w-8 h-8 rounded-[8px] flex items-center justify-center hover:bg-bg border border-line transition-colors"
            >
              <ChevronRight size={16} className="text-ink2" />
            </button>
          </div>

          {/* Today button */}
          <button
            onClick={() => setMonday(getMondayOfWeek(new Date()))}
            className="px-3 py-1.5 rounded-[8px] text-[12.5px] font-medium border border-line hover:bg-bg transition-colors text-ink2"
          >
            Hoy
          </button>

          {/* Title */}
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-bold text-ink">{monthTitle}</span>
            <span className="text-[11.5px] text-ink3 bg-bg px-2 py-0.5 rounded-full border border-line">
              Semana {weekNum}
            </span>
          </div>

          {/* Locations tabs */}
          {locations.length > 0 && (
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={() => setActiveSede(null)}
                className={cn(
                  "px-3 py-1.5 rounded-[8px] text-[12px] font-medium transition-colors",
                  activeSede === null
                    ? "bg-teal text-white"
                    : "bg-surface border border-line text-ink2 hover:bg-bg"
                )}
              >
                Todas
              </button>
              {locations.map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => setActiveSede(loc.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-[8px] text-[12px] font-medium transition-colors",
                    activeSede === loc.id
                      ? "bg-teal text-white"
                      : "bg-surface border border-line text-ink2 hover:bg-bg"
                  )}
                >
                  {loc.name}
                </button>
              ))}
            </div>
          )}

          {/* New appointment button */}
          <button className="ml-auto flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] bg-teal-dark text-white text-[12.5px] font-semibold hover:opacity-90 transition-opacity">
            <Plus size={14} />
            Nuevo turno
          </button>
        </div>
      </div>

      {/* ── Loading state ── */}
      {apptsQ.isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-5 w-5 rounded-full border-2 border-line border-t-teal animate-spin" />
        </div>
      )}

      {/* ── Weekly grid ── */}
      {!apptsQ.isLoading && (
        <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] overflow-hidden flex flex-col">
          {/* Day headers */}
          <div className="grid border-b border-line" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
            <div className="border-r border-line" /> {/* hour gutter */}
            {weekDays.map((day, i) => {
              const iso = toISO(day);
              const isToday = iso === todayISO;
              const isWeekend = i === 0 || i === 6;
              return (
                <div
                  key={iso}
                  className={cn(
                    "py-3 text-center border-r border-line last:border-r-0",
                    isWeekend && "bg-bg/40"
                  )}
                >
                  <p className="text-[10.5px] font-semibold text-ink3 uppercase tracking-wide">
                    {DAY_ABBREVS[day.getDay()]}
                  </p>
                  <div
                    className={cn(
                      "mx-auto mt-1 w-7 h-7 rounded-full flex items-center justify-center text-[14px] font-bold",
                      isToday ? "bg-teal text-white" : "text-ink"
                    )}
                  >
                    {day.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scrollable grid body */}
          <div
            ref={scrollRef}
            className="overflow-y-auto"
            style={{ maxHeight: `${SLOT_HEIGHT * 10}px` }}
          >
            <div className="grid" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
              {/* Hour labels column */}
              <div className="border-r border-line">
                {hours.map((h) => (
                  <div
                    key={h}
                    className="flex items-start justify-end pr-2"
                    style={{ height: `${SLOT_HEIGHT}px` }}
                  >
                    <span className="text-[10.5px] text-ink3 -translate-y-2">
                      {String(h).padStart(2, "0")}:00
                    </span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekDays.map((day, i) => {
                const iso = toISO(day);
                const isToday = iso === todayISO;
                const isWeekend = i === 0 || i === 6;
                const dayAppts = apptsByDate.get(iso) ?? [];

                return (
                  <div
                    key={iso}
                    className={cn(
                      "relative border-r border-line last:border-r-0",
                      isWeekend && "bg-bg/40"
                    )}
                    style={{ height: `${SLOT_HEIGHT * TOTAL_HOURS}px` }}
                  >
                    {/* Hour grid lines */}
                    {hours.map((h) => (
                      <div
                        key={h}
                        className="absolute left-0 right-0 border-t border-line/60"
                        style={{ top: `${(h - CAL_START_HOUR) * SLOT_HEIGHT}px` }}
                      />
                    ))}

                    {/* Now indicator on today's column */}
                    {isToday && <NowIndicator />}

                    {/* Appointment blocks */}
                    {dayAppts.map((appt) => (
                      <AppointmentBlock key={appt.id} appt={appt} />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Legend ── */}
      <div className="flex items-center gap-4 pt-3">
        <div className="flex items-center gap-1.5 text-[11.5px] text-ink3">
          <CalendarDays size={13} />
          <span>Tipos de atención:</span>
        </div>
        {legendItems.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5 text-[11.5px] text-ink2">
            <span
              className="w-3 h-3 rounded-[3px]"
              style={{ background: item.bg, border: `1.5px solid ${item.color}` }}
            />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}
