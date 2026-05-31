import { useState } from "react";
import { useBookingStore } from "../store/bookingStore";
import { useMyPatients } from "../hooks/useBookingQueries";
import InlinePatientForm from "../components/InlinePatientForm";
import Skeleton from "../components/Skeleton";
import type { Patient } from "@/types/api";

// ─── Patient card ────────────────────────────────────────────────────────────

function PatientCard({
  patient,
  isSelected,
  onClick,
}: {
  patient: Patient;
  isSelected: boolean;
  onClick: () => void;
}) {
  const age = getAge(patient.date_of_birth);

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
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={[
              "w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-semibold",
              isSelected ? "bg-teal text-white" : "bg-cream text-teal-dark",
            ].join(" ")}
          >
            {patient.first_name[0]}{patient.last_name[0]}
          </div>
          <div>
            <p className="font-semibold text-[15px] text-ink">{patient.full_name}</p>
            <p className="text-[12px] text-ink3">
              {age}
              {patient.rut && ` · RUT: ${patient.rut}`}
              {patient.insurance && ` · ${formatInsurance(patient.insurance)}`}
            </p>
          </div>
        </div>
        {isSelected && (
          <div className="w-5 h-5 rounded-full bg-teal flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
    </button>
  );
}

function formatInsurance(insurance: string): string {
  const map: Record<string, string> = {
    PARTICULAR: "Particular",
    FONASA_A: "Fonasa A",
    FONASA_B: "Fonasa B",
    FONASA_C: "Fonasa C",
    FONASA_D: "Fonasa D",
    SIN_PREVISION: "Sin previsión",
  };
  return map[insurance] ?? insurance.replace(/_/g, " ");
}

function getAge(dob: string): string {
  const birth = new Date(dob);
  const today = new Date();
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  if (months < 0 || (months === 0 && today.getDate() < birth.getDate())) {
    years--;
    months += 12;
  }
  if (today.getDate() < birth.getDate()) {
    months--;
  }
  if (years === 0) return `${months} meses`;
  if (years === 1 && months === 0) return "1 año";
  if (months === 0) return `${years} años`;
  return `${years} años, ${months} meses`;
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function StepPatient() {
  const { patientId, setPatient, setStep } = useBookingStore();
  const { data: patients, isLoading } = useMyPatients();
  const [showForm, setShowForm] = useState(false);

  const hasPatients = patients && patients.length > 0;

  function handleContinue() {
    if (patientId) {
      setStep(6);
    }
  }

  return (
    <div className="space-y-6">
      {/* Volver */}
      <button
        onClick={() => setStep(3)}
        className="flex items-center gap-1.5 text-[13px] text-ink2 hover:text-ink transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Volver
      </button>

      <section>
        <h2 className="font-semibold text-[18px] text-ink mb-1">
          5. ¿Para quién es la consulta?
        </h2>
        <p className="text-[14px] text-ink2 mb-4">
          Seleccioná un paciente o agregá uno nuevo.
        </p>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-[72px]" />
            <Skeleton className="h-[72px]" />
          </div>
        ) : (
          <div className="space-y-3">
            {hasPatients &&
              patients.map((p: Patient) => (
                <PatientCard
                  key={p.id}
                  patient={p}
                  isSelected={patientId === p.id}
                  onClick={() => setPatient(p.id)}
                />
              ))}

            {/* Add patient button */}
            {hasPatients && !showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="w-full p-4 rounded-[16px] border-2 border-dashed border-line text-[13px] font-semibold text-ink2 hover:border-teal/40 hover:text-teal-dark transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Agregar otro hijo
              </button>
            )}

            {/* Inline form */}
            {(!hasPatients || showForm) && (
              <InlinePatientForm onSuccess={() => setShowForm(false)} />
            )}
          </div>
        )}
      </section>

      {/* Continue */}
      {patientId && (
        <button
          onClick={handleContinue}
          className="w-full bg-teal-dark text-white rounded-[12px] px-6 py-3 font-semibold text-[14px] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-cta)]"
        >
          Continuar
        </button>
      )}
    </div>
  );
}
