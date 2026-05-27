import { useState, type FormEvent, type ChangeEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import type { RegisterRequest } from "@/types/api";

type FormFields = RegisterRequest;
type FieldErrors = Partial<Record<keyof FormFields, string>>;

const INITIAL_FORM: FormFields = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  password: "",
  password_confirm: "",
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);

  const [form, setForm] = useState<FormFields>(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function validate(): boolean {
    const errors: FieldErrors = {};
    if (!form.first_name.trim()) errors.first_name = "El nombre es requerido.";
    if (!form.last_name.trim()) errors.last_name = "El apellido es requerido.";
    if (!form.email.trim()) errors.email = "El email es requerido.";
    if (!form.phone.trim()) errors.phone = "El teléfono es requerido.";
    if (form.password.length < 8) errors.password = "Mínimo 8 caracteres.";
    if (form.password !== form.password_confirm)
      errors.password_confirm = "Las contraseñas no coinciden.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setGlobalError("");
    if (!validate()) return;

    setIsLoading(true);
    try {
      await register(form);
      navigate("/");
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "response" in err
      ) {
        const response = (err as { response?: { data?: unknown } }).response;
        const data = response?.data;
        if (data && typeof data === "object") {
          // Map backend field errors to local state
          const mapped: FieldErrors = {};
          for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
            if (key in INITIAL_FORM) {
              mapped[key as keyof FormFields] = Array.isArray(val)
                ? (val as string[]).join(" ")
                : String(val);
            }
          }
          if (Object.keys(mapped).length > 0) {
            setFieldErrors(mapped);
            return;
          }
        }
      }
      setGlobalError("Ocurrió un error al registrarte. Revisá los datos e intentá de nuevo.");
    } finally {
      setIsLoading(false);
    }
  }

  const inputClass =
    "w-full px-4 py-3 rounded-[12px] border border-line bg-bg text-ink text-[14px] focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal";
  const labelClass = "block text-[13px] font-semibold text-ink mb-1.5";
  const errorClass = "text-[12px] text-coral mt-1";

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-[460px]">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/images/logo.jpg"
            alt="Logo Dra. Estefi Pediatra"
            className="h-16 w-16 rounded-full object-cover mb-3"
          />
          <div className="font-display text-[22px] font-semibold text-ink tracking-tight">
            Dra. Estefi
          </div>
          <div className="text-[11px] text-ink3 tracking-[0.12em] uppercase font-medium mt-0.5">
            Pediatra
          </div>
        </div>

        {/* Card */}
        <div className="bg-surface rounded-[20px] border border-line shadow-[var(--shadow-soft)] px-8 py-8">
          <h1 className="font-display text-[24px] font-semibold text-ink mb-1">
            Crear cuenta
          </h1>
          <p className="text-[14px] text-ink2 mb-6">
            Registrate para reservar turnos online.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col gap-4">
              {/* Name row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="first_name" className={labelClass}>
                    Nombre
                  </label>
                  <input
                    id="first_name"
                    name="first_name"
                    type="text"
                    autoComplete="given-name"
                    value={form.first_name}
                    onChange={handleChange}
                    placeholder="Ana"
                    className={inputClass}
                  />
                  {fieldErrors.first_name && (
                    <p className={errorClass} role="alert">
                      {fieldErrors.first_name}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="last_name" className={labelClass}>
                    Apellido
                  </label>
                  <input
                    id="last_name"
                    name="last_name"
                    type="text"
                    autoComplete="family-name"
                    value={form.last_name}
                    onChange={handleChange}
                    placeholder="García"
                    className={inputClass}
                  />
                  {fieldErrors.last_name && (
                    <p className={errorClass} role="alert">
                      {fieldErrors.last_name}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="email" className={labelClass}>
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="tu@email.com"
                  className={inputClass}
                />
                {fieldErrors.email && (
                  <p className={errorClass} role="alert">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className={labelClass}>
                  Teléfono
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+56 9 1234 5678"
                  className={inputClass}
                />
                {fieldErrors.phone && (
                  <p className={errorClass} role="alert">
                    {fieldErrors.phone}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="password" className={labelClass}>
                  Contraseña
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Mínimo 8 caracteres"
                  className={inputClass}
                />
                {fieldErrors.password && (
                  <p className={errorClass} role="alert">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="password_confirm" className={labelClass}>
                  Confirmar contraseña
                </label>
                <input
                  id="password_confirm"
                  name="password_confirm"
                  type="password"
                  autoComplete="new-password"
                  value={form.password_confirm}
                  onChange={handleChange}
                  placeholder="Repetí tu contraseña"
                  className={inputClass}
                />
                {fieldErrors.password_confirm && (
                  <p className={errorClass} role="alert">
                    {fieldErrors.password_confirm}
                  </p>
                )}
              </div>

              {globalError && (
                <p className={errorClass} role="alert">
                  {globalError}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-teal-dark text-white rounded-[12px] px-6 py-3 font-semibold text-[14px] mt-1 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-cta)] disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
              >
                {isLoading ? "Creando cuenta..." : "Crear cuenta"}
              </button>
            </div>
          </form>

          <p className="text-center text-[13px] text-ink2 mt-6">
            ¿Ya tenés cuenta?{" "}
            <Link
              to="/login"
              className="text-teal-dark font-semibold hover:underline"
            >
              Iniciá sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
