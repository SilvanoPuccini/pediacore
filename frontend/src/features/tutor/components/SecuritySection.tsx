import { useState } from "react";
import { Shield, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/auth";

// ─── Last Login Banner ────────────────────────────────────────────────────────

function LastLoginInfo() {
  const user = useAuthStore((s) => s.user);
  const lastLogin = user?.last_login;

  return (
    <div className="flex items-center gap-2.5 bg-cream rounded-[10px] px-4 py-3 mb-6">
      <Clock size={14} className="text-ink3 shrink-0" />
      <p className="text-[12px] text-ink3">
        <span className="font-semibold text-ink2">Último acceso:</span>{" "}
        {lastLogin
          ? new Date(lastLogin).toLocaleString("es-CL", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Información no disponible"}
      </p>
    </div>
  );
}

// ─── SecuritySection ──────────────────────────────────────────────────────────

export default function SecuritySection() {
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
      setError(
        axiosErr?.response?.data?.detail ?? "No se pudo cambiar la contraseña."
      );
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
    <div className="bg-surface border border-line rounded-[14px] p-5 mt-6">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-line">
        <div className="h-8 w-8 rounded-full bg-cream flex items-center justify-center shrink-0">
          <Shield size={16} className="text-teal-dark" />
        </div>
        <div>
          <p className="text-[15px] font-semibold text-ink leading-tight">
            Seguridad
          </p>
          <p className="text-[12px] text-ink3 mt-0.5">
            Mantené tu cuenta segura con una contraseña fuerte.
          </p>
        </div>
      </div>

      {/* Last login */}
      <LastLoginInfo />

      {/* Feedback banners */}
      {success && (
        <div className="flex items-center gap-2.5 bg-teal/10 border border-teal/30 text-teal-dark rounded-[10px] px-4 py-3 mb-4 text-[13px] font-medium">
          <CheckCircle2 size={15} className="shrink-0" />
          {success}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2.5 bg-coral/10 border border-coral/30 text-coral rounded-[10px] px-4 py-3 mb-4 text-[13px] font-medium">
          <AlertCircle size={15} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Password form */}
      <form onSubmit={handleSubmit} noValidate>
        <p className="text-[13px] font-semibold text-ink mb-3">
          Cambiar contraseña
        </p>
        <div className="flex flex-col gap-3 max-w-sm">
          <div>
            <label
              htmlFor="sec_current_password"
              className="text-[12px] font-semibold text-ink mb-1 block"
            >
              Contraseña actual
            </label>
            <input
              id="sec_current_password"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className="w-full px-3 py-2.5 rounded-[10px] border border-line bg-surface text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-colors"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label
              htmlFor="sec_new_password"
              className="text-[12px] font-semibold text-ink mb-1 block"
            >
              Nueva contraseña
            </label>
            <input
              id="sec_new_password"
              type="password"
              autoComplete="new-password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              className="w-full px-3 py-2.5 rounded-[10px] border border-line bg-surface text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-colors"
              placeholder="Mínimo 8 caracteres"
            />
            <p className="text-[11px] text-ink3 mt-1">
              Usá al menos 8 caracteres. Combiná letras, números y símbolos.
            </p>
          </div>

          <div>
            <label
              htmlFor="sec_confirm_password"
              className="text-[12px] font-semibold text-ink mb-1 block"
            >
              Confirmar nueva contraseña
            </label>
            <input
              id="sec_confirm_password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-3 py-2.5 rounded-[10px] border border-line bg-surface text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-colors"
              placeholder="Repetí la nueva contraseña"
            />
          </div>
        </div>

        <div className="flex justify-end mt-4 pt-4 border-t border-line">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-5 py-2.5 rounded-[10px] bg-teal-dark text-white text-[13px] font-semibold hover:-translate-y-0.5 hover:shadow-[var(--shadow-cta)] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
          >
            {mutation.isPending ? "Cambiando..." : "Cambiar contraseña"}
          </button>
        </div>
      </form>
    </div>
  );
}
