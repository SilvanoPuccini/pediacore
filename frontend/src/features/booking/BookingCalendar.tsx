import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import SEOHead from "@/components/seo/SEOHead";
import { useBookingStore, type BookingStep } from "./store/bookingStore";
import StepSede from "./steps/StepSede";
import StepService from "./steps/StepService";
import StepDateTime from "./steps/StepDateTime";
import StepAuth from "./steps/StepAuth";
import StepPatient from "./steps/StepPatient";
import StepTutor from "./steps/StepTutor";
import StepSummary from "./steps/StepSummary";
import HoldCountdown from "./components/HoldCountdown";

// ─── Visual step mapping ─────────────────────────────────────────────────────
// Internal steps 1-8, but indicator shows only 5 visible steps.
// Steps 4 (Auth) and 6 (Tutor) are conditional/hidden.

const VISIBLE_STEPS = [
  { label: "Sede", shortLabel: "Sede" },
  { label: "Servicio", shortLabel: "Serv." },
  { label: "Fecha", shortLabel: "Fecha" },
  { label: "Paciente", shortLabel: "Pac." },
  { label: "Pago", shortLabel: "Pago" },
];

function stepToVisual(step: BookingStep): number {
  if (step <= 1) return 1;
  if (step === 2) return 2;
  if (step === 3) return 3;
  if (step === 4) return 3; // Auth — still on "Fecha" visually
  if (step === 5) return 4;
  if (step === 6) return 4; // Tutor — still on "Paciente" visually
  if (step >= 7) return 5;
  return 1;
}

// ─── Step Indicator ────────────────────────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: BookingStep }) {
  if (currentStep === 8) return null;

  const visual = stepToVisual(currentStep);

  return (
    <div className="flex items-center justify-center gap-0 mb-8 overflow-x-auto">
      {VISIBLE_STEPS.map((step, idx) => {
        const num = idx + 1;
        return (
          <div key={num} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={[
                  "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[11px] sm:text-[13px] font-semibold transition-colors",
                  visual > num
                    ? "bg-teal-dark text-white"
                    : visual === num
                    ? "bg-teal text-white"
                    : "bg-line text-ink3",
                ].join(" ")}
              >
                {visual > num ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  num
                )}
              </div>
              <span
                className={[
                  "text-[10px] sm:text-[11px] mt-1 font-medium whitespace-nowrap",
                  visual >= num ? "text-teal-dark" : "text-ink3",
                ].join(" ")}
              >
                <span className="hidden sm:inline">{step.label}</span>
                <span className="sm:hidden">{step.shortLabel}</span>
              </span>
            </div>
            {idx < VISIBLE_STEPS.length - 1 && (
              <div
                className={[
                  "h-[2px] w-6 sm:w-12 mx-0.5 sm:mx-1 mb-4 rounded-full transition-colors",
                  visual > num ? "bg-teal-dark" : "bg-line",
                ].join(" ")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Orchestrator ──────────────────────────────────────────────────────────────

export default function BookingCalendar() {
  const { step, locationId, serviceId, setLocation, setService } = useBookingStore();
  const [searchParams] = useSearchParams();

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

  if (step === 8) {
    const { checkoutUrl, holdExpiresAt } = useBookingStore.getState();
    if (checkoutUrl && holdExpiresAt) {
      return <HoldCountdown holdExpiresAt={holdExpiresAt} checkoutUrl={checkoutUrl} />;
    }
  }

  return (
    <div className="max-w-[640px] mx-auto px-4 py-10">
      <SEOHead
        title="Reservar turno"
        description="Reservá tu hora pediátrica online en Pucón o Villarrica. Atención presencial y online."
        url="https://estefipediatra.com/booking"
      />
      <div className="mb-8">
        <h1 className="font-display text-[32px] sm:text-[38px] font-semibold text-ink leading-tight">
          Reservá tu turno
        </h1>
        <p className="text-[15px] text-ink2 mt-2">
          Atención presencial en Pucón y Villarrica, o consulta online.
        </p>
      </div>

      <StepIndicator currentStep={step} />

      {step === 1 && <StepSede />}
      {step === 2 && <StepService />}
      {step === 3 && <StepDateTime />}
      {step === 4 && <StepAuth />}
      {step === 5 && <StepPatient />}
      {step === 6 && <StepTutor />}
      {step === 7 && <StepSummary />}
    </div>
  );
}
