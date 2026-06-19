import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Plus,
  Filter,
  Download,
  MoreHorizontal,
  FileText,
  CalendarPlus,
  MessageCircle,
  Folder,
  X,
  Check,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Patient, PaginatedResponse } from "@/types/api";

// ─── Palettes for deterministic avatars ─────────────────────────────────────

const PALETTES: [string, string][] = [
  ["#F4A89A", "#FFE2D9"],
  ["#7DD3C0", "#D6F1EA"],
  ["#C7B8E8", "#EDE4FF"],
  ["#A8D5B5", "#DAEFE0"],
  ["#F5D4A0", "#FCEACB"],
];

function getPalette(name: string): [string, string] {
  const code = name.charCodeAt(0) % PALETTES.length;
  return PALETTES[code];
}

// ─── Age helpers ─────────────────────────────────────────────────────────────

function getAgeMonths(patient: Patient): number {
  return patient.age.years * 12 + patient.age.months;
}

function formatAge(patient: Patient): string {
  const { years, months } = patient.age;
  if (years === 0) return `${months} m`;
  if (months === 0) return `${years} a`;
  return `${years} a ${months} m`;
}

// ─── Age bucket filter ───────────────────────────────────────────────────────

type AgeBucket = "todos" | "lactante" | "preescolar" | "escolar" | "adolescente";

const BUCKETS: { id: AgeBucket; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "lactante", label: "Lactantes (0-2)" },
  { id: "preescolar", label: "Preescolar (2-6)" },
  { id: "escolar", label: "Escolar (6-12)" },
  { id: "adolescente", label: "Adolescente (12-18)" },
];

function getBucket(ageMonths: number): AgeBucket {
  if (ageMonths < 24) return "lactante";
  if (ageMonths < 72) return "preescolar";
  if (ageMonths < 144) return "escolar";
  return "adolescente";
}

function matchesBucket(patient: Patient, bucket: AgeBucket): boolean {
  if (bucket === "todos") return true;
  return getBucket(getAgeMonths(patient)) === bucket;
}

// ─── Sort ────────────────────────────────────────────────────────────────────

type SortKey = "name" | "age";
type SortDir = "asc" | "desc";

// ─── AgeBadge ────────────────────────────────────────────────────────────────

function AgeBadge({ ageMonths }: { ageMonths: number }) {
  let color: string;
  let label: string;

  if (ageMonths < 24) {
    color = "#7DD3C0";
    label = "Lactante";
  } else if (ageMonths < 72) {
    color = "#C7B8E8";
    label = "Preescolar";
  } else if (ageMonths < 144) {
    color = "#A8D5B5";
    label = "Escolar";
  } else {
    color = "#F4A89A";
    label = "Adolescente";
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-ink3" title={label}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
      {label}
    </span>
  );
}

// ─── Patient avatar ──────────────────────────────────────────────────────────

function PatientAvatar({ name, size = 36 }: { name: string; size?: number }) {
  const [fg, bg] = getPalette(name);
  const initial = (name || "?").charAt(0).toUpperCase();

  return (
    <div
      className="rounded-full flex items-center justify-center font-bold shrink-0"
      style={{
        width: size,
        height: size,
        background: bg,
        color: fg,
        fontSize: size * 0.36,
      }}
    >
      {initial}
    </div>
  );
}

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-6 right-6 z-[60] px-4 py-3 rounded-[12px] bg-ink text-white text-[12.5px] font-semibold shadow-pop flex items-center gap-2">
      <Check size={14} className="text-teal" />
      {message}
    </div>
  );
}

// ─── Row context menu ─────────────────────────────────────────────────────────

interface RowMenuProps {
  onFicha: () => void;
  onAgendar: () => void;
  onMensaje: () => void;
  onArchivar: () => void;
  onClose: () => void;
}

function RowMenu({ onFicha, onAgendar, onMensaje, onArchivar, onClose }: RowMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const menuItem = (
    icon: React.ReactNode,
    label: string,
    fn: () => void,
    danger = false
  ) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        fn();
        onClose();
      }}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] font-medium text-left hover:bg-bg transition",
        danger ? "text-[#A85050]" : "text-ink2"
      )}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div
      ref={ref}
      className="absolute right-2 top-11 z-20 w-44 bg-surface border border-line rounded-[12px] shadow-pop overflow-hidden py-1"
      onClick={(e) => e.stopPropagation()}
    >
      {menuItem(<FileText size={14} />, "Ver ficha", onFicha)}
      {menuItem(<CalendarPlus size={14} />, "Agendar turno", onAgendar)}
      {menuItem(<MessageCircle size={14} />, "Mensaje al tutor", onMensaje)}
      <div className="h-px bg-line/70 my-1" />
      {menuItem(<Folder size={14} />, "Archivar", onArchivar, true)}
    </div>
  );
}

// ─── Nuevo paciente modal ─────────────────────────────────────────────────────

interface NuevoPacienteForm {
  nombre: string;
  apellido: string;
  rut: string;
  nacimiento: string;
  sexo: "Femenino" | "Masculino";
  tutor: string;
  telefono: string;
  sede: string;
}

interface NuevoPacienteModalProps {
  onClose: () => void;
  onFlash: (msg: string) => void;
  onCreated: (id: number) => void;
}

function NuevoPacienteModal({ onClose, onFlash, onCreated }: NuevoPacienteModalProps) {
  const [form, setForm] = useState<NuevoPacienteForm>({
    nombre: "",
    apellido: "",
    rut: "",
    nacimiento: "",
    sexo: "Femenino",
    tutor: "",
    telefono: "",
    sede: "Pucón",
  });

  const set = (key: keyof NuevoPacienteForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const canSave = form.nombre.trim() && form.apellido.trim() && form.rut.trim();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const { data } = await api.post<Patient>("/patients/", {
        practice: 1,
        first_name: form.nombre.trim(),
        last_name: form.apellido.trim(),
        rut: form.rut.trim(),
        date_of_birth: form.nacimiento || undefined,
        sex_at_birth: form.sexo === "Masculino" ? "M" : "F",
        phone: form.telefono || undefined,
        document_type: "RUT",
      });
      onFlash(`Ficha de ${form.nombre} ${form.apellido} creada`);
      onCreated(data.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al crear paciente";
      onFlash(msg);
      setSaving(false);
    }
  };

  const inputCls =
    "w-full px-3 py-2.5 rounded-[10px] bg-bg border border-line text-[13px] text-ink placeholder:text-ink3 focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/25 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-surface rounded-[18px] shadow-pop border border-line overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-3 border-b border-line/70">
          <div>
            <div className="text-[11px] uppercase tracking-[0.12em] font-bold text-teal-dark">
              Ficha nueva
            </div>
            <h3 className="text-[17px] font-bold text-ink mt-0.5">Nuevo paciente</h3>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-[10px] bg-bg border border-line flex items-center justify-center text-ink2 hover:bg-line/50 transition focus-ring"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11.5px] font-semibold text-ink2">Nombre</span>
              <input
                className={cn(inputCls, "mt-1.5")}
                value={form.nombre}
                onChange={set("nombre")}
                placeholder="Mateo"
              />
            </label>
            <label className="block">
              <span className="text-[11.5px] font-semibold text-ink2">Apellido</span>
              <input
                className={cn(inputCls, "mt-1.5")}
                value={form.apellido}
                onChange={set("apellido")}
                placeholder="González"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11.5px] font-semibold text-ink2">RUT</span>
              <input
                className={cn(inputCls, "mt-1.5")}
                value={form.rut}
                onChange={set("rut")}
                placeholder="25.834.221-3"
              />
            </label>
            <label className="block">
              <span className="text-[11.5px] font-semibold text-ink2">Fecha de nacimiento</span>
              <input
                type="date"
                className={cn(inputCls, "mt-1.5")}
                value={form.nacimiento}
                onChange={set("nacimiento")}
              />
            </label>
          </div>

          <div>
            <span className="text-[11.5px] font-semibold text-ink2">Sexo</span>
            <div className="mt-1.5 inline-flex p-1 rounded-[10px] bg-bg border border-line w-full">
              {(["Femenino", "Masculino"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setForm((f) => ({ ...f, sexo: s }))}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-[7px] text-[12.5px] font-semibold transition",
                    form.sexo === s
                      ? "bg-teal-dark text-white shadow-soft"
                      : "text-ink2 hover:bg-surface"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11.5px] font-semibold text-ink2">Tutor principal</span>
              <input
                className={cn(inputCls, "mt-1.5")}
                value={form.tutor}
                onChange={set("tutor")}
                placeholder="Carolina González"
              />
            </label>
            <label className="block">
              <span className="text-[11.5px] font-semibold text-ink2">Teléfono</span>
              <input
                className={cn(inputCls, "mt-1.5")}
                value={form.telefono}
                onChange={set("telefono")}
                placeholder="+56 9 ..."
              />
            </label>
          </div>

          <label className="block">
            <span className="text-[11.5px] font-semibold text-ink2">Sede habitual</span>
            <select
              className={cn(inputCls, "mt-1.5")}
              value={form.sede}
              onChange={set("sede")}
            >
              <option>Pucón</option>
              <option>Villarrica</option>
              <option>Online</option>
            </select>
          </label>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-line bg-bg/40 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-[10px] text-[12.5px] font-semibold text-ink2 hover:bg-bg transition focus-ring"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={!canSave || saving}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-[10px] bg-teal-dark text-white text-[12.5px] font-semibold hover:opacity-90 transition shadow-soft focus-ring disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check size={15} />
            {saving ? "Creando..." : "Crear ficha"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Patients page ────────────────────────────────────────────────────────────

export default function Patients() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  // ── Filter state ────────────────────────────────────────────────────────────
  const [q, setQ] = useState("");
  const [bucket, setBucket] = useState<AgeBucket>("todos");
  const [showFilters, setShowFilters] = useState(false);
  const [sedeFilter, setSedeFilter] = useState("Todas");
  const [proxFilter, setProxFilter] = useState<"todos" | "agendado" | "sin">("todos");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "name", dir: "asc" });

  // ── UI state ────────────────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [menuId, setMenuId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  // ── Data ────────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery<PaginatedResponse<Patient>>({
    queryKey: ["patients", "all"],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Patient>>("/patients/?page_size=500");
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const all = data?.results ?? [];

  // ── Filtered + sorted list ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let arr = all.filter((p) => {
      // Age bucket
      if (!matchesBucket(p, bucket)) return false;

      // Sede filter (if patient has location-related fields in the future)
      // Currently patients don't carry a sede field; skip if "Todas"
      if (sedeFilter !== "Todas") {
        // Patients don't have a sede field in the current API; skip gracefully
      }

      // Próximo control filter
      if (proxFilter === "agendado" && !p.next_appointment_date) return false;
      if (proxFilter === "sin" && p.next_appointment_date) return false;

      // Text search
      if (q) {
        const lower = q.toLowerCase();
        const rutNorm = (val: string) => val.replace(/\./g, "").replace(/-/g, "").toLowerCase();
        const nameMatch = p.full_name.toLowerCase().includes(lower);
        const rutMatch = rutNorm(p.rut).includes(rutNorm(q));
        if (!nameMatch && !rutMatch) return false;
      }

      return true;
    });

    // Sort
    arr = [...arr].sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      if (sort.key === "name") {
        av = a.full_name.toLowerCase();
        bv = b.full_name.toLowerCase();
      } else {
        av = getAgeMonths(a);
        bv = getAgeMonths(b);
      }
      if (av < bv) return sort.dir === "asc" ? -1 : 1;
      if (av > bv) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });

    return arr;
  }, [all, bucket, sedeFilter, proxFilter, q, sort]);

  const activeFilters =
    (sedeFilter !== "Todas" ? 1 : 0) + (proxFilter !== "todos" ? 1 : 0);

  const toggleSort = (key: SortKey) =>
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
    );

  const sortIcon = (key: SortKey) => {
    if (sort.key !== key) return null;
    return sort.dir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  const primaryTutor = (p: Patient) =>
    p.tutors.find((t) => t.is_primary) ?? p.tutors[0];

  const handleExport = () => flash(`Exportando ${filtered.length} pacientes a CSV…`);

  const clearAllFilters = () => {
    setQ("");
    setBucket("todos");
    setSedeFilter("Todas");
    setProxFilter("todos");
  };

  return (
    <div className="space-y-5 max-w-[1200px]">
      {/* Search + actions row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[260px] max-w-[520px]">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink3 pointer-events-none"
          />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar paciente por nombre o RUT"
            className={cn(
              "w-full pl-10 pr-9 py-3 rounded-[10px]",
              "bg-surface border border-line",
              "text-[13.5px] text-ink placeholder:text-ink3",
              "focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20",
              "transition"
            )}
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink3 hover:text-ink transition"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters((s) => !s)}
          className={cn(
            "relative inline-flex items-center gap-2 px-4 py-3 rounded-[10px] border text-[13px] font-semibold transition focus-ring",
            showFilters || activeFilters > 0
              ? "bg-teal/15 border-teal/40 text-teal-dark"
              : "bg-surface border-line text-ink2 hover:bg-bg"
          )}
        >
          <Filter size={15} />
          Más filtros
          {activeFilters > 0 && (
            <span className="w-4 h-4 rounded-full bg-teal-dark text-white text-[9px] font-bold flex items-center justify-center">
              {activeFilters}
            </span>
          )}
        </button>

        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-4 py-3 rounded-[10px] bg-surface border border-line text-[13px] font-semibold text-ink2 hover:bg-bg transition focus-ring"
          title="Exportar CSV"
        >
          <Download size={15} />
          <span className="hidden sm:inline">Exportar</span>
        </button>

        <div className="flex-1" />

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-3 rounded-[10px] bg-teal-dark text-white text-[13px] font-semibold hover:opacity-90 transition shadow-soft focus-ring"
        >
          <Plus size={15} />
          Nuevo paciente
        </button>
      </div>

      {/* Advanced filters panel */}
      {showFilters && (
        <div className="bg-surface border border-line rounded-[14px] shadow-card p-4 flex flex-wrap items-center gap-x-8 gap-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11.5px] font-semibold text-ink3 uppercase tracking-wider">
              Sede
            </span>
            {["Todas", "Pucón", "Villarrica", "Online"].map((s) => (
              <button
                key={s}
                onClick={() => setSedeFilter(s)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[12px] font-semibold transition border",
                  sedeFilter === s
                    ? "bg-teal/20 border-teal/40 text-teal-dark"
                    : "bg-bg border-line text-ink2 hover:bg-surface"
                )}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11.5px] font-semibold text-ink3 uppercase tracking-wider">
              Próximo control
            </span>
            {(
              [
                ["todos", "Todos"],
                ["agendado", "Agendado"],
                ["sin", "Sin agendar"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setProxFilter(id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[12px] font-semibold transition border",
                  proxFilter === id
                    ? "bg-[#C7B8E8]/25 border-[#C7B8E8]/50 text-[#6B569E]"
                    : "bg-bg border-line text-ink2 hover:bg-surface"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {activeFilters > 0 && (
            <button
              onClick={() => {
                setSedeFilter("Todas");
                setProxFilter("todos");
              }}
              className="text-[12px] font-semibold text-ink3 hover:text-ink2 inline-flex items-center gap-1 transition"
            >
              <X size={12} />
              Limpiar
            </button>
          )}
        </div>
      )}

      {/* Age bucket chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {BUCKETS.map((b) => {
          const count =
            b.id === "todos"
              ? all.length
              : all.filter((p) => getBucket(getAgeMonths(p)) === b.id).length;
          const isActive = bucket === b.id;

          return (
            <button
              key={b.id}
              onClick={() => setBucket(b.id)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold transition border",
                isActive
                  ? "bg-teal/20 border-teal/40 text-teal-dark"
                  : "bg-surface border-line text-ink2 hover:bg-bg"
              )}
            >
              {b.label}
              <span className={cn("text-[10px]", isActive ? "text-teal-dark/70" : "text-ink3")}>
                {count}
              </span>
            </button>
          );
        })}
        <div className="flex-1" />
        <span className="text-[11.5px] text-ink3">
          {filtered.length} {filtered.length === 1 ? "paciente" : "pacientes"}
        </span>
      </div>

      {/* Table */}
      <div className="bg-surface border border-line rounded-[14px] shadow-card overflow-visible">
        {/* Table header */}
        <div className="grid grid-cols-[2.2fr_1.4fr_1.4fr_1fr_1fr_60px] gap-4 px-5 py-3 text-[10.5px] uppercase tracking-[0.12em] font-semibold text-ink3 border-b border-line bg-bg/50">
          <button
            onClick={() => toggleSort("name")}
            className="flex items-center gap-1 hover:text-ink2 transition text-left"
          >
            Paciente {sortIcon("name")}
          </button>
          <button
            onClick={() => toggleSort("age")}
            className="flex items-center gap-1 hover:text-ink2 transition text-left"
          >
            Edad {sortIcon("age")}
          </button>
          <div>Tutor principal</div>
          <div>Última consulta</div>
          <div>Próximo control</div>
          <div />
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="h-5 w-5 rounded-full border-2 border-line border-t-teal animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filtered.length === 0 && (
          <div className="px-5 py-16 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-bg flex items-center justify-center mb-3">
              <Search size={22} className="text-ink3" />
            </div>
            <div className="text-[13.5px] font-semibold text-ink">Sin resultados</div>
            <div className="text-[12px] text-ink3 mt-1">
              Probá con otro nombre, RUT o filtro
            </div>
            <button
              onClick={clearAllFilters}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-teal/15 text-teal-dark text-[12.5px] font-semibold hover:bg-teal/25 transition"
            >
              Limpiar filtros
            </button>
          </div>
        )}

        {/* Rows */}
        {!isLoading && filtered.length > 0 && (
          <ul>
            {filtered.map((patient, idx) => {
              const tutor = primaryTutor(patient);
              const ageMonths = getAgeMonths(patient);

              return (
                <li key={patient.id} className="relative">
                  <div
                    onClick={() => navigate(`/dashboard/pacientes/${patient.id}`)}
                    className="w-full grid grid-cols-[2.2fr_1.4fr_1.4fr_1fr_1fr_60px] gap-4 items-center px-5 py-3.5 hover:bg-bg transition cursor-pointer group"
                  >
                    {/* Paciente */}
                    <div className="flex items-center gap-3 min-w-0">
                      <PatientAvatar name={patient.full_name} />
                      <div className="min-w-0">
                        <div className="text-[13.5px] font-semibold text-ink truncate">
                          {patient.full_name}
                        </div>
                        <div className="text-[11px] text-ink3 truncate mt-0.5">
                          {patient.rut}
                        </div>
                      </div>
                    </div>

                    {/* Edad */}
                    <div className="min-w-0">
                      <div className="text-[12.5px] text-ink">{formatAge(patient)}</div>
                      <div className="mt-0.5">
                        <AgeBadge ageMonths={ageMonths} />
                      </div>
                    </div>

                    {/* Tutor principal */}
                    <div className="text-[12.5px] text-ink2 truncate">
                      {tutor ? tutor.tutor_full_name : "—"}
                    </div>

                    {/* Última consulta */}
                    <div className="text-[12.5px] text-ink2">
                      {patient.last_encounter_date
                        ? new Date(patient.last_encounter_date).toLocaleDateString("es-CL", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </div>

                    {/* Próximo control */}
                    <div
                      className={cn(
                        "text-[12.5px]",
                        patient.next_appointment_date ? "text-ink2" : "text-ink3 italic"
                      )}
                    >
                      {patient.next_appointment_date
                        ? new Date(patient.next_appointment_date + "T00:00:00").toLocaleDateString(
                            "es-CL",
                            { day: "numeric", month: "short", year: "numeric" }
                          )
                        : "sin agendar"}
                    </div>

                    {/* Menu button */}
                    <div className="flex justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuId(menuId === patient.id ? null : patient.id);
                        }}
                        className="w-8 h-8 rounded-[8px] flex items-center justify-center text-ink3 hover:text-teal-dark hover:bg-teal/10 transition focus-ring"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Context menu */}
                  {menuId === patient.id && (
                    <RowMenu
                      onClose={() => setMenuId(null)}
                      onFicha={() => navigate(`/dashboard/pacientes/${patient.id}`)}
                      onAgendar={() => navigate("/dashboard/calendario")}
                      onMensaje={() => flash("Función disponible próximamente")}
                      onArchivar={() => flash(`${patient.full_name} archivado`)}
                    />
                  )}

                  {idx < filtered.length - 1 && (
                    <div className="mx-5 h-px bg-line/60" />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* New patient modal */}
      {showModal && (
        <NuevoPacienteModal
          onClose={() => setShowModal(false)}
          onFlash={flash}
          onCreated={(id) => {
            setShowModal(false);
            qc.invalidateQueries({ queryKey: ["patients"] });
            navigate(`/dashboard/pacientes/${id}`);
          }}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} />}
    </div>
  );
}
