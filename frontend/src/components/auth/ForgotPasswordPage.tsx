import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import SEOHead from "@/components/seo/SEOHead";
import api from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const trimmedEmail = email.trim();
  const isEmailValid = trimmedEmail.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await api.post("/password-reset/", { email });
      setSuccess(true);
    } catch {
      setError("Ocurrió un error. Intentá de nuevo en unos minutos.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-16">
      <SEOHead
        title="Recuperar contraseña"
        description="Recuperá el acceso a tu cuenta."
        url="https://estefipediatra.com/forgot-password"
      />
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-full overflow-hidden bg-white mb-3">
            <img
              src="/images/logo.png"
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
            Recuperar contraseña
          </h1>
          <p className="text-[14px] text-ink2 mb-6">
            Ingresá tu email y te mandamos un link para restablecer tu contraseña.
          </p>

          {success ? (
            <div className="bg-teal/10 border border-teal/30 rounded-[12px] px-4 py-4 text-center">
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
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <p className="text-[14px] text-ink font-medium">
                Te enviamos un email con las instrucciones.
              </p>
              <p className="text-[13px] text-ink2 mt-1">
                Revisá tu bandeja de entrada y spam.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div className="flex flex-col gap-4">
                <div>
                  <label htmlFor="email" className="block text-[13px] font-semibold text-ink mb-1.5">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full px-4 py-3 rounded-[12px] border border-line bg-bg text-ink text-[14px] focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
                  />
                </div>

                {error && (
                  <p className="text-[12px] text-coral" role="alert">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !isEmailValid}
                  className="w-full bg-teal-dark text-white rounded-[12px] px-6 py-3 font-semibold text-[14px] mt-1 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-cta)] disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
                >
                  {isLoading ? "Enviando..." : "Enviar link de recuperación"}
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
