import { useState } from "react";
import { useCreatePatient } from "../hooks/useBookingMutations";
import { usePractice } from "../hooks/useBookingQueries";
import { useBookingStore } from "../store/bookingStore";
import type { PatientCreate, DocumentType } from "@/types/api";

const DOCUMENT_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: "RUT", label: "RUT (Chile)" },
  { value: "DNI", label: "DNI extranjero" },
  { value: "PASAPORTE", label: "Pasaporte" },
  { value: "OTRO", label: "Otro" },
];

interface FormErrors {
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  document_type?: string;
  rut?: string;
  general?: string;
}

interface InlinePatientFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function InlinePatientForm({ onSuccess, onCancel }: InlinePatientFormProps = {}) {
  const { setPatient } = useBookingStore();
  const { data: practice, isLoading: practiceLoading } = usePractice();
  const createPatientMutation = useCreatePatient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [sexAtBirth, setSexAtBirth] = useState<"M" | "F" | "NO_ESPECIFICA">("NO_ESPECIFICA");
  const [documentType, setDocumentType] = useState<DocumentType>("RUT");
  const [rut, setRut] = useState("");
  const [insurance, setInsurance] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!firstName.trim()) errs.first_name = "El nombre es requerido.";
    if (!lastName.trim()) errs.last_name = "El apellido es requerido.";
    if (!dateOfBirth) {
      errs.date_of_birth = "La fecha de nacimiento es requerida.";
    } else {
      const dob = new Date(dateOfBirth);
      if (isNaN(dob.getTime())) {
        errs.date_of_birth = "Fecha inválida.";
      } else if (dob > new Date()) {
        errs.date_of_birth = "La fecha no puede ser futura.";
      }
    }
    if (!rut.trim()) errs.rut = "El RUT es requerido.";
    return errs;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});

    if (!practice?.id) return;

    const payload: PatientCreate = {
      practice: practice.id,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      date_of_birth: dateOfBirth,
      sex_at_birth: sexAtBirth,
      document_type: documentType,
      rut: rut.trim(),
      insurance: insurance || "",
      country: "Chile",
    };

    createPatientMutation.mutate(payload, {
      onSuccess: (newPatient) => {
        setPatient(newPatient.id);
        onSuccess?.();
      },
      onError: (err) => {
        const axiosErr = err as { response?: { data?: Record<string, unknown> } };
        const data = axiosErr?.response?.data;
        if (data && typeof data === "object") {
          const fieldErrors: FormErrors = {};
          for (const [key, val] of Object.entries(data)) {
            const msgs = Array.isArray(val) ? val.join(" ") : String(val);
            if (key === "first_name") fieldErrors.first_name = msgs;
            else if (key === "last_name") fieldErrors.last_name = msgs;
            else if (key === "date_of_birth") fieldErrors.date_of_birth = msgs;
            else if (key === "rut") fieldErrors.rut = msgs;
            else fieldErrors.general = fieldErrors.general
              ? `${fieldErrors.general} ${msgs}`
              : msgs;
          }
          setErrors(fieldErrors);
        } else {
          setErrors({ general: "No se pudo crear el paciente. Intentá de nuevo." });
        }
      },
    });
  }

  return (
    <div className="bg-cream rounded-[16px] p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-semibold text-ink">
          Agregá los datos del paciente para continuar
        </p>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-7 h-7 flex items-center justify-center rounded-full text-ink3 hover:text-coral hover:bg-coral/10 transition-colors flex-shrink-0"
            title="Cancelar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-3">
        {/* First name */}
        <div>
          <label className="block text-[12px] font-semibold text-ink mb-1">
            Nombre <span className="text-coral">*</span>
          </label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="ej. Valentina"
            className={`w-full px-3 py-2.5 rounded-[10px] border text-ink text-[13px] bg-bg focus:outline-none focus:ring-2 focus:ring-teal/30 ${
              errors.first_name ? "border-coral" : "border-line focus:border-teal"
            }`}
          />
          {errors.first_name && (
            <p className="text-[11px] text-coral mt-0.5">{errors.first_name}</p>
          )}
        </div>

        {/* Last name */}
        <div>
          <label className="block text-[12px] font-semibold text-ink mb-1">
            Apellido <span className="text-coral">*</span>
          </label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="ej. González"
            className={`w-full px-3 py-2.5 rounded-[10px] border text-ink text-[13px] bg-bg focus:outline-none focus:ring-2 focus:ring-teal/30 ${
              errors.last_name ? "border-coral" : "border-line focus:border-teal"
            }`}
          />
          {errors.last_name && (
            <p className="text-[11px] text-coral mt-0.5">{errors.last_name}</p>
          )}
        </div>

        {/* Date of birth */}
        <div>
          <label className="block text-[12px] font-semibold text-ink mb-1">
            Fecha de nacimiento <span className="text-coral">*</span>
          </label>
          <input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            className={`w-full px-3 py-2.5 rounded-[10px] border text-ink text-[13px] bg-bg focus:outline-none focus:ring-2 focus:ring-teal/30 ${
              errors.date_of_birth ? "border-coral" : "border-line focus:border-teal"
            }`}
          />
          {errors.date_of_birth && (
            <p className="text-[11px] text-coral mt-0.5">{errors.date_of_birth}</p>
          )}
        </div>

        {/* Document type */}
        <div>
          <label className="block text-[12px] font-semibold text-ink mb-1">
            Tipo de documento
          </label>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as DocumentType)}
            className="w-full px-3 py-2.5 rounded-[10px] border border-line bg-bg text-ink text-[13px] focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
          >
            {DOCUMENT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Document number / RUT */}
        <div>
          <label className="block text-[12px] font-semibold text-ink mb-1">
            Nº de documento <span className="text-coral">*</span>
          </label>
          <input
            type="text"
            value={rut}
            onChange={(e) => setRut(e.target.value)}
            placeholder="ej. 12.345.678-9"
            className={`w-full px-3 py-2.5 rounded-[10px] border text-ink text-[13px] bg-bg focus:outline-none focus:ring-2 focus:ring-teal/30 ${
              errors.rut ? "border-coral" : "border-line focus:border-teal"
            }`}
          />
          {errors.rut && (
            <p className="text-[11px] text-coral mt-0.5">{errors.rut}</p>
          )}
        </div>

        {/* Sex at birth */}
        <div>
          <label className="block text-[12px] font-semibold text-ink mb-1">
            Sexo biológico
          </label>
          <select
            value={sexAtBirth}
            onChange={(e) => setSexAtBirth(e.target.value as typeof sexAtBirth)}
            className="w-full px-3 py-2.5 rounded-[10px] border border-line bg-bg text-ink text-[13px] focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
          >
            <option value="NO_ESPECIFICA">No especifica</option>
            <option value="F">Femenino</option>
            <option value="M">Masculino</option>
          </select>
        </div>

        {/* Insurance (optional) */}
        <div>
          <label className="block text-[12px] font-semibold text-ink mb-1">
            Previsión (opcional)
          </label>
          <select
            value={insurance}
            onChange={(e) => setInsurance(e.target.value)}
            className="w-full px-3 py-2.5 rounded-[10px] border border-line bg-bg text-ink text-[13px] focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
          >
            <option value="">Seleccioná</option>
            <option value="PARTICULAR">Particular</option>
            <option value="FONASA_A">Fonasa A</option>
            <option value="FONASA_B">Fonasa B</option>
            <option value="FONASA_C">Fonasa C</option>
            <option value="FONASA_D">Fonasa D</option>
            <option value="ISAPRE_BANMEDICA">Isapre Banmédica</option>
            <option value="ISAPRE_COLMENA">Isapre Colmena</option>
            <option value="ISAPRE_CONSALUD">Isapre Consalud</option>
            <option value="ISAPRE_CRUZ_BLANCA">Isapre Cruz Blanca</option>
            <option value="ISAPRE_MASVIDA">Isapre MásVida</option>
            <option value="ISAPRE_NUEVA_MASVIDA">Isapre Nueva MásVida</option>
            <option value="ISAPRE_ESENCIAL">Isapre Esencial</option>
            <option value="ISAPRE_VIDATRES">Isapre Vida Tres</option>
            <option value="ISAPRE_BUPA">Isapre Bupa</option>
            <option value="ISAPRE_LIFESECURITY">Isapre Lifesecurity</option>
            <option value="ISAPRE_ALEMANA_SALUD">Isapre Alemana Salud</option>
            <option value="FFAA_CAPREDENA">FFAA Capredena</option>
            <option value="FFAA_DIPRECA">FFAA Dipreca</option>
            <option value="SIN_PREVISION">Sin previsión</option>
            <option value="OTRO">Otro</option>
          </select>
        </div>

        {/* General error */}
        {errors.general && (
          <div className="bg-coral/10 border border-coral/30 rounded-[10px] px-3 py-2">
            <p className="text-[12px] text-ink">{errors.general}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={createPatientMutation.isPending || practiceLoading}
          className="w-full bg-teal-dark text-white rounded-[10px] px-4 py-2.5 font-semibold text-[13px] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-cta)] disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
        >
          {createPatientMutation.isPending ? "Guardando…" : "Agregar paciente"}
        </button>
      </form>
    </div>
  );
}
