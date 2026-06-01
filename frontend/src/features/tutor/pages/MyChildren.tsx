import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Baby, Plus, Trash2, X } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Patient, PaginatedResponse } from "@/types/api";

// ─── Age calculation ──────────────────────────────────────────────────────────

function calcAge(dateOfBirth: string): string {
  const birth = new Date(dateOfBirth);
  const now = new Date();

  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();

  if (months < 0) {
    years--;
    months += 12;
  }
  if (now.getDate() < birth.getDate()) {
    months--;
    if (months < 0) {
      years--;
      months += 12;
    }
  }

  if (years >= 1) {
    return `${years} ${years === 1 ? "año" : "años"}`;
  }
  if (months >= 1) {
    return `${months} ${months === 1 ? "mes" : "meses"}`;
  }
  return "Recién nacido";
}

// ─── Sex badge ────────────────────────────────────────────────────────────────

const SEX_LABEL: Record<Patient["sex_at_birth"], string> = {
  M: "Masculino",
  F: "Femenino",
  NO_ESPECIFICA: "No especifica",
};

// ─── Confirm modal ────────────────────────────────────────────────────────────

interface ConfirmModalProps {
  patient: Patient;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}

function ConfirmModal({ patient, onConfirm, onCancel, isPending }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] p-6 w-full max-w-[360px]">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-ink3 hover:text-ink transition-colors"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>

        <h2 className="font-display text-[20px] font-semibold text-ink mb-2">
          Quitar a {patient.first_name} de tu lista?
        </h2>
        <p className="text-[13px] text-ink2 leading-relaxed mb-6">
          Se va a desvincular de tu perfil. La doctora seguirá teniendo acceso a
          su historia clínica.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isPending}
            className={cn(
              "flex-1 h-10 rounded-[12px] border border-line text-[13px] font-semibold text-ink2",
              "hover:bg-cream transition-colors disabled:opacity-50"
            )}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className={cn(
              "flex-1 h-10 rounded-[12px] bg-coral text-[13px] font-semibold text-white",
              "hover:opacity-90 transition-opacity disabled:opacity-50"
            )}
          >
            {isPending ? "Quitando..." : "Quitar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Patient card ─────────────────────────────────────────────────────────────

interface PatientCardProps {
  patient: Patient;
  onUnlink: (patient: Patient) => void;
}

function PatientCard({ patient, onUnlink }: PatientCardProps) {
  const completion = patient.profile_completion;

  return (
    <div className="bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] p-5">
      <div className="flex items-start justify-between gap-4">
        {/* Avatar + info */}
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-cream flex items-center justify-center shrink-0">
            <Baby size={22} className="text-teal-dark" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-ink leading-snug">
              {patient.full_name}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[13px] text-ink3">{calcAge(patient.date_of_birth)}</span>
              <span className="text-ink3 text-[11px]">·</span>
              <span
                className={cn(
                  "text-[11px] font-semibold px-2 py-0.5 rounded-full",
                  patient.sex_at_birth === "M"
                    ? "bg-blue-50 text-blue-600"
                    : patient.sex_at_birth === "F"
                      ? "bg-pink-50 text-pink-600"
                      : "bg-cream text-ink3"
                )}
              >
                {SEX_LABEL[patient.sex_at_birth]}
              </span>
            </div>
          </div>
        </div>

        {/* Unlink button */}
        <button
          onClick={() => onUnlink(patient)}
          title="Quitar de tu lista"
          className={cn(
            "shrink-0 h-8 w-8 rounded-[10px] flex items-center justify-center",
            "text-ink3 hover:text-coral hover:bg-coral/10 transition-colors"
          )}
        >
          <Trash2 size={15} />
        </button>
      </div>

      {/* Profile completion */}
      {completion !== undefined && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-ink3 uppercase tracking-wide">
              Perfil completo
            </span>
            <span
              className={cn(
                "text-[11px] font-semibold",
                completion.percentage === 100 ? "text-teal-dark" : "text-ink3"
              )}
            >
              {completion.percentage}%
            </span>
          </div>
          <div className="h-1.5 w-full bg-cream rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                completion.percentage === 100 ? "bg-teal" : "bg-teal/60"
              )}
              style={{ width: `${completion.percentage}%` }}
            />
          </div>
          {completion.missing.length > 0 && (
            <p className="text-[11px] text-ink3 mt-1.5">
              Faltan datos:{" "}
              <span className="text-ink2">{completion.missing.join(", ")}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Loading spinner ──────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="h-8 w-8 rounded-full border-2 border-line border-t-teal animate-spin" />
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="bg-surface border border-line rounded-[20px] p-10 flex flex-col items-center gap-4 text-center shadow-[var(--shadow-soft)]">
      <div className="h-14 w-14 rounded-full bg-cream flex items-center justify-center">
        <Baby size={24} className="text-teal-dark" />
      </div>
      <div>
        <p className="text-[15px] font-semibold text-ink mb-1">
          Todavía no hay perfiles registrados
        </p>
        <p className="text-[13px] text-ink3">
          Cuando reserves un turno, el perfil del chico va a aparecer acá.
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyChildren() {
  const queryClient = useQueryClient();
  const [pendingUnlink, setPendingUnlink] = useState<Patient | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["my-patients"],
    queryFn: () =>
      api.get<PaginatedResponse<Patient>>("/patients/").then((r) => r.data),
  });

  const unlinkMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/patients/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-patients"] });
      setPendingUnlink(null);
    },
  });

  const patients = data?.results ?? [];

  return (
    <>
      <div className="max-w-3xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-[28px] font-semibold text-ink mb-1">
              Mis hijos
            </h1>
            <p className="text-[14px] text-ink3">
              Los perfiles vinculados a tu cuenta.
            </p>
          </div>

          <Link
            to="/booking"
            className={cn(
              "inline-flex items-center gap-2 h-10 px-4 rounded-[12px]",
              "bg-teal text-white text-[13px] font-semibold",
              "hover:bg-teal-dark transition-colors shrink-0"
            )}
          >
            <Plus size={15} />
            Agregar hijo
          </Link>
        </div>

        {/* Content */}
        {isLoading ? (
          <Spinner />
        ) : patients.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-4">
            {patients.map((patient) => (
              <PatientCard
                key={patient.id}
                patient={patient}
                onUnlink={setPendingUnlink}
              />
            ))}
          </div>
        )}
      </div>

      {/* Confirm modal */}
      {pendingUnlink && (
        <ConfirmModal
          patient={pendingUnlink}
          onConfirm={() => unlinkMutation.mutate(pendingUnlink.id)}
          onCancel={() => setPendingUnlink(null)}
          isPending={unlinkMutation.isPending}
        />
      )}
    </>
  );
}
