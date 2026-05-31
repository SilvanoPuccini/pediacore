import { useState, useEffect } from "react";
import { useBookingStore } from "../store/bookingStore";
import { useAuthStore } from "@/stores/auth";

// ─── Tutor data step (first time only) ───────────────────────────────────────
// If user already has phone filled, skip this step.
// This is a progressive profile completion for the tutor (parent).

export default function StepTutor() {
  const { setStep } = useBookingStore();
  const { user, fetchProfile } = useAuthStore();

  const [relationship, setRelationship] = useState("MADRE");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-skip if tutor already has phone (profile completed)
  useEffect(() => {
    if (user?.phone) {
      setStep(7);
    }
  }, [user, setStep]);

  if (user?.phone) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const errs: Record<string, string> = {};
    if (!phone.trim()) errs.phone = "El teléfono es requerido.";
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSaving(true);
    setErrors({});

    try {
      const { default: api } = await import("@/lib/api");
      await api.patch("/profile/", {
        phone: phone.trim(),
      });
      await fetchProfile();
      setStep(7);
    } catch {
      setErrors({ general: "No se pudieron guardar los datos. Intentá de nuevo." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Volver */}
      <button
        onClick={() => setStep(5)}
        className="flex items-center gap-1.5 text-[13px] text-ink2 hover:text-ink transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Volver
      </button>

      <section>
        <h2 className="font-semibold text-[18px] text-ink mb-1">
          Tus datos
        </h2>
        <p className="text-[14px] text-ink2 mb-4">
          Completálos una sola vez para futuras reservas.
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Relationship */}
          <div>
            <label className="block text-[12px] font-semibold text-ink mb-1">
              Relación con el paciente <span className="text-coral">*</span>
            </label>
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="w-full px-3 py-2.5 rounded-[10px] border border-line bg-bg text-ink text-[13px] focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            >
              <option value="MADRE">Madre</option>
              <option value="PADRE">Padre</option>
              <option value="TUTOR_LEGAL">Tutor/a legal</option>
              <option value="ABUELO_A">Abuelo/a</option>
              <option value="OTRO">Otro familiar</option>
            </select>
          </div>

          {/* Name (read-only from user profile) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-ink mb-1">
                Nombre
              </label>
              <input
                type="text"
                value={user?.first_name ?? ""}
                readOnly
                className="w-full px-3 py-2.5 rounded-[10px] border border-line bg-cream text-ink text-[13px] cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-ink mb-1">
                Apellido
              </label>
              <input
                type="text"
                value={user?.last_name ?? ""}
                readOnly
                className="w-full px-3 py-2.5 rounded-[10px] border border-line bg-cream text-ink text-[13px] cursor-not-allowed"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-[12px] font-semibold text-ink mb-1">
              Teléfono <span className="text-coral">*</span>
            </label>
            <div className="flex gap-2">
              <span className="px-3 py-2.5 rounded-[10px] border border-line bg-cream text-ink text-[13px] flex items-center">
                +56
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9 1234 5678"
                className={`flex-1 px-3 py-2.5 rounded-[10px] border text-ink text-[13px] bg-bg focus:outline-none focus:ring-2 focus:ring-teal/30 ${
                  errors.phone ? "border-coral" : "border-line focus:border-teal"
                }`}
              />
            </div>
            {errors.phone && (
              <p className="text-[11px] text-coral mt-0.5">{errors.phone}</p>
            )}
          </div>

          {/* Address (optional) */}
          <div>
            <label className="block text-[12px] font-semibold text-ink mb-1">
              Dirección (opcional)
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Av. Uruguay 291, Pucón"
              className="w-full px-3 py-2.5 rounded-[10px] border border-line bg-bg text-ink text-[13px] focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            />
          </div>

          {/* General error */}
          {errors.general && (
            <div className="bg-coral/10 border border-coral/30 rounded-[10px] px-3 py-2">
              <p className="text-[12px] text-ink">{errors.general}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-teal-dark text-white rounded-[12px] px-6 py-3 font-semibold text-[14px] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-cta)] disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
          >
            {saving ? "Guardando..." : "Guardar y continuar"}
          </button>
        </form>
      </section>
    </div>
  );
}
