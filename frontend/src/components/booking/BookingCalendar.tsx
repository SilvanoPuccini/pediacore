import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import SEOHead from "@/components/seo/SEOHead";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import type { Location, Service, AvailableSlot, AppointmentCreate, Patient, Appointment, PaginatedResponse } from "@/types/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const PRACTICE_SLUG = "dra-estefi";
const PRACTICE_ID = 1;
const DOCTOR_ID = 1;

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const WEEKDAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(timeStr: string): string {
  // "09:00:00" → "09:00"
  return timeStr.slice(0, 5);
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString("es-CL", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function formatPrice(price: string): string {
  const num = parseFloat(price);
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(num);
}

// ─── Step Indicator ────────────────────────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { number: 1, label: "Sede y servicio" },
    { number: 2, label: "Fecha y hora" },
    { number: 3, label: "Confirmación" },
  ];

  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((step, idx) => (
        <div key={step.number} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={[
                "w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-semibold transition-colors",
                currentStep > step.number
                  ? "bg-teal-dark text-white"
                  : currentStep === step.number
                  ? "bg-teal text-white"
                  : "bg-line text-ink3",
              ].join(" ")}
            >
              {currentStep > step.number ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step.number
              )}
            </div>
            <span
              className={[
                "text-[11px] mt-1 font-medium whitespace-nowrap",
                currentStep >= step.number ? "text-teal-dark" : "text-ink3",
              ].join(" ")}
            >
              {step.label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div
              className={[
                "h-[2px] w-12 sm:w-20 mx-1 mb-4 rounded-full transition-colors",
                currentStep > step.number ? "bg-teal-dark" : "bg-line",
              ].join(" ")}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Location Card ─────────────────────────────────────────────────────────────

function LocationCard({
  location,
  isSelected,
  onClick,
}: {
  location: Location | { id: "online"; name: string; address: string; city: string };
  isSelected: boolean;
  onClick: () => void;
}) {
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
      <div className="flex items-start gap-3">
        <div
          className={[
            "w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 mt-0.5",
            isSelected ? "bg-teal text-white" : "bg-cream text-teal-dark",
          ].join(" ")}
        >
          {location.id === "online" ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </div>
        <div>
          <p className="font-semibold text-[15px] text-ink">{location.name}</p>
          <p className="text-[13px] text-ink2 mt-0.5">{location.address}</p>
          <p className="text-[12px] text-ink3">{location.city}</p>
        </div>
        {isSelected && (
          <div className="ml-auto">
            <div className="w-5 h-5 rounded-full bg-teal flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </button>
  );
}

// ─── Service Card ──────────────────────────────────────────────────────────────

function ServiceCard({
  service,
  isSelected,
  onClick,
}: {
  service: Service;
  isSelected: boolean;
  onClick: () => void;
}) {
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
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="font-semibold text-[15px] text-ink">{service.name}</p>
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
            <span className="text-[13px] font-semibold text-teal-dark">
              {formatPrice(service.price)}
            </span>
          </div>
        </div>
        {isSelected && (
          <div className="w-5 h-5 rounded-full bg-teal flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
    </button>
  );
}

// ─── Mini Calendar ─────────────────────────────────────────────────────────────

function MiniCalendar({
  selectedDate,
  onSelectDate,
}: {
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 30);

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
    return date < today || date > maxDate;
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

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-line/60 rounded-[10px] ${className ?? ""}`} />;
}

// ─── Main BookingCalendar ──────────────────────────────────────────────────────

export default function BookingCalendar() {
  const { user, isAuthenticated } = useAuthStore();

  // Step state
  const [step, setStep] = useState(1);

  // Step 1 selections
  const [selectedLocationId, setSelectedLocationId] = useState<number | "online" | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);

  // Step 2 selections
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);

  // Step 3
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);

  // ── Data fetching ────────────────────────────────────────────────────────────

  const { data: locationsResp, isLoading: locationsLoading } = useQuery<PaginatedResponse<Location>>({
    queryKey: ["locations", PRACTICE_SLUG],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Location>>(`/practices/${PRACTICE_SLUG}/locations/`);
      return data;
    },
  });
  const locations = locationsResp?.results ?? [];

  const { data: servicesResp, isLoading: servicesLoading } = useQuery<PaginatedResponse<Service>>({
    queryKey: ["services", PRACTICE_SLUG],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Service>>(`/practices/${PRACTICE_SLUG}/services/`);
      return data;
    },
  });
  const services = servicesResp?.results ?? [];

  const { data: slots, isLoading: slotsLoading } = useQuery<AvailableSlot[]>({
    queryKey: ["slots", selectedLocationId, selectedServiceId, selectedDate],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        service: selectedServiceId!,
        date: selectedDate!,
      };
      if (selectedLocationId !== "online") {
        params.location = selectedLocationId!;
      }
      const { data } = await api.get<AvailableSlot[]>("/available-slots/", { params });
      return data;
    },
    enabled:
      selectedDate !== null &&
      selectedServiceId !== null &&
      selectedLocationId !== null,
  });

  const { data: patients, isLoading: patientsLoading } = useQuery<Patient[]>({
    queryKey: ["my-patients"],
    queryFn: async () => {
      const { data } = await api.get<Patient[]>("/patients/");
      return data;
    },
    enabled: isAuthenticated && step === 3,
  });

  // ── Filtered services for selected location ──────────────────────────────────

  const filteredServices = useMemo(() => {
    if (!services || selectedLocationId === null) return [];
    if (selectedLocationId === "online") {
      return services.filter((s) => s.is_online_available && s.is_active);
    }
    return services.filter(
      (s) => s.is_active && s.locations.includes(selectedLocationId as number)
    );
  }, [services, selectedLocationId]);

  // ── Selected objects ──────────────────────────────────────────────────────────

  const selectedLocation = useMemo(
    () =>
      selectedLocationId === "online"
        ? { id: "online" as const, name: "Consulta Online", address: "Videollamada", city: "" }
        : locations?.find((l) => l.id === selectedLocationId) ?? null,
    [locations, selectedLocationId]
  );

  const selectedService = useMemo(
    () => services?.find((s) => s.id === selectedServiceId) ?? null,
    [services, selectedServiceId]
  );

  // ── Booking mutation ──────────────────────────────────────────────────────────

  const bookingMutation = useMutation({
    mutationFn: async (payload: AppointmentCreate) => {
      const { data } = await api.post<Appointment>("/appointments/", payload);
      return data;
    },
    onSuccess: (data) => {
      setConfirmedAppointment(data);
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────────

  function handleLocationSelect(id: number | "online") {
    setSelectedLocationId(id);
    setSelectedServiceId(null);
  }

  function handleServiceSelect(id: number) {
    setSelectedServiceId(id);
  }

  function handleContinueToStep2() {
    if (selectedLocationId !== null && selectedServiceId !== null) {
      setSelectedDate(null);
      setSelectedSlot(null);
      setStep(2);
    }
  }

  function handleContinueToStep3() {
    if (selectedDate && selectedSlot) {
      setStep(3);
    }
  }

  function handleConfirmBooking() {
    if (!selectedPatientId || !selectedSlot || !selectedDate || !selectedServiceId) return;

    const isOnline = selectedLocationId === "online";
    const locationId = isOnline ? 0 : (selectedLocationId as number);

    const payload: AppointmentCreate = {
      practice: PRACTICE_ID,
      patient: selectedPatientId,
      service: selectedServiceId,
      location: locationId,
      doctor: DOCTOR_ID,
      scheduled_date: selectedDate,
      start_time: selectedSlot.start_time,
      is_online: isOnline,
      notes,
    };

    bookingMutation.mutate(payload);
  }

  // ── Confirmation screen ───────────────────────────────────────────────────────

  if (confirmedAppointment) {
    return (
      <div className="max-w-[560px] mx-auto px-4 py-12">
        <div className="bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] p-8 text-center">
          <div className="w-16 h-16 bg-teal/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-teal-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="font-display text-[26px] font-semibold text-ink mb-2">
            ¡Turno confirmado!
          </h2>
          <p className="text-[14px] text-ink2 mb-6">
            Recibís un email con los detalles de tu reserva.
          </p>

          <div className="bg-cream rounded-[14px] p-5 text-left space-y-3 mb-6">
            <DetailRow label="Paciente" value={confirmedAppointment.patient_name} />
            <DetailRow label="Servicio" value={confirmedAppointment.service_name} />
            <DetailRow label="Sede" value={confirmedAppointment.location_name} />
            <DetailRow label="Fecha" value={formatDisplayDate(confirmedAppointment.scheduled_date)} />
            <DetailRow label="Hora" value={formatTime(confirmedAppointment.start_time)} />
          </div>

          <a
            href="/"
            className="inline-block bg-teal-dark text-white rounded-[12px] px-6 py-3 font-semibold text-[14px] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-cta)]"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    );
  }

  // ── Main layout ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-[640px] mx-auto px-4 py-10">
      <SEOHead
        title="Reservar turno"
        description="Reservá tu hora pediátrica online en Pucón o Villarrica. Atención presencial y online."
        url="https://estefipediatra.com/booking"
      />
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-[32px] sm:text-[38px] font-semibold text-ink leading-tight">
          Reservá tu turno
        </h1>
        <p className="text-[15px] text-ink2 mt-2">
          Atención presencial en Pucón y Villarrica, o consulta online.
        </p>
      </div>

      <StepIndicator currentStep={step} />

      {/* ── Step 1: Location & Service ── */}
      {step === 1 && (
        <div className="space-y-8">
          {/* Location */}
          <section>
            <h2 className="font-semibold text-[16px] text-ink mb-3">
              1. Elegí la sede
            </h2>
            {locationsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-[80px]" />
                <Skeleton className="h-[80px]" />
                <Skeleton className="h-[80px]" />
              </div>
            ) : (
              <div className="space-y-3">
                {locations?.map((loc) => (
                  <LocationCard
                    key={loc.id}
                    location={loc}
                    isSelected={selectedLocationId === loc.id}
                    onClick={() => handleLocationSelect(loc.id)}
                  />
                ))}
                <LocationCard
                  location={{
                    id: "online",
                    name: "Consulta Online",
                    address: "Videollamada por Google Meet",
                    city: "Todo Chile",
                  }}
                  isSelected={selectedLocationId === "online"}
                  onClick={() => handleLocationSelect("online")}
                />
              </div>
            )}
          </section>

          {/* Service */}
          {selectedLocationId !== null && (
            <section>
              <h2 className="font-semibold text-[16px] text-ink mb-3">
                2. Elegí el servicio
              </h2>
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
                    <ServiceCard
                      key={svc.id}
                      service={svc}
                      isSelected={selectedServiceId === svc.id}
                      onClick={() => handleServiceSelect(svc.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Continue button */}
          {selectedLocationId !== null && selectedServiceId !== null && (
            <button
              onClick={handleContinueToStep2}
              className="w-full bg-teal-dark text-white rounded-[12px] px-6 py-3 font-semibold text-[14px] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-cta)]"
            >
              Continuar
            </button>
          )}
        </div>
      )}

      {/* ── Step 2: Date & Time ── */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Back button */}
          <button
            onClick={() => setStep(1)}
            className="flex items-center gap-1.5 text-[13px] text-ink2 hover:text-ink transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </button>

          {/* Summary chip */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-cream text-teal-dark text-[12px] font-semibold px-3 py-1 rounded-full">
              {selectedLocation?.name}
            </span>
            <span className="bg-cream text-teal-dark text-[12px] font-semibold px-3 py-1 rounded-full">
              {selectedService?.name}
            </span>
          </div>

          <section>
            <h2 className="font-semibold text-[16px] text-ink mb-3">Elegí el día</h2>
            <MiniCalendar
              selectedDate={selectedDate}
              onSelectDate={(d) => {
                setSelectedDate(d);
                setSelectedSlot(null);
              }}
            />
          </section>

          {/* Time slots */}
          {selectedDate && (
            <section>
              <h2 className="font-semibold text-[16px] text-ink mb-3">
                Horarios disponibles —{" "}
                <span className="font-normal text-ink2 text-[14px] capitalize">
                  {formatDisplayDate(selectedDate)}
                </span>
              </h2>

              {slotsLoading ? (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} className="h-10" />
                  ))}
                </div>
              ) : !slots || slots.length === 0 ? (
                <div className="bg-cream rounded-[14px] px-5 py-4 text-[14px] text-ink2">
                  No hay turnos disponibles para este día. Probá con otra fecha.
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {slots.map((slot) => {
                    const isSelected =
                      selectedSlot?.start_time === slot.start_time;
                    return (
                      <button
                        key={slot.start_time}
                        disabled={!slot.available}
                        onClick={() => setSelectedSlot(slot)}
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
              )}
            </section>
          )}

          {selectedDate && selectedSlot && (
            <button
              onClick={handleContinueToStep3}
              className="w-full bg-teal-dark text-white rounded-[12px] px-6 py-3 font-semibold text-[14px] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-cta)]"
            >
              Continuar
            </button>
          )}
        </div>
      )}

      {/* ── Step 3: Confirm ── */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Back button */}
          <button
            onClick={() => setStep(2)}
            className="flex items-center gap-1.5 text-[13px] text-ink2 hover:text-ink transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </button>

          {/* Summary card */}
          <div className="bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] p-6">
            <h2 className="font-display text-[20px] font-semibold text-ink mb-4">
              Resumen de tu turno
            </h2>
            <div className="space-y-3">
              <DetailRow label="Sede" value={selectedLocation?.name ?? ""} />
              <DetailRow label="Servicio" value={selectedService?.name ?? ""} />
              <DetailRow
                label="Fecha"
                value={selectedDate ? formatDisplayDate(selectedDate) : ""}
              />
              <DetailRow
                label="Hora"
                value={selectedSlot ? formatTime(selectedSlot.start_time) : ""}
              />
              <DetailRow
                label="Precio"
                value={selectedService ? formatPrice(selectedService.price) : ""}
              />
            </div>
          </div>

          {/* Auth gate */}
          {!isAuthenticated ? (
            <div className="bg-cream rounded-[16px] px-6 py-5">
              <p className="text-[14px] text-ink font-semibold mb-1">
                Iniciá sesión para confirmar tu reserva
              </p>
              <p className="text-[13px] text-ink2 mb-4">
                Necesitás una cuenta para reservar turnos.
              </p>
              <Link
                to={`/login?redirect=/booking`}
                className="inline-block bg-teal-dark text-white rounded-[12px] px-5 py-2.5 font-semibold text-[13px] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-cta)]"
              >
                Iniciar sesión
              </Link>
              <span className="text-[13px] text-ink2 mx-3">o</span>
              <Link
                to="/register"
                className="inline text-[13px] font-semibold text-teal-dark hover:underline"
              >
                Crear cuenta
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Patient selector */}
              {user?.role === "TUTOR" && (
                <div>
                  <label className="block text-[13px] font-semibold text-ink mb-1.5">
                    Paciente
                  </label>
                  {patientsLoading ? (
                    <Skeleton className="h-[48px]" />
                  ) : !patients || patients.length === 0 ? (
                    <div className="bg-cream rounded-[12px] px-4 py-3 text-[13px] text-ink2">
                      No tenés pacientes registrados. Primero agregá un hijo/a desde tu perfil.
                    </div>
                  ) : (
                    <select
                      value={selectedPatientId ?? ""}
                      onChange={(e) => setSelectedPatientId(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-[12px] border border-line bg-bg text-ink text-[14px] focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
                    >
                      <option value="">Seleccioná el paciente</option>
                      {patients.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-[13px] font-semibold text-ink mb-1.5">
                  Notas (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Contanos el motivo de la consulta o cualquier detalle relevante..."
                  className="w-full px-4 py-3 rounded-[12px] border border-line bg-bg text-ink text-[14px] resize-none focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
                />
              </div>

              {/* Error */}
              {bookingMutation.isError && (
                <div className="bg-coral/10 border border-coral/30 rounded-[12px] px-4 py-3">
                  <p className="text-[13px] text-ink font-semibold">
                    No se pudo confirmar el turno
                  </p>
                  <p className="text-[12px] text-ink2 mt-0.5">
                    Intentá de nuevo o contactanos por teléfono.
                  </p>
                </div>
              )}

              {/* Confirm button */}
              <button
                onClick={handleConfirmBooking}
                disabled={
                  bookingMutation.isPending ||
                  (user?.role === "TUTOR" && !selectedPatientId)
                }
                className="w-full bg-teal-dark text-white rounded-[12px] px-6 py-3 font-semibold text-[14px] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-cta)] disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
              >
                {bookingMutation.isPending ? "Confirmando..." : "Confirmar reserva"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Detail Row helper ─────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[13px] text-ink2 shrink-0">{label}</span>
      <span className="text-[13px] font-semibold text-ink text-right">{value}</span>
    </div>
  );
}
