import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import SEOHead from "@/components/seo/SEOHead";
import { useAuthStore } from "@/stores/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [flash, setFlash] = useState("");

  useEffect(() => {
    const msg = sessionStorage.getItem("auth_flash");
    if (msg) {
      setFlash(msg);
      sessionStorage.removeItem("auth_flash");
    }
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login(email, password);
      navigate(redirectTo);
    } catch {
      setError("Email o contraseña incorrectos. Intentá de nuevo.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-16">
      <SEOHead
        title="Iniciar sesión"
        description="Accedé a tu cuenta para gestionar turnos pediátricos."
        url="https://estefipediatra.com/login"
      />
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-full overflow-hidden bg-white mb-3">
            <img
              src="/images/logo.png"
              alt="Logo Dra. Estefi Pediatra"
              className="w-full h-full object-cover scale-[1.6] -translate-y-[10%]"
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
          {flash && (
            <div className="bg-amber-50 border border-amber-200 rounded-[12px] px-4 py-3 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-[13px] text-amber-800 font-medium">{flash}</p>
            </div>
          )}

          <h1 className="font-display text-[24px] font-semibold text-ink mb-1">
            Iniciá sesión
          </h1>
          <p className="text-[14px] text-ink2 mb-6">
            Accedé a tu cuenta para gestionar turnos.
          </p>

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

              <div>
                <label htmlFor="password" className="block text-[13px] font-semibold text-ink mb-1.5">
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-[12px] border border-line bg-bg text-ink text-[14px] focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
                />
                <div className="flex justify-end mt-1.5">
                  <Link to="/forgot-password" className="text-[12px] text-teal-dark hover:underline">
                    Olvidé mi contraseña
                  </Link>
                </div>
              </div>

              {error && (
                <p className="text-[12px] text-coral" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-teal-dark text-white rounded-[12px] px-6 py-3 font-semibold text-[14px] mt-1 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-cta)] disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
              >
                {isLoading ? "Ingresando..." : "Ingresar"}
              </button>
            </div>
          </form>

          <p className="text-center text-[13px] text-ink2 mt-6">
            ¿No tenés cuenta?{" "}
            <Link
              to={redirectTo !== "/" ? `/register?redirect=${encodeURIComponent(redirectTo)}` : "/register"}
              className="text-teal-dark font-semibold hover:underline"
            >
              Registrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
