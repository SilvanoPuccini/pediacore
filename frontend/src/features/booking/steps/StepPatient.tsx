import { useState } from "react";
import { useBookingStore } from "../store/bookingStore";
import { useMyPatients } from "../hooks/useBookingQueries";
import { useDeletePatient } from "../hooks/useBookingMutations";
import InlinePatientForm from "../components/InlinePatientForm";
import Skeleton from "../components/Skeleton";
import type { Patient } from "@/types/api";

// ─── Confirm modal ──────────────────────────────────────────────────────────

function ConfirmRemoveModal({
  patientName,
  onConfirm,
  onCancel,
  isLoading,
  error,
}: {
  patientName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
  error: string | null;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] p-6 w-full max-w-[360px]">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-coral/10 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h3 className="font-display text-[18px] font-semibold text-ink mb-2">
            Quitar paciente
          </h3>
          <p className="text-[14px] text-ink2 mb-6">
            ¿Quitar a <span className="font-semibold text-ink">{patientName}</span> de tu lista?
          </p>
          {error && (
            <div className="w-full bg-coral/10 border border-coral/30 rounded-[10px] px-3 py-2 mb-4">
              <p className="text-[12px] text-ink">{error}</p>
            </div>
          )}
          <div className="flex gap-3 w-full">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 bg-cream text-ink rounded-[12px] px-4 py-2.5 font-semibold text-[13px] hover:bg-line transition-colors disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 bg-coral text-white rounded-[12px] px-4 py-2.5 font-semibold text-[13px] hover:bg-coral/90 transition-colors disabled:opacity-60"
            >
              {isLoading ? "Quitando..." : "Quitar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Patient card ────────────────────────────────────────────────────────────

function PatientCard({
  patient,
  isSelected,
  onClick,
  onRequestDelete,
}: {
  patient: Patient;
  isSelected: boolean;
  onClick: () => void;
  onRequestDelete: () => void;
}) {
  const age = getAge(patient.date_of_birth);

  return (
    <div
      onClick={onClick}
      className={[
        "w-full text-left p-5 rounded-[16px] border-2 transition-all cursor-pointer",
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
        <div className="flex items-center gap-2">
          {isSelected && (
            <div className="w-5 h-5 rounded-full bg-teal flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRequestDelete();
            }}
            className="w-7 h-7 flex items-center justify-center rounded-full text-ink3 hover:text-coral hover:bg-coral/10 transition-colors"
            title="Quitar de mi lista"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
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
  const { data: patientsResp, isLoading } = useMyPatients();
  const deleteMutation = useDeletePatient();
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);

  const patients = patientsResp?.results ?? [];
  const hasPatients = patients.length > 0;

  // Validate that persisted patientId actually exists in the current patient list
  const patientExists = hasPatients && patients.some((p: Patient) => p.id === patientId);

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }

  function handleContinue() {
    if (patientId && patientExists) {
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
                  onRequestDelete={() => setDeleteTarget(p)}
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
              <InlinePatientForm
                onSuccess={() => setShowForm(false)}
                onCancel={hasPatients ? () => setShowForm(false) : undefined}
              />
            )}
          </div>
        )}
      </section>

      {/* Continue */}
      {patientId && patientExists && (
        <button
          onClick={handleContinue}
          className="w-full bg-teal-dark text-white rounded-[12px] px-6 py-3 font-semibold text-[14px] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-cta)]"
        >
          Continuar
        </button>
      )}

      {/* Remove confirmation modal */}
      {deleteTarget && (
        <ConfirmRemoveModal
          patientName={deleteTarget.full_name}
          onConfirm={handleConfirmDelete}
          onCancel={() => { setDeleteTarget(null); deleteMutation.reset(); }}
          isLoading={deleteMutation.isPending}
          error={deleteMutation.isError ? "No se pudo quitar el paciente. Intentá de nuevo." : null}
        />
      )}
    </div>
  );
}
