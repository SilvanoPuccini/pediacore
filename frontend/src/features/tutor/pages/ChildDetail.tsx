import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, User, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import type { Patient } from "@/types/api";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calculateAge(dateOfBirth: string): string {
  const birth = new Date(dateOfBirth);
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();
  const adjustedYears =
    months < 0 || (months === 0 && now.getDate() < birth.getDate())
      ? years - 1
      : years;
  const adjustedMonths =
    months < 0 ? 12 + months : months;

  if (adjustedYears === 0) {
    return `${adjustedMonths} mes${adjustedMonths !== 1 ? "es" : ""}`;
  }
  if (adjustedYears < 2) {
    return `${adjustedYears} año y ${adjustedMonths} mes${adjustedMonths !== 1 ? "es" : ""}`;
  }
  return `${adjustedYears} años`;
}

function formatDate(isoDate: string): string {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

const SEX_LABELS: Record<string, string> = {
  M: "Masculino",
  F: "Femenino",
  NO_ESPECIFICA: "No especifica",
};

const DOC_LABELS: Record<string, string> = {
  RUT: "RUT",
  PASAPORTE: "Pasaporte",
  DNI_EXTRANJERO: "DNI extranjero",
};

const FIELD_LABELS: Record<string, string> = {
  insurance: "Previsión de salud",
  country: "País",
  region: "Región",
  comuna: "Comuna",
  address: "Dirección",
  phone: "Teléfono de contacto",
  rut: "RUT",
  date_of_birth: "Fecha de nacimiento",
};

function humanizeMissing(fields: string[]): string {
  return fields
    .map((f) => FIELD_LABELS[f] ?? f)
    .join(", ");
}

// ─── Editable fields ──────────────────────────────────────────────────────────

type EditableFields = Pick<
  Patient,
  "insurance" | "country" | "region" | "comuna" | "address" | "phone"
>;

const EDITABLE_KEYS: (keyof EditableFields)[] = [
  "insurance",
  "country",
  "region",
  "comuna",
  "address",
  "phone",
];

const EDITABLE_LABELS: Record<keyof EditableFields, string> = {
  insurance: "Previsión de salud",
  country: "País",
  region: "Región",
  comuna: "Comuna",
  address: "Dirección",
  phone: "Teléfono de contacto",
};

// ─── API calls ────────────────────────────────────────────────────────────────

async function fetchPatient(id: string): Promise<Patient> {
  const { data } = await api.get<Patient>(`/patients/${id}/`);
  return data;
}

async function patchPatient(id: string, payload: Partial<EditableFields>): Promise<Patient> {
  const { data } = await api.patch<Patient>(`/patients/${id}/`, payload);
  return data;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChildDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<Partial<EditableFields>>({});
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const { data: patient, isLoading, isError } = useQuery({
    queryKey: ["patient", id],
    queryFn: () => fetchPatient(id!),
    enabled: !!id,
    onSuccess: (data) => {
      setForm({
        insurance: data.insurance,
        country: data.country,
        region: data.region,
        comuna: data.comuna,
        address: data.address,
        phone: data.phone,
      });
    },
  });

  const mutation = useMutation({
    mutationFn: (payload: Partial<EditableFields>) => patchPatient(id!, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(["patient", id], updated);
      setForm({
        insurance: updated.insurance,
        country: updated.country,
        region: updated.region,
        comuna: updated.comuna,
        address: updated.address,
        phone: updated.phone,
      });
      setBanner({ type: "success", message: "Los datos se guardaron correctamente." });
      setTimeout(() => setBanner(null), 4000);
    },
    onError: () => {
      setBanner({ type: "error", message: "Ocurrió un error al guardar. Intentá de nuevo." });
      setTimeout(() => setBanner(null), 5000);
    },
  });

  function handleChange(key: keyof EditableFields, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    mutation.mutate(form);
  }

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-4 border-teal border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ─── Error ─────────────────────────────────────────────────────────────────
  if (isError || !patient) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] p-6 flex items-center gap-3 text-coral">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-[14px]">No se pudo cargar la información del paciente.</p>
        </div>
      </div>
    );
  }

  const completion = patient.profile_completion;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate("/portal/hijos")}
        className="flex items-center gap-2 text-[13px] font-semibold text-ink2 hover:text-ink transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a mis hijos
      </button>

      {/* Banner */}
      {banner && (
        <div
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-[12px] text-[13px] font-semibold",
            banner.type === "success"
              ? "bg-teal/10 text-teal-dark border border-teal/30"
              : "bg-coral/10 text-coral border border-coral/30"
          )}
        >
          {banner.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          {banner.message}
        </div>
      )}

      {/* Info card */}
      <div className="bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-teal/10 flex items-center justify-center">
            <User className="w-5 h-5 text-teal-dark" />
          </div>
          <div>
            <h1 className="font-display text-[28px] text-ink leading-tight">
              {patient.full_name}
            </h1>
            <p className="text-[13px] text-ink3">Paciente</p>
          </div>
        </div>

        {/* Read-only fields */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div>
            <p className="text-[12px] font-semibold text-ink3 uppercase tracking-wide mb-1">
              Fecha de nacimiento
            </p>
            <p className="text-[14px] text-ink">{formatDate(patient.date_of_birth)}</p>
          </div>
          <div>
            <p className="text-[12px] font-semibold text-ink3 uppercase tracking-wide mb-1">
              Edad
            </p>
            <p className="text-[14px] text-ink">{calculateAge(patient.date_of_birth)}</p>
          </div>
          <div>
            <p className="text-[12px] font-semibold text-ink3 uppercase tracking-wide mb-1">
              Sexo
            </p>
            <p className="text-[14px] text-ink">{SEX_LABELS[patient.sex_at_birth]}</p>
          </div>
          <div>
            <p className="text-[12px] font-semibold text-ink3 uppercase tracking-wide mb-1">
              {DOC_LABELS[patient.document_type]}
            </p>
            <p className="text-[14px] text-ink">{patient.rut || "—"}</p>
          </div>
        </div>

        <p className="text-[12px] text-ink3 bg-cream rounded-[10px] px-3 py-2">
          Para modificar nombre, fecha de nacimiento, sexo o documento, contacta a la doctora.
        </p>

        {/* Profile completion */}
        {completion && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-ink">Completitud del perfil</p>
              <p
                className={cn(
                  "text-[13px] font-semibold",
                  completion.percentage === 100 ? "text-teal-dark" : "text-ink2"
                )}
              >
                {completion.percentage}%
              </p>
            </div>
            <div className="h-2 bg-line rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  completion.percentage === 100 ? "bg-teal-dark" : "bg-teal"
                )}
                style={{ width: `${completion.percentage}%` }}
              />
            </div>
            {completion.missing.length > 0 && (
              <p className="text-[12px] text-ink3">
                Campos faltantes: {humanizeMissing(completion.missing)}.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Editable card */}
      <div className="bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] p-6 space-y-5">
        <h2 className="text-[17px] font-semibold text-ink">Datos de contacto y cobertura</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {EDITABLE_KEYS.map((key) => (
            <div key={key} className={key === "address" ? "sm:col-span-2" : ""}>
              <label className="text-[13px] font-semibold text-ink mb-1.5 block">
                {EDITABLE_LABELS[key]}
              </label>
              <input
                type="text"
                value={form[key] ?? ""}
                onChange={(e) => handleChange(key, e.target.value)}
                className="w-full px-4 py-3 rounded-[12px] border border-line bg-surface text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={handleSave}
            disabled={mutation.isPending}
            className={cn(
              "px-6 py-2.5 rounded-[12px] text-[13px] font-semibold bg-teal-dark text-white transition-opacity",
              mutation.isPending ? "opacity-60 cursor-not-allowed" : "hover:opacity-90"
            )}
          >
            {mutation.isPending ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
