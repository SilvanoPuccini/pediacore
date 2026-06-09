import { useQuery } from "@tanstack/react-query";
import { Clock, AlertCircle } from "lucide-react";
import api from "@/lib/api";
import type { WaitlistEntry, PaginatedResponse } from "@/types/api";

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── chips ────────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<
  WaitlistEntry["status"],
  { bg: string; text: string; label: string }
> = {
  WAITING:   { bg: "rgba(125, 211, 192, 0.18)", text: "#3E8E7C", label: "Esperando" },
  NOTIFIED:  { bg: "rgba(245, 212, 160, 0.40)", text: "#9C7423", label: "Notificado" },
  BOOKED:    { bg: "rgba(168, 213, 181, 0.30)", text: "#3F8358", label: "Reservado" },
  CANCELLED: { bg: "rgba(180, 180, 190, 0.25)", text: "#777", label: "Cancelado" },
};

const PRIORITY_MAP: Record<
  WaitlistEntry["priority"],
  { bg: string; text: string; label: string }
> = {
  HIGH:   { bg: "rgba(244, 168, 154, 0.25)", text: "#B5604F", label: "Alta" },
  NORMAL: { bg: "rgba(125, 211, 192, 0.18)", text: "#3E8E7C", label: "Normal" },
  LOW:    { bg: "rgba(180, 180, 190, 0.25)", text: "#777", label: "Baja" },
};

function Chip({ bg, text, label }: { bg: string; text: string; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{ background: bg, color: text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: text }} />
      {label}
    </span>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function WaitlistPage() {
  const { data, isLoading, isError } = useQuery<PaginatedResponse<WaitlistEntry>>({
    queryKey: ["waitlist"],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<WaitlistEntry>>(
        "/waitlist/?page_size=100"
      );
      return data;
    },
    staleTime: 1000 * 60 * 2,
  });

  const entries = data?.results ?? [];

  return (
    <div className="space-y-6 max-w-[1100px]">
      {/* Header */}
      <div>
        <h1 className="text-[20px] font-bold text-ink tracking-tight">Lista de espera</h1>
        <p className="text-[13px] text-ink2 mt-0.5">
          Pacientes en espera de un turno disponible
        </p>
      </div>

      {/* Table card */}
      <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-5 w-5 rounded-full border-2 border-line border-t-teal animate-spin" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-ink3">
            <AlertCircle size={28} className="opacity-40" />
            <p className="text-[13px]">Error al cargar la lista de espera</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-ink3">
            <Clock size={32} className="opacity-40" />
            <p className="text-[14px]">Sin pacientes en lista de espera</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-5 py-3 text-left text-[11.5px] font-semibold text-ink3 uppercase tracking-wide">
                    Paciente
                  </th>
                  <th className="px-5 py-3 text-left text-[11.5px] font-semibold text-ink3 uppercase tracking-wide">
                    Servicio
                  </th>
                  <th className="px-5 py-3 text-left text-[11.5px] font-semibold text-ink3 uppercase tracking-wide">
                    Sede
                  </th>
                  <th className="px-5 py-3 text-left text-[11.5px] font-semibold text-ink3 uppercase tracking-wide">
                    Prioridad
                  </th>
                  <th className="px-5 py-3 text-left text-[11.5px] font-semibold text-ink3 uppercase tracking-wide">
                    Estado
                  </th>
                  <th className="px-5 py-3 text-left text-[11.5px] font-semibold text-ink3 uppercase tracking-wide">
                    Fecha
                  </th>
                  <th className="px-5 py-3 text-left text-[11.5px] font-semibold text-ink3 uppercase tracking-wide">
                    Notas
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {entries.map((entry) => {
                  const status = STATUS_MAP[entry.status];
                  const priority = PRIORITY_MAP[entry.priority];
                  return (
                    <tr key={entry.id} className="hover:bg-bg transition-colors">
                      <td className="px-5 py-3.5 text-[13px] font-semibold text-ink">
                        {entry.patient_name}
                      </td>
                      <td className="px-5 py-3.5 text-[13px] text-ink2">
                        {entry.service_name}
                      </td>
                      <td className="px-5 py-3.5 text-[13px] text-ink2">
                        {entry.location_name}
                      </td>
                      <td className="px-5 py-3.5">
                        <Chip {...priority} />
                      </td>
                      <td className="px-5 py-3.5">
                        <Chip {...status} />
                      </td>
                      <td className="px-5 py-3.5 text-[12.5px] text-ink2">
                        {formatDate(entry.created_at)}
                      </td>
                      <td className="px-5 py-3.5 text-[12.5px] text-ink3 max-w-[200px] truncate">
                        {entry.notes || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && (
        <p className="text-[12px] text-ink3">
          {data.count} entrada{data.count !== 1 ? "s" : ""} en total
        </p>
      )}
    </div>
  );
}
