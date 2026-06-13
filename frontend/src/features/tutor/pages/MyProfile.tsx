import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import {
  Pencil,
  Shield,
  Download,
  LogOut,
  Mail,
  Phone,
  CheckCircle2,
  AlertCircle,
  Camera,
  Loader2,
} from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { cn } from "@/lib/utils";
import { Card, Btn, Chip } from "@/features/tutor/components/portal-ui";
import NotificationPreferencesSection from "@/features/tutor/components/NotificationPreferencesSection";
import CoResponsiblesSection from "@/features/tutor/components/CoResponsiblesSection";
import SecuritySection from "@/features/tutor/components/SecuritySection";
import type { User, DocumentType } from "@/types/api";

// ─── Constants ────────────────────────────────────────────────────────────────

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
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const securityRef = useRef<HTMLDivElement>(null);

  const avatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("avatar", file);
      const { data } = await api.post<User>("/profile/avatar/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    },
    onSuccess: () => fetchProfile(),
  });

  const handleExportData = useCallback(async () => {
    try {
      const { data } = await api.get("/profile/export-pdf/", {
        responseType: "blob",
      });
      const blob = new Blob([data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mis-datos-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("No se pudieron exportar los datos. Intentá de nuevo.");
    }
  }, []);

  function handleAvatarClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("La imagen no puede superar los 5 MB.");
      return;
    }
    avatarMutation.mutate(file);
    e.target.value = "";
  }

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

  const joinedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("es-CL", { month: "long", year: "numeric" })
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
            <button
              type="button"
              onClick={handleAvatarClick}
              className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-teal to-mustard text-white font-bold text-[32px] flex items-center justify-center shadow-soft cursor-pointer group relative"
              title="Cambiar foto de perfil"
            >
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                {avatarMutation.isPending ? (
                  <Loader2 size={20} className="text-white animate-spin" />
                ) : (
                  <Camera size={20} className="text-white" />
                )}
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
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
      {avatarMutation.isError && (
        <div className="flex items-center gap-2.5 bg-coral/10 border border-coral/30 text-coral rounded-[12px] px-4 py-3 text-[13px] font-medium">
          <AlertCircle size={16} className="shrink-0" />
          No se pudo subir la imagen. Verificá el formato (JPEG, PNG, WebP) y que no supere 5 MB.
        </div>
      )}

      {/* ── Two-column: Personal data + Co-responsibles ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-5">
        {/* Personal data form */}
        <Card>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-[15px] font-bold text-ink mb-1">Datos personales</h3>
              <p className="text-[12px] text-ink2">
                Mantené tus datos actualizados para comunicaciones y facturación.
              </p>
            </div>
            {!editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-teal/15 text-teal-dark text-[12px] font-semibold hover:bg-teal/25 transition shrink-0"
              >
                <Pencil size={13} />
                Editar
              </button>
            )}
          </div>

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
                      "w-[80px] shrink-0 px-2 py-2.5 rounded-[10px] text-[13.5px] border border-line transition",
                      editing
                        ? "bg-bg text-ink focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                        : "bg-cream text-ink3 cursor-not-allowed"
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

            {editing && (
              <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
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
                  }}
                  className="px-4 py-2 rounded-[10px] border border-line text-[13px] font-semibold text-ink2 hover:bg-cream transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="px-4 py-2 rounded-[10px] bg-teal-dark text-white text-[13px] font-semibold hover:opacity-90 transition disabled:opacity-50"
                >
                  {mutation.isPending ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            )}
          </form>
        </Card>

        {/* Co-responsibles */}
        <CoResponsiblesSection />
      </div>

      {/* ── Notification preferences ── */}
      <NotificationPreferencesSection />

      {/* ── Security section ── */}
      <div ref={securityRef}>
        <SecuritySection />
      </div>

      {/* ── Bottom cards: Privacy / Export / Logout ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BottomCard
          icon={Shield}
          iconClassName="text-[#4A8590]"
          title="Privacidad"
          text="Tus datos están protegidos según nuestra política de privacidad."
          actionLabel="Política completa"
          variant="ghost"
          onClick={() => navigate("/portal/privacidad")}
        />
        <BottomCard
          icon={Download}
          iconClassName="text-[#8A6A1F]"
          title="Exportar datos"
          text="Descargá una copia de toda tu información personal y médica."
          actionLabel="Solicitar exportación"
          variant="ghost"
          onClick={handleExportData}
        />
        <BottomCard
          icon={LogOut}
          iconClassName="text-[#B5604F]"
          title="Cerrar sesión"
          text="Vas a necesitar iniciar sesión de nuevo para acceder a tu portal."
          actionLabel="Cerrar sesión"
          variant="danger"
          onClick={() => setShowLogoutConfirm(true)}
        />
      </div>

      {/* ── Logout confirmation modal ── */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[16px] shadow-xl p-6 w-full max-w-[380px] mx-4 text-center">
            <div className="w-12 h-12 rounded-full bg-coral/10 flex items-center justify-center mx-auto mb-4">
              <LogOut size={22} className="text-[#B5604F]" />
            </div>
            <h3 className="font-display text-[18px] font-bold text-ink mb-1">
              ¿Cerrar sesión?
            </h3>
            <p className="text-[13px] text-ink2 mb-5">
              Vas a necesitar iniciar sesión de nuevo para acceder a tu portal.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-[10px] border border-line text-[13px] font-semibold text-ink hover:bg-cream transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => logout()}
                className="flex-1 px-4 py-2.5 rounded-[10px] bg-[#B5604F] text-white text-[13px] font-semibold hover:bg-[#A04D3D] transition"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
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
  iconClassName,
  title,
  text,
  actionLabel,
  variant = "ghost",
  onClick,
}: {
  icon: React.ComponentType<{ size: number; className?: string }>;
  iconClassName: string;
  title: string;
  text: string;
  actionLabel: string;
  variant?: "ghost" | "danger";
  onClick?: () => void;
}) {
  return (
    <Card>
      <div className="flex items-center gap-3 mb-3">
        <Icon size={18} className={iconClassName} />
        <h4 className="text-[14px] font-bold text-ink">{title}</h4>
      </div>
      <p className="text-[12px] text-ink2 mb-4">{text}</p>
      <Btn variant={variant} size="sm" iconRight="ChevronRight" onClick={onClick}>
        {actionLabel}
      </Btn>
    </Card>
  );
}
