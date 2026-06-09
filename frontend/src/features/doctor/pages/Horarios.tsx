import { useQuery } from "@tanstack/react-query";
import { Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import type { WorkingHours, Location, PaginatedResponse } from "@/types/api";

// ─── constants ────────────────────────────────────────────────────────────────

const DAY_NAMES = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

// day_of_week: 0=Monday ... 6=Sunday (Django convention)
const DAYS = [0, 1, 2, 3, 4, 5, 6];

function formatTime(t: string) {
  return t.slice(0, 5);
}

// ─── per-location grid ────────────────────────────────────────────────────────

function LocationGrid({
  location,
  hours,
}: {
  location: Location;
  hours: WorkingHours[];
}) {
  const byDay = Object.fromEntries(
    DAYS.map((d) => [d, hours.filter((h) => h.day_of_week === d)])
  );

  return (
    <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] overflow-hidden">
      {/* Location header */}
      <div className="px-5 py-4 border-b border-line">
        <h2 className="text-[15px] font-bold text-ink">{location.name}</h2>
        <p className="text-[12px] text-ink3 mt-0.5">{location.address}, {location.city}</p>
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 divide-x divide-line/60">
        {DAYS.map((day) => {
          const dayHours = byDay[day] ?? [];
          const active = dayHours.filter((h) => h.is_active);
          const inactive = dayHours.filter((h) => !h.is_active);
          const hasAny = dayHours.length > 0;

          return (
            <div key={day} className="flex flex-col">
              {/* Day name header */}
              <div
                className={cn(
                  "px-2 py-2.5 text-center border-b border-line/60",
                  hasAny ? "bg-teal/8" : "bg-bg"
                )}
              >
                <span
                  className={cn(
                    "text-[11px] font-semibold",
                    hasAny ? "text-teal-dark" : "text-ink3"
                  )}
                >
                  {DAY_NAMES[day]}
                </span>
              </div>

              {/* Slots */}
              <div className="flex flex-col gap-1.5 p-2 min-h-[80px]">
                {active.length === 0 && inactive.length === 0 && (
                  <span className="text-[10.5px] text-ink3/60 text-center mt-2">—</span>
                )}
                {active.map((h) => (
                  <div
                    key={h.id}
                    className="rounded-[8px] px-1.5 py-1 text-center"
                    style={{ background: "rgba(125, 211, 192, 0.18)" }}
                  >
                    <span className="text-[10.5px] font-semibold text-teal-dark block leading-tight">
                      {formatTime(h.start_time)}
                    </span>
                    <span className="text-[10px] text-teal-dark/70 block">
                      {formatTime(h.end_time)}
                    </span>
                  </div>
                ))}
                {inactive.map((h) => (
                  <div
                    key={h.id}
                    className="rounded-[8px] px-1.5 py-1 text-center"
                    style={{ background: "rgba(180, 180, 190, 0.15)" }}
                  >
                    <span className="text-[10.5px] font-semibold text-ink3 block leading-tight line-through">
                      {formatTime(h.start_time)}
                    </span>
                    <span className="text-[10px] text-ink3/60 block line-through">
                      {formatTime(h.end_time)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function HorariosPage() {
  const hoursQ = useQuery<WorkingHours[]>({
    queryKey: ["working-hours"],
    queryFn: async () => {
      const { data } = await api.get<WorkingHours[]>("/working-hours/");
      return data;
    },
    staleTime: 1000 * 60 * 10,
  });

  const locationsQ = useQuery<PaginatedResponse<Location>>({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Location>>("/locations/");
      return data;
    },
    staleTime: 1000 * 60 * 60,
  });

  const hours = hoursQ.data ?? [];
  const locations = locationsQ.data?.results ?? [];
  const isLoading = hoursQ.isLoading || locationsQ.isLoading;
  const isError = hoursQ.isError || locationsQ.isError;

  return (
    <div className="space-y-6 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-[20px] font-bold text-ink tracking-tight">Horarios de atención</h1>
          <p className="text-[13px] text-ink2 mt-0.5">
            Franjas horarias configuradas por sede
          </p>
        </div>
        <button
          onClick={() => window.open("/admin/scheduling/workinghours/", "_blank")}
          className="text-[12px] font-semibold px-3.5 py-2 rounded-[10px] bg-teal-dark text-white hover:opacity-90 transition-opacity"
        >
          Editar en admin
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[11.5px] text-ink2">
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-[4px]"
            style={{ background: "rgba(125, 211, 192, 0.35)" }}
          />
          Activo
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-[4px]"
            style={{ background: "rgba(180, 180, 190, 0.25)" }}
          />
          Inactivo
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-5 w-5 rounded-full border-2 border-line border-t-teal animate-spin" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-ink3">
          <AlertCircle size={28} className="opacity-40" />
          <p className="text-[13px]">Error al cargar los horarios</p>
        </div>
      ) : locations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-ink3">
          <Clock size={32} className="opacity-40" />
          <p className="text-[14px]">Sin sedes configuradas</p>
        </div>
      ) : (
        <div className="space-y-5">
          {locations.map((loc) => (
            <LocationGrid
              key={loc.id}
              location={loc}
              hours={hours.filter((h) => h.location === loc.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
