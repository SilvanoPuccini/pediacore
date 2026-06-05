import { useState, useEffect, type FormEvent } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import SEOHead from "@/components/seo/SEOHead";
import api from "@/lib/api";

export default function ResetPasswordPage() {
  const { uid, token } = useParams<{ uid: string; token: string }>();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => navigate("/login"), 3000);
      return () => clearTimeout(timer);
    }
  }, [success, navigate]);

  function validate(): boolean {
    if (newPassword.length < 8) {
      setValidationError("La contraseña debe tener al menos 8 caracteres.");
      return false;
    }
    if (newPassword !== confirmPassword) {
      setValidationError("Las contraseñas no coinciden.");
      return false;
    }
    setValidationError("");
    return true;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!validate()) return;

    setIsLoading(true);
    try {
      await api.post("/password-reset/confirm/", {
        uid,
        token,
        new_password: newPassword,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      const detail = axiosErr?.response?.data?.detail;
      if (detail?.includes("inválido") || detail?.includes("expiró")) {
        setError("invalid_token");
      } else {
        setError("generic");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-16">
      <SEOHead
        title="Nueva contraseña"
        description="Establecé tu nueva contraseña."
        url="https://estefipediatra.com/reset-password"
      />
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-full overflow-hidden bg-white mb-3">
            <img
              src="/images/logo.svg"
              alt="Logo Dra. Estefi Pediatra"
              className="w-full h-full object-cover scale-[1.5]"
            />
          </div>
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
            Nueva contraseña
          </h1>
          <p className="text-[14px] text-ink2 mb-6">
            Elegí una contraseña segura para tu cuenta.
          </p>

          {success && (
            <div className="bg-teal/10 border border-teal/30 rounded-[12px] px-4 py-4 text-center mb-4">
              <svg
                className="w-8 h-8 text-teal-dark mx-auto mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-[14px] text-ink font-medium">
                ¡Contraseña actualizada correctamente!
              </p>
              <p className="text-[13px] text-ink2 mt-1">
                Redirigiendo al login en unos segundos...
              </p>
              <Link
                to="/login"
                className="inline-block mt-3 text-[13px] text-teal-dark font-semibold hover:underline"
              >
                Ir al login ahora
              </Link>
            </div>
          )}

          {error === "invalid_token" && (
            <div className="bg-red-50 border border-red-200 rounded-[12px] px-4 py-4 mb-4">
              <p className="text-[14px] text-red-700 font-medium">
                El link de recuperación es inválido o expiró.
              </p>
              <Link
                to="/forgot-password"
                className="inline-block mt-2 text-[13px] text-teal-dark font-semibold hover:underline"
              >
                Solicitar nuevo link
              </Link>
            </div>
          )}

          {error === "generic" && (
            <p className="text-[12px] text-coral mb-4" role="alert">
              Ocurrió un error. Intentá de nuevo.
            </p>
          )}

          {!success && error !== "invalid_token" && (
            <form onSubmit={handleSubmit} noValidate>
              <div className="flex flex-col gap-4">
                <div>
                  <label htmlFor="new-password" className="block text-[13px] font-semibold text-ink mb-1.5">
                    Nueva contraseña
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full px-4 py-3 rounded-[12px] border border-line bg-bg text-ink text-[14px] focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
                  />
                </div>

                <div>
                  <label htmlFor="confirm-password" className="block text-[13px] font-semibold text-ink mb-1.5">
                    Confirmar contraseña
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repetí la contraseña"
                    className="w-full px-4 py-3 rounded-[12px] border border-line bg-bg text-ink text-[14px] focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
                  />
                </div>

                {validationError && (
                  <p className="text-[12px] text-coral" role="alert">
                    {validationError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-teal-dark text-white rounded-[12px] px-6 py-3 font-semibold text-[14px] mt-1 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-cta)] disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
                >
                  {isLoading ? "Guardando..." : "Cambiar contraseña"}
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-[13px] text-ink2 mt-6">
            <Link to="/login" className="text-teal-dark font-semibold hover:underline">
              Volver al login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
