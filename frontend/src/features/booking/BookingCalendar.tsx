import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import SEOHead from "@/components/seo/SEOHead";
import { useBookingStore } from "./store/bookingStore";
import StepServiceLocation from "./steps/StepServiceLocation";
import StepDateTime from "./steps/StepDateTime";
import StepConfirmation from "./steps/StepConfirmation";

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

// ─── Orchestrator ──────────────────────────────────────────────────────────────

export default function BookingCalendar() {
  const { step, locationId, serviceId, setLocation, setService } = useBookingStore();
  const [searchParams] = useSearchParams();

  // Hydrate from URL params on mount (backward compat)
  useEffect(() => {
    const urlLocation = searchParams.get("locationId");
    const urlService = searchParams.get("serviceId");

    if (urlLocation && locationId === null) {
      const parsed = urlLocation === "online" ? "online" : Number(urlLocation);
      setLocation(parsed as number | "online");
    }
    if (urlService && serviceId === null) {
      setService(Number(urlService));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      {step === 1 && <StepServiceLocation />}
      {step === 2 && <StepDateTime />}
      {step === 3 && <StepConfirmation />}
    </div>
  );
}
