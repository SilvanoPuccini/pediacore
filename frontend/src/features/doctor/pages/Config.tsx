import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CircleUser,
  MapPin,
  CreditCard,
  Bell,
  Lock,
  Video,
  Check,
  Download,
  AlertCircle,
  LogOut,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useAuthStore } from "@/stores/auth";
import type {
  Location,
  Service,
  NotificationPreference,
} from "@/types/api";

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatCLP(amount: number): string {
  return `$${amount.toLocaleString("es-CL")}`;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

// ─── sub-components ───────────────────────────────────────────────────────────

function ConfigToggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      className="shrink-0 disabled:opacity-50"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
    >
      <span
        className={`relative inline-flex items-center w-10 h-[22px] rounded-full transition ${
          checked ? "bg-teal-dark" : "bg-line"
        }`}
      >
        <span
          className={`absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-all ${
            checked ? "left-[20px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

const cfgInput =
  "w-full px-3 py-2.5 rounded-[10px] bg-bg border border-line text-[13px] text-ink placeholder:text-ink3 focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition";

const cfgInputReadOnly =
  "w-full px-3 py-2.5 rounded-[10px] bg-bg border border-line text-[13px] text-ink3 cursor-default select-none";

function CfgField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11.5px] font-semibold text-ink2">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function CfgSection({
  icon,
  title,
  desc,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface border border-line rounded-[14px] shadow-card p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-[10px] bg-teal/15 text-teal-dark flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <h3 className="text-[14.5px] font-bold text-ink">{title}</h3>
          {desc && <p className="text-[11.5px] text-ink3 mt-0.5">{desc}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

// ─── nav items ────────────────────────────────────────────────────────────────

type PaneId = "perfil" | "sedes" | "precios" | "notif" | "cuenta";

const CONFIG_NAV: { id: PaneId; label: string; icon: React.ReactNode }[] = [
  { id: "perfil",  label: "Perfil",          icon: <CircleUser size={16} /> },
  { id: "sedes",   label: "Sedes",            icon: <MapPin size={16} /> },
  { id: "precios", label: "Precios y pagos",  icon: <CreditCard size={16} /> },
  { id: "notif",   label: "Notificaciones",   icon: <Bell size={16} /> },
  { id: "cuenta",  label: "Cuenta",           icon: <Lock size={16} /> },
];

// ─── page ─────────────────────────────────────────────────────────────────────

export default function ConfigPage() {
  const navigate = useNavigate();
  const { user, logout, fetchProfile } = useAuthStore();
  const queryClient = useQueryClient();
  const [pane, setPane] = useState<PaneId>("perfil");
  const [paymentMethods, setPaymentMethods] = useState({
    mercadopago: true,
    transfer: true,
    presencial: true,
  });
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);

  // ── Profile form state ──
  const [profileForm, setProfileForm] = useState({
    first_name: user?.first_name ?? "",
    last_name: user?.last_name ?? "",
    phone: user?.phone ?? "",
    rut: user?.rut ?? "",
  });

  // Keep form in sync if user loads after mount
  useEffect(() => {
    if (user) {
      setProfileForm({
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        rut: user.rut,
      });
    }
  }, [user]);

  // ── Avatar upload ref ──
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // ── Password form state ──
  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [pwVisible, setPwVisible] = useState(false);

  const flash = (msg: string, error = false) => {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 2500);
  };

  // ── Practice settings (online toggle) ──
  const practiceSettingsQ = useQuery<{ id: number; is_online_enabled: boolean }>({
    queryKey: ["practice-settings"],
    queryFn: async () => {
      const { data } = await api.get<{ id: number; is_online_enabled: boolean }>("/admin/practice-settings/");
      return data;
    },
    staleTime: 1000 * 60 * 10,
  });

  const onlineEnabled = practiceSettingsQ.data?.is_online_enabled ?? true;

  const toggleOnlineMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      await api.patch("/admin/practice-settings/", { is_online_enabled: enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practice-settings"] });
      flash("Configuracion actualizada");
    },
    onError: () => flash("Error al actualizar", true),
  });

  // ── API queries ──
  const locationsQ = useQuery<Location[]>({
    queryKey: ["admin-locations"],
    queryFn: async () => {
      const { data } = await api.get<{ results: Location[] }>("/admin/locations/");
      return data.results;
    },
    staleTime: 1000 * 60 * 5,
  });

  const servicesQ = useQuery<Service[]>({
    queryKey: ["services"],
    queryFn: async () => {
      const { data } = await api.get<{ results: Service[] }>("/practices/dra-estefi/services/");
      return data.results;
    },
    staleTime: 1000 * 60 * 60,
  });

  const notifPrefsQ = useQuery<NotificationPreference>({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const { data } = await api.get<NotificationPreference>("/notification-preferences/");
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const locations = locationsQ.data ?? [];
  const services = servicesQ.data ?? [];
  const notifPrefs = notifPrefsQ.data;

  const isLoading = locationsQ.isLoading || servicesQ.isLoading;
  const isError = locationsQ.isError || servicesQ.isError;

  // ── Profile save mutation ──
  const profileMutation = useMutation({
    mutationFn: async (payload: typeof profileForm) => {
      const { data } = await api.patch("/profile/", payload);
      return data;
    },
    onSuccess: async () => {
      await fetchProfile();
      queryClient.invalidateQueries({ queryKey: ["auth-user"] });
      flash("Perfil guardado");
    },
    onError: () => flash("Error al guardar el perfil", true),
  });

  // ── Avatar upload mutation ──
  const avatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("avatar", file);
      const { data } = await api.post("/profile/avatar/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    },
    onSuccess: async () => {
      await fetchProfile();
      queryClient.invalidateQueries({ queryKey: ["auth-user"] });
      flash("Foto actualizada");
    },
    onError: () => flash("Error al subir la foto", true),
  });

  // ── Notification preference mutation ──
  const notifMutation = useMutation({
    mutationFn: async (patch: Partial<NotificationPreference>) => {
      const { data } = await api.patch<NotificationPreference>(
        "/notification-preferences/",
        patch
      );
      return data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["notification-preferences"], updated);
    },
    onError: () => flash("Error al actualizar la preferencia", true),
  });

  // ── Location toggle mutation ──
  const locationToggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
      await api.patch(`/admin/locations/${id}/`, { is_active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-locations"] });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      flash("Sede actualizada");
    },
    onError: () => flash("Error al actualizar la sede", true),
  });

  // ── Password change mutation ──
  const passwordMutation = useMutation({
    mutationFn: async (payload: { current_password: string; new_password: string }) => {
      await api.post("/change-password/", payload);
    },
    onSuccess: () => {
      setPwForm({ current_password: "", new_password: "", confirm_password: "" });
      setPwVisible(false);
      flash("Contraseña actualizada");
    },
    onError: (err: unknown) => {
      const detail =
        (err as { response?: { data?: { detail?: string; new_password?: string[] } } })
          ?.response?.data?.detail ??
        (err as { response?: { data?: { new_password?: string[] } } })
          ?.response?.data?.new_password?.[0] ??
        "Error al cambiar la contraseña";
      flash(detail, true);
    },
  });

  // ── PDF export ──
  const handleExport = async () => {
    try {
      const response = await api.get("/profile/export-pdf/", { responseType: "blob" });
      const blob = response.data as Blob;
      if (blob.type && !blob.type.includes("pdf")) {
        const text = await blob.text();
        flash(text || "El servidor no devolvió un PDF", true);
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "consultorio-resumen.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: Blob } };
      if (axErr.response?.data instanceof Blob) {
        const text = await axErr.response.data.text();
        flash(text || "Error al generar el PDF", true);
      } else {
        flash("Error al generar la exportación", true);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[210px_1fr] gap-6">
      {/* Side nav */}
      <nav className="space-y-1">
        {CONFIG_NAV.map((n) => (
          <button
            key={n.id}
            onClick={() => setPane(n.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[13px] font-semibold transition ${
              pane === n.id ? "bg-teal/15 text-teal-dark" : "text-ink2 hover:bg-surface"
            }`}
          >
            {n.icon}
            {n.label}
          </button>
        ))}
      </nav>

      {/* Panes */}
      <div className="space-y-5">
        {/* ── Perfil ── */}
        {pane === "perfil" && (
          <>
            <CfgSection
              icon={<CircleUser size={16} />}
              title="Perfil profesional"
              desc="Esta información aparece en tu sitio y en los comprobantes."
            >
              {/* Avatar */}
              <div className="flex items-center gap-4 mb-5">
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt="Avatar"
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal to-lavender flex items-center justify-center text-white text-[22px] font-bold">
                    {user ? getInitials(user.first_name, user.last_name) : "?"}
                  </div>
                )}
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) avatarMutation.mutate(file);
                    // Reset so the same file can be re-uploaded if needed
                    e.target.value = "";
                  }}
                />
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarMutation.isPending}
                  className="px-3.5 py-2 rounded-[10px] bg-surface border border-line text-[12.5px] font-semibold text-ink2 hover:bg-bg transition disabled:opacity-60"
                >
                  {avatarMutation.isPending ? "Subiendo…" : "Cambiar foto"}
                </button>
              </div>

              {/* Form fields */}
              <div className="grid sm:grid-cols-2 gap-4">
                <CfgField label="Nombre">
                  <input
                    className={cfgInput}
                    value={profileForm.first_name}
                    onChange={(e) =>
                      setProfileForm((f) => ({ ...f, first_name: e.target.value }))
                    }
                  />
                </CfgField>
                <CfgField label="Apellido">
                  <input
                    className={cfgInput}
                    value={profileForm.last_name}
                    onChange={(e) =>
                      setProfileForm((f) => ({ ...f, last_name: e.target.value }))
                    }
                  />
                </CfgField>
                <CfgField label="RUT">
                  <input
                    className={cfgInput}
                    value={profileForm.rut}
                    onChange={(e) =>
                      setProfileForm((f) => ({ ...f, rut: e.target.value }))
                    }
                  />
                </CfgField>
                <CfgField label="Teléfono">
                  <input
                    className={cfgInput}
                    value={profileForm.phone}
                    onChange={(e) =>
                      setProfileForm((f) => ({ ...f, phone: e.target.value }))
                    }
                  />
                </CfgField>
                <CfgField label="Email">
                  <input
                    className={cfgInputReadOnly}
                    value={user?.email ?? ""}
                    readOnly
                    tabIndex={-1}
                  />
                </CfgField>
              </div>
            </CfgSection>
            <div className="flex justify-end">
              <button
                onClick={() => profileMutation.mutate(profileForm)}
                disabled={profileMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-teal-dark text-white text-[13px] font-semibold hover:opacity-90 transition shadow-soft disabled:opacity-60"
              >
                <Check size={15} />
                {profileMutation.isPending ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </>
        )}

        {/* ── Sedes ── */}
        {pane === "sedes" && (
          <>
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-5 w-5 rounded-full border-2 border-line border-t-teal animate-spin" />
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-ink3">
                <AlertCircle size={28} className="opacity-40" />
                <p className="text-[13px]">Error al cargar las sedes</p>
              </div>
            ) : locations.length > 0 ? (
              locations.map((loc) => (
                <CfgSection
                  key={loc.id}
                  icon={<MapPin size={16} />}
                  title={loc.name}
                  desc={loc.address ? `${loc.address}, ${loc.city}` : loc.city}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[12.5px] text-ink2">Sede habilitada</span>
                    <ConfigToggle
                      checked={loc.is_active}
                      onChange={(v) => locationToggleMutation.mutate({ id: loc.id, is_active: v })}
                      disabled={locationToggleMutation.isPending}
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <CfgField label="Dirección">
                      <input
                        className={cfgInputReadOnly}
                        defaultValue={loc.address}
                        readOnly
                      />
                    </CfgField>
                    <CfgField label="Teléfono">
                      <input
                        className={cfgInputReadOnly}
                        defaultValue={loc.phone || "—"}
                        readOnly
                      />
                    </CfgField>
                  </div>
                </CfgSection>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-ink3">
                <MapPin size={28} className="opacity-40" />
                <p className="text-[13px]">No hay sedes configuradas</p>
              </div>
            )}

            <CfgSection
              icon={<Video size={16} />}
              title="Atencion online"
              desc="Videollamada para familias en regiones."
            >
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] text-ink2">Habilitar reservas online</span>
                <ConfigToggle
                  checked={onlineEnabled}
                  onChange={(v) => toggleOnlineMutation.mutate(v)}
                />
              </div>
            </CfgSection>
          </>
        )}

        {/* ── Precios y pagos ── */}
        {pane === "precios" && (
          <>
            <CfgSection
              icon={<CreditCard size={16} />}
              title="Aranceles"
              desc="Valores que verán las familias al reservar."
            >
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-5 w-5 rounded-full border-2 border-line border-t-teal animate-spin" />
                </div>
              ) : services.length > 0 ? (
                <>
                  <ul className="divide-y divide-line/70 -mt-1">
                    {services
                      .slice()
                      .sort((a, b) => a.display_order - b.display_order)
                      .map((svc) => (
                        <li
                          key={svc.id}
                          className="flex items-center justify-between gap-4 py-2.5"
                        >
                          <span className="text-[13px] text-ink">{svc.name}</span>
                          <input
                            className="w-28 px-3 py-1.5 rounded-[9px] bg-bg border border-line text-[12.5px] font-semibold text-ink3 text-right cursor-default"
                            value={formatCLP(svc.price_clp)}
                            readOnly
                          />
                        </li>
                      ))}
                  </ul>
                  <p className="text-[11px] text-ink3 mt-3">
                    Para modificar aranceles, usá el panel de administración.
                  </p>
                </>
              ) : (
                <p className="text-[13px] text-ink3 py-4">No hay servicios configurados.</p>
              )}
            </CfgSection>

            <CfgSection
              icon={<CreditCard size={16} />}
              title="Medios de pago"
              desc="Cómo cobran las reservas online."
            >
              {(
                [
                  ["mercadopago", "MercadoPago (tarjetas)"],
                  ["transfer", "Transferencia bancaria"],
                  ["presencial", "Pago en consulta"],
                ] as const
              ).map(([k, label]) => (
                <div
                  key={k}
                  className="flex items-center justify-between py-2 border-b border-line/60 last:border-0"
                >
                  <span className="text-[12.5px] text-ink2">{label}</span>
                  <ConfigToggle
                    checked={paymentMethods[k]}
                    onChange={(v) => setPaymentMethods((p) => ({ ...p, [k]: v }))}
                  />
                </div>
              ))}
            </CfgSection>
          </>
        )}

        {/* ── Notificaciones ── */}
        {pane === "notif" && (
          <>
            {notifPrefsQ.isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-5 w-5 rounded-full border-2 border-line border-t-teal animate-spin" />
              </div>
            ) : notifPrefsQ.isError ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-ink3">
                <AlertCircle size={28} className="opacity-40" />
                <p className="text-[13px]">Error al cargar las preferencias</p>
              </div>
            ) : (
              <>
                <CfgSection
                  icon={<Bell size={16} />}
                  title="Recordatorios a las familias"
                  desc="Avisos automáticos antes de cada turno."
                >
                  <div className="flex items-center justify-between py-2.5 border-b border-line/60 last:border-0">
                    <span className="text-[12.5px] text-ink2">Recordatorio por email</span>
                    <ConfigToggle
                      checked={notifPrefs?.email_appointment_reminder ?? false}
                      disabled={notifMutation.isPending}
                      onChange={(v) =>
                        notifMutation.mutate({ email_appointment_reminder: v })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-b border-line/60 last:border-0">
                    <span className="text-[12.5px] text-ink2">Turno confirmado</span>
                    <ConfigToggle
                      checked={notifPrefs?.email_appointment_confirmed ?? false}
                      disabled={notifMutation.isPending}
                      onChange={(v) =>
                        notifMutation.mutate({ email_appointment_confirmed: v })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between py-2.5 last:border-0">
                    <span className="text-[12.5px] text-ink2">Turno cancelado</span>
                    <ConfigToggle
                      checked={notifPrefs?.email_appointment_cancelled ?? false}
                      disabled={notifMutation.isPending}
                      onChange={(v) =>
                        notifMutation.mutate({ email_appointment_cancelled: v })
                      }
                    />
                  </div>
                </CfgSection>

                <CfgSection
                  icon={<AlertCircle size={16} />}
                  title="Tus alertas"
                  desc="Lo que querés que el sistema te avise a vos."
                >
                  <div className="flex items-center justify-between py-2.5 border-b border-line/60 last:border-0">
                    <span className="text-[12.5px] text-ink2">Lista de espera disponible</span>
                    <ConfigToggle
                      checked={notifPrefs?.email_waitlist_available ?? false}
                      disabled={notifMutation.isPending}
                      onChange={(v) =>
                        notifMutation.mutate({ email_waitlist_available: v })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-b border-line/60 last:border-0">
                    <span className="text-[12.5px] text-ink2">Pagos recibidos</span>
                    <ConfigToggle
                      checked={notifPrefs?.email_payment_received ?? false}
                      disabled={notifMutation.isPending}
                      onChange={(v) =>
                        notifMutation.mutate({ email_payment_received: v })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between py-2.5 last:border-0">
                    <span className="text-[12.5px] text-ink2">Blog y novedades</span>
                    <ConfigToggle
                      checked={notifPrefs?.email_blog_posts ?? false}
                      disabled={notifMutation.isPending}
                      onChange={(v) =>
                        notifMutation.mutate({ email_blog_posts: v })
                      }
                    />
                  </div>
                </CfgSection>
              </>
            )}
          </>
        )}

        {/* ── Cuenta ── */}
        {pane === "cuenta" && (
          <>
            <CfgSection
              icon={<Lock size={16} />}
              title="Seguridad"
              desc="Acceso a tu cuenta de Pediacore."
            >
              {/* Inline password change form */}
              {!pwVisible ? (
                <button
                  onClick={() => setPwVisible(true)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-[10px] bg-bg border border-line hover:bg-line/40 transition text-left"
                >
                  <span className="text-[13px] font-semibold text-ink">Cambiar contraseña</span>
                  <Lock size={14} className="text-ink3" />
                </button>
              ) : (
                <div className="space-y-3">
                  <CfgField label="Contraseña actual">
                    <input
                      type="password"
                      className={cfgInput}
                      value={pwForm.current_password}
                      onChange={(e) =>
                        setPwForm((f) => ({ ...f, current_password: e.target.value }))
                      }
                      autoComplete="current-password"
                    />
                  </CfgField>
                  <CfgField label="Nueva contraseña">
                    <input
                      type="password"
                      className={cfgInput}
                      value={pwForm.new_password}
                      onChange={(e) =>
                        setPwForm((f) => ({ ...f, new_password: e.target.value }))
                      }
                      autoComplete="new-password"
                    />
                  </CfgField>
                  <CfgField label="Confirmar nueva contraseña">
                    <input
                      type="password"
                      className={cfgInput}
                      value={pwForm.confirm_password}
                      onChange={(e) =>
                        setPwForm((f) => ({ ...f, confirm_password: e.target.value }))
                      }
                      autoComplete="new-password"
                    />
                  </CfgField>
                  {pwForm.confirm_password && pwForm.new_password !== pwForm.confirm_password && (
                    <p className="text-[12px] text-err">Las contraseñas no coinciden</p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => passwordMutation.mutate(pwForm)}
                      disabled={
                        passwordMutation.isPending ||
                        !pwForm.current_password ||
                        !pwForm.new_password ||
                        !pwForm.confirm_password ||
                        pwForm.new_password !== pwForm.confirm_password
                      }
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-teal-dark text-white text-[12.5px] font-semibold hover:opacity-90 transition disabled:opacity-60"
                    >
                      <Check size={13} />
                      {passwordMutation.isPending ? "Guardando…" : "Confirmar"}
                    </button>
                    <button
                      onClick={() => {
                        setPwVisible(false);
                        setPwForm({ current_password: "", new_password: "", confirm_password: "" });
                      }}
                      className="px-4 py-2.5 rounded-[10px] bg-bg border border-line text-[12.5px] font-semibold text-ink2 hover:bg-line/40 transition"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </CfgSection>

            <CfgSection
              icon={<Download size={16} />}
              title="Resumen del consultorio"
              desc="Descargá un resumen profesional con sedes, servicios, horarios y estadísticas."
            >
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-surface border border-line text-[12.5px] font-semibold text-ink2 hover:bg-bg transition"
              >
                <Download size={14} /> Descargar resumen PDF
              </button>
            </CfgSection>

            <button
              onClick={() => setLogoutOpen(true)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-[12px] border border-err/40 text-[#A85050] text-[13px] font-semibold hover:bg-err/10 transition"
            >
              <LogOut size={15} /> Cerrar sesión
            </button>
          </>
        )}
      </div>

      <ConfirmDialog
        open={logoutOpen}
        title="Cerrar sesión"
        message="¿Estás seguro de que querés salir?"
        confirmLabel="Cerrar sesión"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={async () => { await logout(); navigate("/login"); }}
        onCancel={() => setLogoutOpen(false)}
      />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-[12px] text-white text-[12.5px] font-semibold shadow-pop flex items-center gap-2 ${
            toast.error ? "bg-err" : "bg-ink"
          }`}
        >
          {toast.error ? (
            <AlertCircle size={14} className="text-white" />
          ) : (
            <Check size={14} className="text-teal" />
          )}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
