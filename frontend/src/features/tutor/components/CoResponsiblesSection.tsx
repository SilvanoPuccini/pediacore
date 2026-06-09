import { useState } from "react";
import { Users, X, Plus, Loader2, AlertCircle } from "lucide-react";
import {
  useCoResponsibles,
  useCreateCoResponsible,
  useDeleteCoResponsible,
} from "../hooks/useCoResponsibles";

const RELATIONSHIP_OPTIONS = [
  { value: "FATHER", label: "Padre" },
  { value: "MOTHER", label: "Madre" },
  { value: "GRANDMOTHER", label: "Abuela" },
  { value: "GRANDFATHER", label: "Abuelo" },
  { value: "UNCLE", label: "Tío/a" },
  { value: "SIBLING", label: "Hermano/a" },
  { value: "OTHER", label: "Otro" },
];

const RELATIONSHIP_COLORS: Record<string, string> = {
  FATHER: "bg-teal/10 text-teal-dark",
  MOTHER: "bg-coral/10 text-coral",
  GRANDMOTHER: "bg-mustard/10 text-mustard",
  GRANDFATHER: "bg-sage/10 text-sage",
  UNCLE: "bg-teal/10 text-teal-dark",
  SIBLING: "bg-coral/10 text-coral",
  OTHER: "bg-cream text-ink3",
};

interface FormState {
  name: string;
  relationship: string;
  rut: string;
  phone: string;
  email: string;
  can_book: boolean;
  can_pickup: boolean;
}

const INITIAL_FORM: FormState = {
  name: "",
  relationship: "OTHER",
  rut: "",
  phone: "",
  email: "",
  can_book: true,
  can_pickup: true,
};

export default function CoResponsiblesSection() {
  const { data: items = [], isLoading } = useCoResponsibles();
  const createMutation = useCreateCoResponsible();
  const deleteMutation = useDeleteCoResponsible();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const target = e.target;
    const value =
      target.type === "checkbox"
        ? (target as HTMLInputElement).checked
        : target.value;
    setForm((prev) => ({ ...prev, [target.name]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim()) {
      setFormError("El nombre es obligatorio.");
      return;
    }
    createMutation.mutate(
      {
        name: form.name.trim(),
        relationship: form.relationship,
        rut: form.rut.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        can_book: form.can_book,
        can_pickup: form.can_pickup,
      },
      {
        onSuccess: () => {
          setForm(INITIAL_FORM);
          setShowForm(false);
        },
        onError: () => {
          setFormError("No se pudo guardar. Intentá de nuevo.");
        },
      }
    );
  }

  function handleCancel() {
    setForm(INITIAL_FORM);
    setFormError(null);
    setShowForm(false);
  }

  return (
    <div className="bg-surface border border-line rounded-[14px] p-5 mt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-cream flex items-center justify-center shrink-0">
            <Users size={16} className="text-teal-dark" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-ink leading-tight">
              Co-responsables
            </p>
            <p className="text-[12px] text-ink3 mt-0.5">
              Adultos autorizados a acompañar o agendar turnos.
            </p>
          </div>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-teal-dark hover:text-teal transition-colors"
          >
            <Plus size={14} />
            Agregar
          </button>
        )}
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={18} className="text-ink3 animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && items.length === 0 && !showForm && (
        <p className="text-[13px] text-ink3 py-3 text-center">
          No hay co-responsables registrados.
        </p>
      )}

      {/* Items list */}
      {!isLoading && items.length > 0 && (
        <ul className="divide-y divide-line mb-4">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between py-3 gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[14px] font-semibold text-ink truncate">
                    {item.name}
                  </span>
                  <span
                    className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      RELATIONSHIP_COLORS[item.relationship] ?? "bg-cream text-ink3"
                    }`}
                  >
                    {item.relationship_display}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-ink3">
                  {item.phone && <span>{item.phone}</span>}
                  {item.email && <span>{item.email}</span>}
                  {item.rut && <span>RUT: {item.rut}</span>}
                </div>
                <div className="flex gap-2 mt-1">
                  {item.can_book && (
                    <span className="text-[10px] bg-teal/10 text-teal-dark font-medium px-1.5 py-0.5 rounded">
                      Puede agendar
                    </span>
                  )}
                  {item.can_pickup && (
                    <span className="text-[10px] bg-teal/10 text-teal-dark font-medium px-1.5 py-0.5 rounded">
                      Puede retirar
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => deleteMutation.mutate(item.id)}
                disabled={deleteMutation.isPending}
                aria-label="Eliminar co-responsable"
                className="shrink-0 p-1.5 rounded-[8px] text-ink3 hover:text-coral hover:bg-coral/10 transition-colors disabled:opacity-40"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          noValidate
          className="border-t border-line pt-4 mt-2"
        >
          <p className="text-[13px] font-semibold text-ink mb-3">
            Nuevo co-responsable
          </p>

          {formError && (
            <div className="flex items-center gap-2 bg-coral/10 border border-coral/30 text-coral rounded-[10px] px-3 py-2.5 mb-4 text-[12px] font-medium">
              <AlertCircle size={14} className="shrink-0" />
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Name */}
            <div className="sm:col-span-2">
              <label
                htmlFor="cr_name"
                className="text-[12px] font-semibold text-ink mb-1 block"
              >
                Nombre completo <span className="text-coral">*</span>
              </label>
              <input
                id="cr_name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                className="w-full px-3 py-2.5 rounded-[10px] border border-line bg-surface text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-colors"
                placeholder="Nombre completo"
              />
            </div>

            {/* Relationship */}
            <div>
              <label
                htmlFor="cr_relationship"
                className="text-[12px] font-semibold text-ink mb-1 block"
              >
                Relación
              </label>
              <select
                id="cr_relationship"
                name="relationship"
                value={form.relationship}
                onChange={handleChange}
                className="w-full px-3 py-2.5 rounded-[10px] border border-line bg-surface text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-colors"
              >
                {RELATIONSHIP_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* RUT */}
            <div>
              <label
                htmlFor="cr_rut"
                className="text-[12px] font-semibold text-ink mb-1 block"
              >
                RUT <span className="text-ink3 font-normal">(opcional)</span>
              </label>
              <input
                id="cr_rut"
                name="rut"
                type="text"
                value={form.rut}
                onChange={handleChange}
                className="w-full px-3 py-2.5 rounded-[10px] border border-line bg-surface text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-colors"
                placeholder="12.345.678-9"
              />
            </div>

            {/* Phone */}
            <div>
              <label
                htmlFor="cr_phone"
                className="text-[12px] font-semibold text-ink mb-1 block"
              >
                Teléfono <span className="text-ink3 font-normal">(opcional)</span>
              </label>
              <input
                id="cr_phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                className="w-full px-3 py-2.5 rounded-[10px] border border-line bg-surface text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-colors"
                placeholder="+56 9 1234 5678"
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="cr_email"
                className="text-[12px] font-semibold text-ink mb-1 block"
              >
                Email <span className="text-ink3 font-normal">(opcional)</span>
              </label>
              <input
                id="cr_email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="w-full px-3 py-2.5 rounded-[10px] border border-line bg-surface text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-colors"
                placeholder="correo@ejemplo.com"
              />
            </div>

            {/* Permissions */}
            <div className="sm:col-span-2 flex gap-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  name="can_book"
                  type="checkbox"
                  checked={form.can_book}
                  onChange={handleChange}
                  className="h-4 w-4 accent-teal-dark rounded"
                />
                <span className="text-[13px] text-ink">Puede agendar turnos</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  name="can_pickup"
                  type="checkbox"
                  checked={form.can_pickup}
                  onChange={handleChange}
                  className="h-4 w-4 accent-teal-dark rounded"
                />
                <span className="text-[13px] text-ink">Puede retirar al niño/a</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-line">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 rounded-[10px] text-[13px] font-semibold text-ink2 hover:bg-cream transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 rounded-[10px] bg-teal-dark text-white text-[13px] font-semibold hover:-translate-y-0.5 hover:shadow-[var(--shadow-cta)] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              {createMutation.isPending ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
