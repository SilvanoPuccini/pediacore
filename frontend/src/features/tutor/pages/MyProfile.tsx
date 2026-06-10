import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Pencil,
  Check,
  Lock,
  Shield,
  Download,
  LogOut,
  Mail,
  Phone,
  MapPin,
  Users,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { cn } from "@/lib/utils";
import { Card, Btn, Chip, Toggle } from "@/features/tutor/components/portal-ui";
import NotificationPreferencesSection from "@/features/tutor/components/NotificationPreferencesSection";
import CoResponsiblesSection from "@/features/tutor/components/CoResponsiblesSection";
import SecuritySection from "@/features/tutor/components/SecuritySection";
import type { User, DocumentType } from "@/types/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const DOCUMENT_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: "RUT", label: "RUT (Chile)" },
  { value: "DNI", label: "DNI extranjero" },
  { value: "PASAPORTE", label: "Pasaporte" },
  { value: "OTRO", label: "Otro" },
];

const PHONE_PREFIXES = [
  { value: "+56", label: "+56" },
  { value: "+54", label: "+54" },
  { value: "+1", label: "+1" },
  { value: "+51", label: "+51" },
  { value: "+57", label: "+57" },
  { value: "+598", label: "+598" },
] as const;

const INPUT_CLS =
  "w-full px-3 py-2.5 rounded-[10px] bg-bg border border-line text-[13.5px] text-ink placeholder:text-ink3 focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition";

const INPUT_DISABLED_CLS =
  "w-full px-3 py-2.5 rounded-[10px] bg-cream border border-line text-[13.5px] text-ink3 cursor-not-allowed";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileFormData {
  first_name: string;
  last_name: string;
  phone: string;
  phone_prefix: string;
  phone_alt: string;
  document_type: DocumentType;
  rut: string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyProfile() {
  const user = useAuthStore((s) => s.user);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState<ProfileFormData>({
    first_name: user?.first_name ?? "",
    last_name: user?.last_name ?? "",
    phone: user?.phone ?? "",
    phone_prefix: user?.phone_prefix ?? "+56",
    phone_alt: user?.phone_alt ?? "",
    document_type: user?.document_type ?? "RUT",
    rut: user?.rut ?? "",
  });

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
    mutationFn: (payload: ProfileFormData) =>
      api.patch<User>("/profile/", payload).then((r) => r.data),
    onSuccess: async () => {
      await fetchProfile();
      setEditing(false);
      setSuccessMessage("Tus datos fueron actualizados correctamente.");
      setTimeout(() => setSuccessMessage(null), 4000);
    },
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccessMessage(null);
    mutation.mutate(form);
  }

  const initials = user?.first_name
    ? `${user.first_name[0]}${(user.last_name ?? "")[0] ?? ""}`.toUpperCase()
    : "?";

  const joinedDate = user?.date_joined
    ? new Date(user.date_joined).toLocaleDateString("es-CL", { month: "long", year: "numeric" })
    : "";

  return (
    <div className="space-y-6">
      {/* ── Profile header card ── */}
      <Card className="relative overflow-hidden">
        {/* Decorative circle */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-gradient-to-br from-teal/15 to-coral/10 pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row items-start gap-5">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal to-mustard text-white font-bold text-[32px] flex items-center justify-center shadow-soft">
              {initials}
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-surface border border-line shadow-card flex items-center justify-center">
              <Pencil size={12} className="text-ink3" />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-[26px] font-bold text-ink">
              {user?.full_name ?? "—"}
            </h2>

            {/* Contact info row */}
            <div className="flex items-center gap-4 flex-wrap mt-2 text-[12.5px] text-ink2">
              {user?.email && (
                <span className="flex items-center gap-1.5">
                  <Mail size={13} className="text-ink3" />
                  {user.email}
                </span>
              )}
              {user?.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone size={13} className="text-ink3" />
                  {user.phone_prefix ?? "+56"} {user.phone}
                </span>
              )}
            </div>

            {/* Chips */}
            <div className="flex items-center gap-2 flex-wrap mt-3">
              {joinedDate && (
                <Chip color="teal">Miembro desde {joinedDate}</Chip>
              )}
              <Chip color="sage" icon="Shield">Verificada</Chip>
              <Chip color="mustard" icon="Users">
                {user ? "Datos completos" : "—"}
              </Chip>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Btn variant="ghost" size="sm" icon="Lock">
              Cambiar contraseña
            </Btn>
            <Btn
              variant={editing ? "primary" : "soft"}
              size="sm"
              icon={editing ? "Check" : "Pencil"}
              onClick={() => {
                if (editing) {
                  // trigger form submit
                  const formEl = document.getElementById("profile-form") as HTMLFormElement;
                  formEl?.requestSubmit();
                } else {
                  setEditing(true);
                }
              }}
            >
              {editing ? "Guardar cambios" : "Editar perfil"}
            </Btn>
          </div>
        </div>
      </Card>

      {/* Banners */}
      {successMessage && (
        <div className="flex items-center gap-2.5 bg-teal/10 border border-teal/30 text-teal-dark rounded-[12px] px-4 py-3 text-[13px] font-medium">
          <CheckCircle2 size={16} className="shrink-0" />
          {successMessage}
        </div>
      )}
      {mutation.isError && (
        <div className="flex items-center gap-2.5 bg-coral/10 border border-coral/30 text-coral rounded-[12px] px-4 py-3 text-[13px] font-medium">
          <AlertCircle size={16} className="shrink-0" />
          Ocurrió un error al guardar. Intentá de nuevo.
        </div>
      )}

      {/* ── Two-column: Personal data + Co-responsibles ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-5">
        {/* Personal data form */}
        <Card>
          <h3 className="text-[15px] font-bold text-ink mb-1">Datos personales</h3>
          <p className="text-[12px] text-ink2 mb-5">
            Mantené tus datos actualizados para comunicaciones y facturación.
          </p>

          <form id="profile-form" onSubmit={handleSubmit} noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldBlock label="Nombre completo">
                <input
                  name="first_name"
                  value={form.first_name}
                  onChange={handleChange}
                  disabled={!editing}
                  className={editing ? INPUT_CLS : INPUT_DISABLED_CLS}
                />
              </FieldBlock>
              <FieldBlock label="Apellido">
                <input
                  name="last_name"
                  value={form.last_name}
                  onChange={handleChange}
                  disabled={!editing}
                  className={editing ? INPUT_CLS : INPUT_DISABLED_CLS}
                />
              </FieldBlock>
              <FieldBlock label="RUT / Documento">
                <input
                  name="rut"
                  value={form.rut}
                  onChange={handleChange}
                  disabled={!editing}
                  className={editing ? INPUT_CLS : INPUT_DISABLED_CLS}
                />
              </FieldBlock>
              <FieldBlock label="Email">
                <input
                  value={user?.email ?? ""}
                  disabled
                  className={INPUT_DISABLED_CLS}
                />
              </FieldBlock>
              <FieldBlock label="Teléfono / WhatsApp">
                <div className="flex gap-2">
                  <select
                    name="phone_prefix"
                    value={form.phone_prefix}
                    onChange={handleChange}
                    disabled={!editing}
                    className={cn(
                      "w-[80px] shrink-0",
                      editing ? INPUT_CLS : INPUT_DISABLED_CLS
                    )}
                  >
                    {PHONE_PREFIXES.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    disabled={!editing}
                    className={editing ? INPUT_CLS : INPUT_DISABLED_CLS}
                  />
                </div>
              </FieldBlock>
              <FieldBlock label="Sede preferida">
                <select
                  disabled={!editing}
                  className={editing ? INPUT_CLS : INPUT_DISABLED_CLS}
                >
                  <option>Pucón</option>
                  <option>Villarrica</option>
                  <option>Online</option>
                </select>
              </FieldBlock>
            </div>
          </form>
        </Card>

        {/* Co-responsibles */}
        <CoResponsiblesSection />
      </div>

      {/* ── Notification preferences ── */}
      <NotificationPreferencesSection />

      {/* ── Security section ── */}
      <SecuritySection />

      {/* ── Bottom cards: Privacy / Export / Logout ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BottomCard
          icon={Shield}
          iconColor="#4A8590"
          title="Privacidad"
          text="Tus datos están protegidos según nuestra política de privacidad."
          actionLabel="Política completa"
          variant="ghost"
        />
        <BottomCard
          icon={Download}
          iconColor="#8A6A1F"
          title="Exportar datos"
          text="Descargá una copia de toda tu información personal y médica."
          actionLabel="Solicitar exportación"
          variant="ghost"
        />
        <BottomCard
          icon={LogOut}
          iconColor="#B5604F"
          title="Cerrar sesión"
          text="Vas a necesitar iniciar sesión de nuevo para acceder a tu portal."
          actionLabel="Cerrar sesión"
          variant="danger"
        />
      </div>
    </div>
  );
}

// ─── Field block ──────────────────────────────────────────────────────────────

function FieldBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11.5px] font-semibold text-ink2 uppercase tracking-wider block mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}

// ─── Bottom card ──────────────────────────────────────────────────────────────

function BottomCard({
  icon: Icon,
  iconColor,
  title,
  text,
  actionLabel,
  variant = "ghost",
}: {
  icon: React.ComponentType<{ size: number; className?: string }>;
  iconColor: string;
  title: string;
  text: string;
  actionLabel: string;
  variant?: "ghost" | "danger";
}) {
  return (
    <Card>
      <div className="flex items-center gap-3 mb-3">
        <Icon size={18} style={{ color: iconColor }} />
        <h4 className="text-[14px] font-bold text-ink">{title}</h4>
      </div>
      <p className="text-[12px] text-ink2 mb-4">{text}</p>
      <Btn variant={variant} size="sm" iconRight="ChevronRight">
        {actionLabel}
      </Btn>
    </Card>
  );
}
