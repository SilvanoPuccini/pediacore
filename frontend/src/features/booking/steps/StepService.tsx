import { useMemo, useState } from "react";
import { useBookingStore } from "../store/bookingStore";
import { useLocations, useServices } from "../hooks/useBookingQueries";
import { formatPrice } from "../utils";
import Skeleton from "../components/Skeleton";
import type { Service } from "@/types/api";

// ─── FONASA Modal ────────────────────────────────────────────────────────────

function FonasaModal({
  serviceName,
  servicePrice,
  onClose,
  onContinue,
}: {
  serviceName: string;
  servicePrice: number;
  onClose: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-surface rounded-[20px] shadow-[var(--shadow-soft)] max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="font-display text-[18px] font-semibold text-ink">
            Consulta FONASA
          </h3>
        </div>

        <p className="text-[14px] text-ink2 mb-3">
          Elegiste <span className="font-semibold text-ink">{serviceName}</span> con
          cobertura FONASA ({formatPrice(servicePrice)}).
        </p>

        <p className="text-[14px] text-ink2 mb-2">
          Para continuar necesitás presentar el:
        </p>
        <ul className="text-[13px] text-ink2 space-y-1.5 mb-4 ml-1">
          <li className="flex items-start gap-2">
            <svg className="w-4 h-4 text-teal shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Certificado de afiliación FONASA vigente del paciente (el niño/a)</span>
          </li>
        </ul>

        <div className="border-t border-line pt-4 mb-5">
          <p className="text-[13px] text-ink3">
            Si no contás con FONASA, podés elegir la opción particular sin necesidad de certificado.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-[12px] border border-line text-[13px] font-semibold text-ink2 hover:bg-cream transition-colors"
          >
            Volver
          </button>
          <button
            onClick={onContinue}
            className="flex-1 px-4 py-2.5 rounded-[12px] bg-teal-dark text-white text-[13px] font-semibold transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-cta)]"
          >
            Continuar con FONASA
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Coordination Modal ──────────────────────────────────────────────────────

function CoordinationModal({
  serviceName,
  onClose,
}: {
  serviceName: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-surface rounded-[20px] shadow-[var(--shadow-soft)] max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="font-display text-[18px] font-semibold text-ink">
            Coordinar directo
          </h3>
        </div>

        <p className="text-[14px] text-ink2 mb-4">
          El servicio <span className="font-semibold text-ink">{serviceName}</span> requiere
          coordinación directa con el centro para definir día y horario.
        </p>

        <div className="space-y-3 mb-5">
          <a
            href="https://wa.me/56912345678?text=Hola%2C%20quiero%20coordinar%20un%20turno"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-[12px] bg-green-600 text-white text-[13px] font-semibold transition-all hover:-translate-y-0.5"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            </svg>
            WhatsApp
          </a>
          <a
            href="mailto:contacto@estefipediatra.com?subject=Coordinación de turno"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-[12px] border border-line text-[13px] font-semibold text-ink2 hover:bg-cream transition-colors"
          >
            Enviar email
          </a>
        </div>

        <button
          onClick={onClose}
          className="w-full text-center text-[13px] text-ink3 hover:text-ink transition-colors"
        >
          Volver a servicios
        </button>
      </div>
    </div>
  );
}

// ─── Service Card (enhanced) ─────────────────────────────────────────────────

function ServiceCardEnhanced({
  service,
  isSelected,
  onClick,
}: {
  service: Service;
  isSelected: boolean;
  onClick: () => void;
}) {
  const isManual = service.requires_manual_coordination;

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
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-[15px] text-ink">{service.name}</p>
            {service.requires_fonasa_validation && (
              <span className="text-[11px] font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                FONASA
              </span>
            )}
            {isManual && (
              <span className="text-[11px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                COORDINAR
              </span>
            )}
          </div>
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
            <span className="text-[12px] text-ink3">
              {service.modality_display}
            </span>
          </div>
          {isManual && (
            <p className="text-[12px] text-amber-700 mt-1.5">
              → Coordinar día y horario directamente con el centro
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <span className="text-[14px] font-semibold text-teal-dark">
            {formatPrice(service.price_clp)}
          </span>
          {isSelected && (
            <div className="w-5 h-5 rounded-full bg-teal flex items-center justify-center mt-2 ml-auto">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function StepService() {
  const { locationId, serviceId, setService, setStep } = useBookingStore();
  const { data: locationsResp } = useLocations();
  const { data: servicesResp, isLoading: servicesLoading } = useServices();

  const [showFonasaModal, setShowFonasaModal] = useState(false);
  const [showCoordModal, setShowCoordModal] = useState(false);
  const [pendingService, setPendingService] = useState<Service | null>(null);

  const locations = locationsResp?.results ?? [];
  const services = servicesResp?.results ?? [];

  const selectedLocation = useMemo(
    () =>
      locationId === "online"
        ? { id: "online" as const, name: "Atención Online" }
        : locations.find((l) => l.id === locationId) ?? null,
    [locations, locationId]
  );

  const filteredServices = useMemo<Service[]>(() => {
    if (!services || locationId === null) return [];
    if (locationId === "online") {
      return services.filter(
        (s) => (s.modality === "ONLINE" || s.modality === "PRESENCIAL_Y_ONLINE") && s.is_active
      );
    }
    return services.filter(
      (s) => s.is_active && s.locations.includes(locationId as number)
    );
  }, [services, locationId]);

  function handleServiceSelect(svc: Service) {
    if (svc.requires_manual_coordination) {
      setPendingService(svc);
      setShowCoordModal(true);
      return;
    }
    if (svc.requires_fonasa_validation) {
      setPendingService(svc);
      setShowFonasaModal(true);
      return;
    }
    setService(svc.id);
    setStep(3);
  }

  function handleFonasaContinue() {
    if (pendingService) {
      setService(pendingService.id);
      setShowFonasaModal(false);
      setPendingService(null);
      setStep(3);
    }
  }

  return (
    <div className="space-y-6">
      {/* Volver */}
      <button
        onClick={() => setStep(1)}
        className="flex items-center gap-1.5 text-[13px] text-ink2 hover:text-ink transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Volver
      </button>

      {/* Location chip */}
      <div className="flex items-center gap-2">
        <span className="bg-cream text-teal-dark text-[12px] font-semibold px-3 py-1 rounded-full">
          {selectedLocation?.name} · {locationId === "online" ? "Online" : "Presencial"}
        </span>
      </div>

      <section>
        <h2 className="font-semibold text-[18px] text-ink mb-1">
          2. Elegí el servicio
        </h2>
        <p className="text-[14px] text-ink2 mb-4">
          Seleccioná el tipo de consulta que necesitás.
        </p>

        {servicesLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-[90px]" />
            <Skeleton className="h-[90px]" />
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="bg-cream rounded-[14px] px-5 py-4 text-[14px] text-ink2">
            No hay servicios disponibles para esta sede.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredServices.map((svc) => (
              <ServiceCardEnhanced
                key={svc.id}
                service={svc}
                isSelected={serviceId === svc.id}
                onClick={() => handleServiceSelect(svc)}
              />
            ))}
          </div>
        )}
      </section>

      {showFonasaModal && pendingService && (
        <FonasaModal
          serviceName={pendingService.name}
          servicePrice={pendingService.price_clp}
          onClose={() => {
            setShowFonasaModal(false);
            setPendingService(null);
          }}
          onContinue={handleFonasaContinue}
        />
      )}

      {showCoordModal && pendingService && (
        <CoordinationModal
          serviceName={pendingService.name}
          onClose={() => {
            setShowCoordModal(false);
            setPendingService(null);
          }}
        />
      )}
    </div>
  );
}
