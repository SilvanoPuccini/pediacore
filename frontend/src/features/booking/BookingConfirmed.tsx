import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Download } from "lucide-react";
import SEOHead from "@/components/seo/SEOHead";
import api from "@/lib/api";
import { useBookingStore } from "./store/bookingStore";
import { useLocations, useServices, useMyPatients } from "./hooks/useBookingQueries";
import { formatDisplayDate, formatTime } from "./utils";
import type { Appointment, InvoiceListItem, PaginatedResponse } from "@/types/api";
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
    appointmentId: storeAppointmentId,
    reset,
  } = useBookingStore();

  // MercadoPago redirect params
  const mpStatus = searchParams.get("collection_status") ?? searchParams.get("status");
  const isFromMP = !!searchParams.get("payment_id") || !!searchParams.get("collection_id");

  // Try URL appointment_id first (MP redirect), fall back to store
  const appointmentIdFromUrl = searchParams.get("appointment_id");
  const effectiveAppointmentId = appointmentIdFromUrl
    ? Number(appointmentIdFromUrl)
    : storeAppointmentId;

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

  // Fallback: fetch appointment from API if store is empty (e.g. fresh page load after MP redirect)
  const { data: appointmentData } = useQuery({
    queryKey: ["appointment-confirmed", effectiveAppointmentId],
    queryFn: () =>
      api.get<Appointment>(`/appointments/${effectiveAppointmentId}/`).then((r) => r.data),
    enabled: !!effectiveAppointmentId && !selectedDate,
  });

  const displayDate = selectedDate ?? appointmentData?.scheduled_date ?? null;
  const displaySlot = selectedSlot ?? (appointmentData ? { start_time: appointmentData.start_time, end_time: appointmentData.end_time ?? "" } : null);
  const displayPatient = selectedPatient ?? (appointmentData ? { full_name: appointmentData.patient_name, first_name: appointmentData.patient_name?.split(" ")[0] ?? "" } : null);
  const displayLocation = selectedLocation ?? (appointmentData ? { name: appointmentData.location_name } : null);

  // If no appointment AND not coming from MercadoPago, redirect to booking
  useEffect(() => {
    if (!effectiveAppointmentId && !isFromMP && !selectedDate && !appointmentIdFromUrl) {
      navigate("/booking");
    }
  }, [effectiveAppointmentId, isFromMP, selectedDate, appointmentIdFromUrl, navigate]);

  const isApproved = !mpStatus || mpStatus === "approved";
  const isPending = mpStatus === "pending" || mpStatus === "in_process";
  const isFailed = mpStatus && !isApproved && !isPending;

  const { data: invoicesResp } = useQuery<PaginatedResponse<InvoiceListItem>>({
    queryKey: ["invoices-confirmed", effectiveAppointmentId],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<InvoiceListItem>>("/invoices/");
      return data;
    },
    enabled: isApproved && !!effectiveAppointmentId,
    // Poll every 3s when coming back from MP and webhook hasn't created the invoice yet
    refetchInterval: (query) =>
      isFromMP && !query.state.data?.results?.some((inv) => inv.has_pdf) ? 3000 : false,
  });

  const invoice = useMemo(() => {
    if (!invoicesResp?.results || !effectiveAppointmentId) return null;
    return invoicesResp.results.find((inv) => inv.has_pdf) ?? null;
  }, [invoicesResp, effectiveAppointmentId]);

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
    if (!displayDate || !displaySlot?.start_time) return "#";
    const [y, m, d] = displayDate.split("-");
    const [sh, sm] = displaySlot.start_time.split(":");
    const endTime = displaySlot.end_time || displaySlot.start_time;
    const [eh, em] = endTime.split(":");
    const start = `${y}${m}${d}T${sh}${sm}00`;
    const end = `${y}${m}${d}T${eh}${em}00`;
    const title = encodeURIComponent(`Pediatra - ${selectedService?.name ?? "Consulta"}`);
    const location = encodeURIComponent(displayLocation?.name ?? "");
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&location=${location}`;
  }

  // Failed payment
  if (isFailed) {
    return (
    <div className="max-w-[560px] mx-auto px-4 pt-[110px] pb-12">
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
    <div className="max-w-[560px] mx-auto px-4 pt-[110px] pb-12">
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
        {(displayDate || displayLocation || displayPatient) && (
          <div className="space-y-3">
            {displayDate && (
              <div className="flex items-start gap-2.5">
                <svg className="w-4 h-4 mt-0.5 shrink-0 text-ink2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                <div>
                  <p className="text-[14px] font-semibold text-ink capitalize">
                    {formatDisplayDate(displayDate)}
                    {displaySlot && `, ${formatTime(displaySlot.start_time)}`}
                  </p>
                </div>
              </div>
            )}

            {displayLocation && (
              <div className="flex items-start gap-2.5">
                <svg className="w-4 h-4 mt-0.5 shrink-0 text-ink2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                <p className="text-[14px] font-semibold text-ink">{displayLocation.name}</p>
              </div>
            )}

            {displayPatient && (
              <div className="flex items-start gap-2.5">
                <svg className="w-4 h-4 mt-0.5 shrink-0 text-ink2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                <p className="text-[14px] font-semibold text-ink">
                  {displayPatient.full_name ?? displayPatient.first_name}
                </p>
              </div>
            )}
          </div>
        )}

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

      {/* Profile completion nudge — only when patient data comes from the full store */}
      {selectedPatient && selectedPatient.profile_completion && selectedPatient.profile_completion.percentage < 100 && (
        <div className="bg-cream rounded-[16px] p-5 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-4 h-4 mt-0.5 shrink-0 text-ink2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
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
          {displayDate && displaySlot?.start_time && (
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
