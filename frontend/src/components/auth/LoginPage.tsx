import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch {
      setError("Email o contraseña incorrectos. Intentá de nuevo.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-[420px]">
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
              to="/register"
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
