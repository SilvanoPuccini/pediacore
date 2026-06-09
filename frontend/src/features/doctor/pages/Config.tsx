import { useQuery } from "@tanstack/react-query";
import { MapPin, Stethoscope, ExternalLink, Info, AlertCircle } from "lucide-react";
import api from "@/lib/api";
import type { Location, Service, PaginatedResponse } from "@/types/api";

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatCLP(amount: number): string {
  return `$${amount.toLocaleString("es-CL")}`;
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function ConfigPage() {
  const locationsQ = useQuery<PaginatedResponse<Location>>({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Location>>("/locations/");
      return data;
    },
    staleTime: 1000 * 60 * 60,
  });

  const servicesQ = useQuery<PaginatedResponse<Service>>({
    queryKey: ["services"],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Service>>("/services/");
      return data;
    },
    staleTime: 1000 * 60 * 60,
  });

  const locations = locationsQ.data?.results ?? [];
  const services = servicesQ.data?.results ?? [];
  const isLoading = locationsQ.isLoading || servicesQ.isLoading;
  const isError = locationsQ.isError || servicesQ.isError;

  return (
    <div className="space-y-6 max-w-[900px]">
      {/* Header */}
      <div>
        <h1 className="text-[20px] font-bold text-ink tracking-tight">Configuración</h1>
        <p className="text-[13px] text-ink2 mt-0.5">
          Sedes, servicios y datos del consultorio
        </p>
      </div>

      {/* Info banner */}
      <div
        className="flex items-start gap-3 px-4 py-3.5 rounded-[12px] border"
        style={{
          background: "rgba(125, 211, 192, 0.10)",
          borderColor: "rgba(125, 211, 192, 0.35)",
        }}
      >
        <Info size={16} className="text-teal-dark shrink-0 mt-0.5" />
        <p className="text-[12.5px] text-teal-dark leading-relaxed">
          Para editar la configuración, usá el panel de administración. Los cambios se
          reflejan aquí automáticamente.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-5 w-5 rounded-full border-2 border-line border-t-teal animate-spin" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-ink3">
          <AlertCircle size={28} className="opacity-40" />
          <p className="text-[13px]">Error al cargar la configuración</p>
        </div>
      ) : (
        <>
          {/* Locations section */}
          <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-teal-dark" />
                <h2 className="text-[15px] font-bold text-ink">Sedes</h2>
              </div>
              <button
                onClick={() => window.open("/admin/practice/location/", "_blank")}
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-teal-dark hover:underline"
              >
                Administrar <ExternalLink size={11} />
              </button>
            </div>

            {locations.length === 0 ? (
              <div className="px-5 py-8 text-center text-[13px] text-ink3">
                Sin sedes configuradas
              </div>
            ) : (
              <div className="divide-y divide-line/60">
                {locations.map((loc) => (
                  <div key={loc.id} className="px-5 py-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13.5px] font-semibold text-ink">
                          {loc.name}
                        </span>
                        {!loc.is_active && (
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              background: "rgba(180, 180, 190, 0.25)",
                              color: "#777",
                            }}
                          >
                            Inactiva
                          </span>
                        )}
                      </div>
                      <p className="text-[12.5px] text-ink2 mt-0.5">
                        {loc.address}, {loc.city}
                      </p>
                      {loc.display_hours && (
                        <p className="text-[11.5px] text-ink3 mt-0.5">{loc.display_hours}</p>
                      )}
                      {loc.phone && (
                        <p className="text-[11.5px] text-ink3 mt-0.5">{loc.phone}</p>
                      )}
                    </div>
                    <button
                      onClick={() =>
                        window.open(`/admin/practice/location/${loc.id}/change/`, "_blank")
                      }
                      className="shrink-0 text-[11.5px] font-semibold text-ink2 hover:text-teal-dark transition-colors inline-flex items-center gap-1"
                    >
                      Editar <ExternalLink size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Services section */}
          <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <div className="flex items-center gap-2">
                <Stethoscope size={16} className="text-teal-dark" />
                <h2 className="text-[15px] font-bold text-ink">Servicios</h2>
              </div>
              <button
                onClick={() => window.open("/admin/practice/service/", "_blank")}
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-teal-dark hover:underline"
              >
                Administrar <ExternalLink size={11} />
              </button>
            </div>

            {services.length === 0 ? (
              <div className="px-5 py-8 text-center text-[13px] text-ink3">
                Sin servicios configurados
              </div>
            ) : (
              <div className="divide-y divide-line/60">
                {services
                  .slice()
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((svc) => (
                    <div
                      key={svc.id}
                      className="px-5 py-4 flex items-start justify-between gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13.5px] font-semibold text-ink">
                            {svc.name}
                          </span>
                          {!svc.is_active && (
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{
                                background: "rgba(180, 180, 190, 0.25)",
                                color: "#777",
                              }}
                            >
                              Inactivo
                            </span>
                          )}
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              background: "rgba(199, 184, 232, 0.25)",
                              color: "#6B569E",
                            }}
                          >
                            {svc.modality_display}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-[12px] text-ink2">
                          <span>{svc.duration_minutes} min</span>
                          <span className="text-ink3">·</span>
                          <span className="font-semibold text-ink">
                            {formatCLP(svc.price_clp)}
                          </span>
                        </div>
                        {svc.description && (
                          <p className="text-[11.5px] text-ink3 mt-1 line-clamp-2">
                            {svc.description}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() =>
                          window.open(
                            `/admin/practice/service/${svc.id}/change/`,
                            "_blank"
                          )
                        }
                        className="shrink-0 text-[11.5px] font-semibold text-ink2 hover:text-teal-dark transition-colors inline-flex items-center gap-1"
                      >
                        Editar <ExternalLink size={11} />
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
