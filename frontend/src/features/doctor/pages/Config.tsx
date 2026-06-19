import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CircleUser,
  MapPin,
  CreditCard,
  Bell,
  Lock,
  Video,
  Check,
  ChevronRight,
  Download,
  AlertCircle,
  LogOut,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import type { Location, Service, PaginatedResponse } from "@/types/api";

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatCLP(amount: number): string {
  return `$${amount.toLocaleString("es-CL")}`;
}

// ─── sub-components ───────────────────────────────────────────────────────────

function ConfigToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="shrink-0"
      role="switch"
      aria-checked={checked}
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
  const { logout } = useAuthStore();
  const [pane, setPane] = useState<PaneId>("perfil");
  const [notif, setNotif] = useState({
    wapp: true, email: true, rec24: true, rec2: true,
    noshow: true, resumen: false, pagos: true,
  });
  const [onlineEnabled, setOnlineEnabled] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState({
    mercadopago: true,
    transfer: true,
    presencial: true,
  });
  const [twoFa, setTwoFa] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // local service prices (editable)
  const [servicePrices, setServicePrices] = useState<Record<number, string>>({});

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const tn = (k: keyof typeof notif) => setNotif((n) => ({ ...n, [k]: !n[k] }));

  // API queries
  const locationsQ = useQuery<PaginatedResponse<Location>>({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Location>>("/locations/");
      return data;
    },
    staleTime: 1000 * 60 * 60,
  });

  const servicesQ = useQuery<PaginatedResponse<Service>>({
    queryKey: ["services"],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Service>>("/services/");
      return data;
    },
    staleTime: 1000 * 60 * 60,
  });

  const locations = locationsQ.data?.results ?? [];
  const services = servicesQ.data?.results ?? [];

  // seed local price state from API
  useEffect(() => {
    if (services.length === 0) return;
    setServicePrices(
      Object.fromEntries(services.map((s) => [s.id, formatCLP(s.price_clp)]))
    );
  }, [services]);

  const isLoading = locationsQ.isLoading || servicesQ.isLoading;
  const isError = locationsQ.isError || servicesQ.isError;

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
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal to-lavender flex items-center justify-center text-white text-[22px] font-bold">
                  E
                </div>
                <button
                  onClick={() => flash("Subir foto (demo)")}
                  className="px-3.5 py-2 rounded-[10px] bg-surface border border-line text-[12.5px] font-semibold text-ink2 hover:bg-bg transition"
                >
                  Cambiar foto
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <CfgField label="Nombre">
                  <input className={cfgInput} defaultValue="Estefanía Ortigosa" />
                </CfgField>
                <CfgField label="Especialidad">
                  <input className={cfgInput} defaultValue="Médica Pediatra" />
                </CfgField>
                <CfgField label="RUT">
                  <input className={cfgInput} defaultValue="28.625.096-3" />
                </CfgField>
                <CfgField label="Registro (Superintendencia)">
                  <input className={cfgInput} defaultValue="MN 12.847" />
                </CfgField>
                <CfgField label="Email">
                  <input className={cfgInput} defaultValue="estefiortigosa.pediatra@gmail.com" />
                </CfgField>
                <CfgField label="Teléfono">
                  <input className={cfgInput} defaultValue="+56 9 5845 5537" />
                </CfgField>
              </div>
            </CfgSection>
            <div className="flex justify-end">
              <button
                onClick={() => flash("Perfil guardado")}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-teal-dark text-white text-[13px] font-semibold hover:opacity-90 transition shadow-soft"
              >
                <Check size={15} /> Guardar cambios
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
              locations
                .filter((loc) => loc.is_active)
                .map((loc) => (
                  <CfgSection
                    key={loc.id}
                    icon={<MapPin size={16} />}
                    title={loc.name}
                    desc={loc.address ? `${loc.address}, ${loc.city}` : loc.city}
                  >
                    <div className="grid sm:grid-cols-2 gap-4">
                      <CfgField label="Dirección">
                        <input className={cfgInput} defaultValue={loc.address} />
                      </CfgField>
                      <CfgField label="Teléfono">
                        <input className={cfgInput} defaultValue={loc.phone || ""} />
                      </CfgField>
                    </div>
                  </CfgSection>
                ))
            ) : (
              // Fallback hardcoded sedes if API has no data
              <>
                <CfgSection
                  icon={<MapPin size={16} />}
                  title="Centro El Valle · Pucón"
                  desc="Sede principal presencial."
                >
                  <div className="grid sm:grid-cols-2 gap-4">
                    <CfgField label="Dirección">
                      <input className={cfgInput} defaultValue="Gral. Urrutia 291, Of. 4" />
                    </CfgField>
                    <CfgField label="Teléfono">
                      <input className={cfgInput} defaultValue="+56 9 4500 0000" />
                    </CfgField>
                  </div>
                </CfgSection>
                <CfgSection
                  icon={<MapPin size={16} />}
                  title="Almainfancia · Villarrica"
                  desc="Sede presencial secundaria."
                >
                  <div className="grid sm:grid-cols-2 gap-4">
                    <CfgField label="Dirección">
                      <input className={cfgInput} defaultValue="Valentín Letelier 921" />
                    </CfgField>
                    <CfgField label="Teléfono">
                      <input className={cfgInput} defaultValue="+56 9 4500 0001" />
                    </CfgField>
                  </div>
                </CfgSection>
              </>
            )}

            {/* Online toggle always present */}
            <CfgSection
              icon={<Video size={16} />}
              title="Atención online"
              desc="Videollamada para familias en regiones."
            >
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] text-ink2">Habilitar reservas online</span>
                <ConfigToggle
                  checked={onlineEnabled}
                  onChange={(v) => {
                    setOnlineEnabled(v);
                    flash("Ajuste actualizado");
                  }}
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
                <ul className="divide-y divide-line/70 -mt-1">
                  {services
                    .slice()
                    .sort((a, b) => a.display_order - b.display_order)
                    .map((svc) => (
                      <li key={svc.id} className="flex items-center justify-between gap-4 py-2.5">
                        <span className="text-[13px] text-ink">{svc.name}</span>
                        <input
                          className="w-28 px-3 py-1.5 rounded-[9px] bg-bg border border-line text-[12.5px] font-semibold text-ink text-right focus:outline-none focus:border-teal"
                          value={servicePrices[svc.id] ?? formatCLP(svc.price_clp)}
                          onChange={(e) =>
                            setServicePrices((p) => ({ ...p, [svc.id]: e.target.value }))
                          }
                        />
                      </li>
                    ))}
                </ul>
              ) : (
                // Fallback demo values
                <ul className="divide-y divide-line/70 -mt-1">
                  {[
                    ["Control de niño sano", "$40.000"],
                    ["Control por enfermedad", "$40.000"],
                    ["Telemedicina", "$35.000"],
                    ["Asesoría de lactancia", "$40.000"],
                    ["Control FONASA", "$32.000"],
                  ].map(([s, v]) => (
                    <li key={s} className="flex items-center justify-between gap-4 py-2.5">
                      <span className="text-[13px] text-ink">{s}</span>
                      <input
                        className="w-28 px-3 py-1.5 rounded-[9px] bg-bg border border-line text-[12.5px] font-semibold text-ink text-right focus:outline-none focus:border-teal"
                        defaultValue={v}
                      />
                    </li>
                  ))}
                </ul>
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
                    onChange={(v) => {
                      setPaymentMethods((p) => ({ ...p, [k]: v }));
                      flash("Medio de pago actualizado");
                    }}
                  />
                </div>
              ))}
            </CfgSection>
          </>
        )}

        {/* ── Notificaciones ── */}
        {pane === "notif" && (
          <>
            <CfgSection
              icon={<Bell size={16} />}
              title="Recordatorios a las familias"
              desc="Avisos automáticos antes de cada turno."
            >
              {(
                [
                  ["wapp",  "Recordatorio por WhatsApp"],
                  ["email", "Recordatorio por email"],
                  ["rec24", "Avisar 24 horas antes"],
                  ["rec2",  "Avisar 2 horas antes"],
                ] as const
              ).map(([k, label]) => (
                <div
                  key={k}
                  className="flex items-center justify-between py-2.5 border-b border-line/60 last:border-0"
                >
                  <span className="text-[12.5px] text-ink2">{label}</span>
                  <ConfigToggle checked={notif[k]} onChange={() => tn(k)} />
                </div>
              ))}
            </CfgSection>

            <CfgSection
              icon={<AlertCircle size={16} />}
              title="Tus alertas"
              desc="Lo que querés que el sistema te avise a vos."
            >
              {(
                [
                  ["noshow",  "Avisar cuando un paciente no asiste"],
                  ["resumen", "Resumen diario de la agenda por email"],
                  ["pagos",   "Notificar pagos recibidos"],
                ] as const
              ).map(([k, label]) => (
                <div
                  key={k}
                  className="flex items-center justify-between py-2.5 border-b border-line/60 last:border-0"
                >
                  <span className="text-[12.5px] text-ink2">{label}</span>
                  <ConfigToggle checked={notif[k]} onChange={() => tn(k)} />
                </div>
              ))}
            </CfgSection>
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
              <div className="space-y-3">
                <button
                  onClick={() => flash("Cambiar contraseña (demo)")}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-[10px] bg-bg border border-line hover:bg-line/40 transition text-left"
                >
                  <span className="text-[13px] font-semibold text-ink">Cambiar contraseña</span>
                  <ChevronRight size={15} className="text-ink3" />
                </button>
                <div className="flex items-center justify-between px-4 py-3 rounded-[10px] bg-bg border border-line">
                  <div>
                    <div className="text-[13px] font-semibold text-ink">
                      Verificación en dos pasos
                    </div>
                    <div className="text-[11px] text-ink3 mt-0.5">
                      Mayor seguridad al iniciar sesión
                    </div>
                  </div>
                  <ConfigToggle
                    checked={twoFa}
                    onChange={(v) => {
                      setTwoFa(v);
                      flash("2FA actualizado");
                    }}
                  />
                </div>
              </div>
            </CfgSection>

            <CfgSection
              icon={<Download size={16} />}
              title="Datos"
              desc="Exportá la información de tu consultorio."
            >
              <button
                onClick={() => flash("Generando exportación…")}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-surface border border-line text-[12.5px] font-semibold text-ink2 hover:bg-bg transition"
              >
                <Download size={14} /> Exportar pacientes y consultas
              </button>
            </CfgSection>

            <button
              onClick={async () => { await logout(); navigate("/login"); }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-[12px] border border-err/40 text-[#A85050] text-[13px] font-semibold hover:bg-err/10 transition"
            >
              <LogOut size={15} /> Cerrar sesión
            </button>
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-[12px] bg-ink text-white text-[12.5px] font-semibold shadow-pop flex items-center gap-2">
          <Check size={14} className="text-teal" />
          {toast}
        </div>
      )}
    </div>
  );
}
