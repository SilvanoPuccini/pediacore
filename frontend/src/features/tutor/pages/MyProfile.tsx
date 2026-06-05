import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { UserCircle, CheckCircle2, AlertCircle, Lock } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import type { User, DocumentType } from "@/types/api";

const DOCUMENT_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: "RUT", label: "RUT (Chile)" },
  { value: "DNI", label: "DNI extranjero" },
  { value: "PASAPORTE", label: "Pasaporte" },
  { value: "OTRO", label: "Otro" },
];

interface ProfileFormData {
  first_name: string;
  last_name: string;
  phone: string;
  phone_prefix: string;
  phone_alt: string;
  document_type: DocumentType;
  rut: string;
}

interface ProfileUpdatePayload {
  first_name: string;
  last_name: string;
  phone: string;
  phone_prefix: string;
  phone_alt: string;
  document_type: DocumentType;
  rut: string;
}

const PHONE_PREFIXES = [
  { value: "+56", label: "🇨🇱 +56" },
  { value: "+54", label: "🇦🇷 +54" },
  { value: "+1", label: "🇺🇸 +1" },
  { value: "+51", label: "🇵🇪 +51" },
  { value: "+57", label: "🇨🇴 +57" },
  { value: "+598", label: "🇺🇾 +598" },
  { value: "+595", label: "🇵🇾 +595" },
  { value: "+591", label: "🇧🇴 +591" },
  { value: "+593", label: "🇪🇨 +593" },
  { value: "+34", label: "🇪🇸 +34" },
] as const;

function updateProfile(payload: ProfileUpdatePayload): Promise<User> {
  return api.patch<User>("/profile/", payload).then((res) => res.data);
}

export default function MyProfile() {
  const user = useAuthStore((s) => s.user);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);

  const [form, setForm] = useState<ProfileFormData>({
    first_name: user?.first_name ?? "",
    last_name: user?.last_name ?? "",
    phone: user?.phone ?? "",
    phone_prefix: user?.phone_prefix ?? "+56",
    phone_alt: user?.phone_alt ?? "",
    document_type: user?.document_type ?? "RUT",
    rut: user?.rut ?? "",
  });

  const [errors, setErrors] = useState<Partial<ProfileFormData>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Keep form in sync if user loads after mount
  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone ?? "",
        phone_prefix: user.phone_prefix ?? "+56",
        phone_alt: user.phone_alt ?? "",
        document_type: user.document_type ?? "RUT",
        rut: user.rut ?? "",
      });
    }
  }, [user?.id]);

  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: async () => {
      await fetchProfile();
      setSuccessMessage("Tus datos fueron actualizados correctamente.");
      setTimeout(() => setSuccessMessage(null), 4000);
    },
  });

  function validate(): boolean {
    const next: Partial<ProfileFormData> = {};
    if (!form.first_name.trim()) next.first_name = "El nombre es obligatorio.";
    if (!form.last_name.trim()) next.last_name = "El apellido es obligatorio.";
    if (!form.phone.trim()) next.phone = "El teléfono es obligatorio.";
    if (!form.rut.trim()) next.rut = "El documento es obligatorio.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof ProfileFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccessMessage(null);
    if (!validate()) return;
    mutation.mutate({
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      phone: form.phone.trim(),
      phone_prefix: form.phone_prefix,
      phone_alt: form.phone_alt.trim(),
      document_type: form.document_type,
      rut: form.rut.trim(),
    });
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-[28px] font-semibold text-ink mb-1">
        Mi Perfil
      </h1>
      <p className="text-[14px] text-ink3 mb-8">
        Actualizá tus datos personales.
      </p>

      <div className="bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] p-8">
        {/* Avatar header */}
        <div className="flex items-center gap-4 mb-8 pb-8 border-b border-line">
          <div className="h-14 w-14 rounded-full bg-cream flex items-center justify-center shrink-0">
            <UserCircle size={28} className="text-teal-dark" />
          </div>
          <div>
            <p className="text-[16px] font-semibold text-ink leading-tight">
              {user?.full_name || "—"}
            </p>
            <p className="text-[13px] text-ink3 mt-0.5">{user?.email}</p>
          </div>
        </div>

        {/* Success banner */}
        {successMessage && (
          <div className="flex items-center gap-2.5 bg-teal/10 border border-teal/30 text-teal-dark rounded-[12px] px-4 py-3 mb-6 text-[13px] font-medium">
            <CheckCircle2 size={16} className="shrink-0" />
            {successMessage}
          </div>
        )}

        {/* Mutation error banner */}
        {mutation.isError && (
          <div className="flex items-center gap-2.5 bg-coral/10 border border-coral/30 text-coral rounded-[12px] px-4 py-3 mb-6 text-[13px] font-medium">
            <AlertCircle size={16} className="shrink-0" />
            Ocurrió un error al guardar. Intentá de nuevo.
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* First name */}
            <div>
              <label htmlFor="first_name" className="text-[13px] font-semibold text-ink mb-1.5 block">
                Nombre
              </label>
              <input
                id="first_name"
                name="first_name"
                type="text"
                value={form.first_name}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-[12px] border bg-surface text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-colors ${
                  errors.first_name ? "border-coral" : "border-line"
                }`}
                placeholder="Tu nombre"
              />
              {errors.first_name && (
                <p className="text-[12px] text-coral mt-1.5">{errors.first_name}</p>
              )}
            </div>

            {/* Last name */}
            <div>
              <label htmlFor="last_name" className="text-[13px] font-semibold text-ink mb-1.5 block">
                Apellido
              </label>
              <input
                id="last_name"
                name="last_name"
                type="text"
                value={form.last_name}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-[12px] border bg-surface text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-colors ${
                  errors.last_name ? "border-coral" : "border-line"
                }`}
                placeholder="Tu apellido"
              />
              {errors.last_name && (
                <p className="text-[12px] text-coral mt-1.5">{errors.last_name}</p>
              )}
            </div>

            {/* Document type */}
            <div>
              <label htmlFor="document_type" className="text-[13px] font-semibold text-ink mb-1.5 block">
                Tipo de documento
              </label>
              <select
                id="document_type"
                name="document_type"
                value={form.document_type}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-[12px] border border-line bg-surface text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-colors"
              >
                {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* RUT / document number */}
            <div>
              <label htmlFor="rut" className="text-[13px] font-semibold text-ink mb-1.5 block">
                Nº de documento <span className="text-coral">*</span>
              </label>
              <input
                id="rut"
                name="rut"
                type="text"
                value={form.rut}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-[12px] border bg-surface text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-colors ${
                  errors.rut ? "border-coral" : "border-line"
                }`}
                placeholder="12.345.678-9"
              />
              {errors.rut && (
                <p className="text-[12px] text-coral mt-1.5">{errors.rut}</p>
              )}
            </div>

            {/* Phone with prefix */}
            <div className="sm:col-span-2">
              <label htmlFor="phone" className="text-[13px] font-semibold text-ink mb-1.5 block">
                Teléfono principal <span className="text-coral">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  id="phone_prefix"
                  name="phone_prefix"
                  value={form.phone_prefix}
                  onChange={handleChange}
                  className="w-[110px] shrink-0 px-3 py-3 rounded-[12px] border border-line bg-surface text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-colors"
                >
                  {PHONE_PREFIXES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  className={`flex-1 px-4 py-3 rounded-[12px] border bg-surface text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-colors ${
                    errors.phone ? "border-coral" : "border-line"
                  }`}
                  placeholder="9 1234 5678"
                />
              </div>
              {errors.phone && (
                <p className="text-[12px] text-coral mt-1.5">{errors.phone}</p>
              )}
            </div>

            {/* Alternate phone */}
            <div className="sm:col-span-2">
              <label htmlFor="phone_alt" className="text-[13px] font-semibold text-ink mb-1.5 block">
                Teléfono alternativo <span className="text-ink3 font-normal">(opcional)</span>
              </label>
              <input
                id="phone_alt"
                name="phone_alt"
                type="tel"
                value={form.phone_alt}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-[12px] border border-line bg-surface text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-colors"
                placeholder="Otro número de contacto"
              />
            </div>

            {/* Email — read only */}
            <div>
              <label className="text-[13px] font-semibold text-ink mb-1.5 block">
                Email
              </label>
              <input
                type="email"
                value={user?.email ?? ""}
                disabled
                className="w-full px-4 py-3 rounded-[12px] border border-line bg-cream text-[14px] text-ink3 cursor-not-allowed"
              />
              <p className="text-[12px] text-ink3 mt-1.5">
                El email no se puede modificar.
              </p>
            </div>
          </div>

          <div className="flex justify-end mt-8 pt-6 border-t border-line">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="bg-teal-dark text-white text-[13px] font-semibold px-6 py-3 rounded-[12px] hover:-translate-y-0.5 hover:shadow-[var(--shadow-cta)] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              {mutation.isPending ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>

      {/* Change password section */}
      <ChangePasswordSection />
    </div>
  );
}

// ─── Change Password Section ──────────────────────────────────────────────────

function ChangePasswordSection() {
  const [current, setCurrent] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) =>
      api.post("/change-password/", data),
    onSuccess: () => {
      setSuccess("Contraseña actualizada correctamente.");
      setCurrent("");
      setNewPwd("");
      setConfirm("");
      setError(null);
      setTimeout(() => setSuccess(null), 4000);
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr?.response?.data?.detail ?? "No se pudo cambiar la contraseña.");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!current || !newPwd || !confirm) {
      setError("Todos los campos son obligatorios.");
      return;
    }
    if (newPwd.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (newPwd !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    mutation.mutate({ current_password: current, new_password: newPwd });
  }

  return (
    <div className="bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] p-8 mt-8">
      <div className="flex items-center gap-3 mb-6 pb-6 border-b border-line">
        <div className="h-10 w-10 rounded-full bg-cream flex items-center justify-center shrink-0">
          <Lock size={20} className="text-teal-dark" />
        </div>
        <div>
          <p className="text-[16px] font-semibold text-ink leading-tight">
            Cambiar contraseña
          </p>
          <p className="text-[13px] text-ink3 mt-0.5">
            Mínimo 8 caracteres. Usá letras, números y símbolos.
          </p>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2.5 bg-teal/10 border border-teal/30 text-teal-dark rounded-[12px] px-4 py-3 mb-6 text-[13px] font-medium">
          <CheckCircle2 size={16} className="shrink-0" />
          {success}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2.5 bg-coral/10 border border-coral/30 text-coral rounded-[12px] px-4 py-3 mb-6 text-[13px] font-medium">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col gap-4 max-w-sm">
          <div>
            <label htmlFor="current_password" className="text-[13px] font-semibold text-ink mb-1.5 block">
              Contraseña actual
            </label>
            <input
              id="current_password"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className="w-full px-4 py-3 rounded-[12px] border border-line bg-surface text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-colors"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="new_password" className="text-[13px] font-semibold text-ink mb-1.5 block">
              Nueva contraseña
            </label>
            <input
              id="new_password"
              type="password"
              autoComplete="new-password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              className="w-full px-4 py-3 rounded-[12px] border border-line bg-surface text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-colors"
              placeholder="Mínimo 8 caracteres"
            />
          </div>

          <div>
            <label htmlFor="confirm_password" className="text-[13px] font-semibold text-ink mb-1.5 block">
              Confirmar nueva contraseña
            </label>
            <input
              id="confirm_password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-4 py-3 rounded-[12px] border border-line bg-surface text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-colors"
              placeholder="Repetí la nueva contraseña"
            />
          </div>
        </div>

        <div className="flex justify-end mt-6 pt-6 border-t border-line">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="bg-teal-dark text-white text-[13px] font-semibold px-6 py-3 rounded-[12px] hover:-translate-y-0.5 hover:shadow-[var(--shadow-cta)] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
          >
            {mutation.isPending ? "Cambiando..." : "Cambiar contraseña"}
          </button>
        </div>
      </form>
    </div>
  );
}
