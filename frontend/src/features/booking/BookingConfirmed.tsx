import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Download } from "lucide-react";
import SEOHead from "@/components/seo/SEOHead";
import api from "@/lib/api";
import { useBookingStore } from "./store/bookingStore";
import { useLocations, useServices, useMyPatients } from "./hooks/useBookingQueries";
import { formatDisplayDate, formatTime } from "./utils";
import type { InvoiceListItem, PaginatedResponse } from "@/types/api";
import { useQuery } from "@tanstack/react-query";

export default function BookingConfirmed() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    locationId,
    serviceId,
    selectedDate,
    selectedSlot,
    patientId,
    appointmentId,
    reset,
  } = useBookingStore();

  // MercadoPago redirect params
  const mpStatus = searchParams.get("collection_status") ?? searchParams.get("status");
  const isFromMP = !!searchParams.get("payment_id") || !!searchParams.get("collection_id");

  const { data: locationsResp } = useLocations();
  const { data: servicesResp } = useServices();
  const { data: patientsResp } = useMyPatients();

  const locations = locationsResp?.results ?? [];
  const services = servicesResp?.results ?? [];
  const patients = patientsResp?.results ?? [];

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId) ?? null,
    [services, serviceId]
  );

  const selectedLocation = useMemo(
    () =>
      locationId === "online"
        ? { name: "Atención Online", address: "Videollamada por Google Meet", city: "" }
        : locations.find((l) => l.id === locationId) ?? null,
    [locations, locationId]
  );

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === patientId) ?? null,
    [patients, patientId]
  );

  // If no appointment AND not coming from MercadoPago, redirect to booking
  useEffect(() => {
    if (!appointmentId && !isFromMP && !selectedDate) {
      navigate("/booking");
    }
  }, [appointmentId, isFromMP, selectedDate, navigate]);

  const isApproved = !mpStatus || mpStatus === "approved";
  const isPending = mpStatus === "pending" || mpStatus === "in_process";
  const isFailed = mpStatus && !isApproved && !isPending;

  const { data: invoicesResp } = useQuery<PaginatedResponse<InvoiceListItem>>({
    queryKey: ["invoices-confirmed", appointmentId],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<InvoiceListItem>>("/invoices/");
      return data;
    },
    enabled: isApproved && !!appointmentId,
  });

  const invoice = useMemo(() => {
    if (!invoicesResp?.results || !appointmentId) return null;
    return invoicesResp.results.find((inv) => inv.has_pdf) ?? null;
  }, [invoicesResp, appointmentId]);

  const [downloading, setDownloading] = useState(false);

  async function handleDownloadInvoice() {
    if (!invoice) return;
    setDownloading(true);
    try {
      const response = await api.get(`/invoices/${invoice.id}/download/`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(response.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `comprobante-${invoice.invoice_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  function handleNewBooking() {
    reset();
    navigate("/booking");
  }

  function getCalendarUrl(): string {
    if (!selectedDate || !selectedSlot || !selectedService) return "#";
    const [y, m, d] = selectedDate.split("-");
    const [sh, sm] = selectedSlot.start_time.split(":");
    const [eh, em] = selectedSlot.end_time.split(":");
    const start = `${y}${m}${d}T${sh}${sm}00`;
    const end = `${y}${m}${d}T${eh}${em}00`;
    const title = encodeURIComponent(`Pediatra - ${selectedService.name}`);
    const location = encodeURIComponent(selectedLocation?.name ?? "");
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&location=${location}`;
  }

  // Failed payment
  if (isFailed) {
    return (
      <div className="max-w-[560px] mx-auto px-4 py-12">
        <SEOHead title="Pago no completado" description="El pago no se pudo completar." url="https://estefipediatra.com/booking/confirmed" />
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-coral/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="font-display text-[28px] font-semibold text-ink">Pago no completado</h1>
          <p className="text-[14px] text-ink2 mt-2">El pago no se pudo completar. Podés intentar de nuevo.</p>
        </div>
        <button
          onClick={handleNewBooking}
          className="w-full bg-teal-dark text-white rounded-[12px] px-5 py-3 font-semibold text-[13px] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-cta)]"
        >
          Intentar de nuevo
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[560px] mx-auto px-4 py-12">
      <SEOHead
        title="Turno confirmado"
        description="Tu turno pediátrico ha sido confirmado."
        url="https://estefipediatra.com/booking/confirmed"
      />

      {/* Success icon */}
      <div className="text-center mb-6">
        {isPending ? (
          <>
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="font-display text-[28px] font-semibold text-ink">Pago en proceso</h1>
            <p className="text-[14px] text-ink2 mt-2">Tu pago está siendo procesado. Te notificaremos cuando se confirme.</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="font-display text-[28px] font-semibold text-ink">
              ¡Tu turno está confirmado!
            </h1>
          </>
        )}
      </div>

      {/* Appointment details */}
      <div className="bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] p-6 mb-6">
        <div className="space-y-3">
          {selectedDate && (
            <div className="flex items-start gap-2.5">
              <span className="text-[16px]">📅</span>
              <div>
                <p className="text-[14px] font-semibold text-ink capitalize">
                  {formatDisplayDate(selectedDate)}
                  {selectedSlot && `, ${formatTime(selectedSlot.start_time)}`}
                </p>
              </div>
            </div>
          )}

          {selectedLocation && (
            <div className="flex items-start gap-2.5">
              <span className="text-[16px]">📍</span>
              <p className="text-[14px] font-semibold text-ink">{selectedLocation.name}</p>
            </div>
          )}

          {selectedPatient && (
            <div className="flex items-start gap-2.5">
              <span className="text-[16px]">👶</span>
              <p className="text-[14px] font-semibold text-ink">
                {selectedPatient.full_name}
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-line mt-4 pt-4">
          <p className="text-[13px] text-ink2">Te enviamos un email con:</p>
          <ul className="mt-2 space-y-1.5">
            <li className="flex items-center gap-2 text-[13px] text-ink2">
              <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Comprobante de pago
            </li>
            <li className="flex items-center gap-2 text-[13px] text-ink2">
              <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Detalles del turno
            </li>
            <li className="flex items-center gap-2 text-[13px] text-ink2">
              <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Recordatorios automáticos
            </li>
          </ul>
        </div>
      </div>

      {/* Profile completion nudge */}
      {selectedPatient && selectedPatient.profile_completion && selectedPatient.profile_completion.percentage < 100 && (
        <div className="bg-cream rounded-[16px] p-5 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-[16px]">📝</span>
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-ink">
                Completá el perfil de {selectedPatient.first_name} ({selectedPatient.profile_completion.percentage}% completo)
              </p>
              <p className="text-[13px] text-ink2 mt-0.5">
                Ayudanos a darte mejor atención completando los datos del paciente.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        <button
          onClick={() => { reset(); navigate("/portal/turnos"); }}
          className="w-full bg-teal-dark text-white rounded-[12px] px-5 py-3 font-semibold text-[13px] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-cta)]"
        >
          Ver mis turnos
        </button>
        <div className="flex gap-3">
          <button
            onClick={handleNewBooking}
            className="flex-1 bg-surface border border-line text-ink rounded-[12px] px-5 py-3 font-semibold text-[13px] hover:bg-cream transition-colors"
          >
            Reservar otro turno
          </button>
          {selectedDate && selectedSlot && selectedService && (
            <a
              href={getCalendarUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-surface border border-line text-ink rounded-[12px] px-5 py-3 font-semibold text-[13px] hover:bg-cream transition-colors text-center"
            >
              Agregar al calendario
            </a>
          )}
        </div>
        {invoice && (
          <button
            onClick={handleDownloadInvoice}
            disabled={downloading}
            className="w-full flex items-center justify-center gap-2 bg-surface border border-line text-ink rounded-[12px] px-5 py-3 font-semibold text-[13px] hover:bg-cream transition-colors disabled:opacity-50"
          >
            <Download size={15} />
            {downloading ? "Descargando..." : "Descargar comprobante"}
          </button>
        )}
      </div>
    </div>
  );
}
