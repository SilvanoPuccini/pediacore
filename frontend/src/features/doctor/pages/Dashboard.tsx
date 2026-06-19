import { useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Clock,
  Stethoscope,
  Check,
  Sun,
  Plus,
  FileText,
  FileCheck,
  MessageCircle,
  Syringe,
  AlertCircle,
  CreditCard,
  ChevronRight,
  Inbox,
  MapPin,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { useSedeStore } from "../stores/useSedeStore";

// ─── Types ───────────────────────────────────────────────────────────────────

type FlowState = "confirmado" | "espera" | "consulta" | "atendido";
type PagoState = "pagado" | "pendiente";
type TaskKind = "lab" | "receta" | "mensaje" | "vacuna";

interface Turn {
  id: string;
  time: string;
  patientId: number;
  name: string;
  age: string;
  tutor: string;
  type: "Control sano" | "Consulta" | "Online";
  sede: string;
  reason: string;
  state: FlowState;
  pago: PagoState;
}

interface ClinicalTask {
  id: string;
  kind: TaskKind;
  icon: string;
  patientId: number;
  patient: string;
  title: string;
  detail: string;
  action: string;
  urgent: boolean;
}

// ─── Demo data ────────────────────────────────────────────────────────────────

const TODAY_AGENDA: Turn[] = [
  { id: "t1", time: "09:00", patientId: 1, name: "Mateo González",  age: "3 años",  tutor: "Carolina González", type: "Control sano", sede: "Pucón",      reason: "Control 41 meses",          state: "atendido",   pago: "pagado"   },
  { id: "t2", time: "09:45", patientId: 2, name: "Sofía Pérez",     age: "6 meses", tutor: "Daniela Pérez",     type: "Control sano", sede: "Pucón",      reason: "Control 6 meses + vacuna",  state: "atendido",   pago: "pagado"   },
  { id: "t3", time: "10:30", patientId: 3, name: "Lucas Martínez",  age: "5 años",  tutor: "Andrés Martínez",   type: "Consulta",     sede: "Pucón",      reason: "Tos y fiebre 48h",          state: "consulta",   pago: "pendiente"},
  { id: "t4", time: "11:30", patientId: 4, name: "Catalina Rojas",  age: "2 años",  tutor: "Javiera Rojas",     type: "Online",       sede: "Online",     reason: "Erupción en la piel",       state: "espera",     pago: "pagado"   },
  { id: "t5", time: "15:00", patientId: 5, name: "Tomás Silva",     age: "8 años",  tutor: "Rocío Silva",       type: "Consulta",     sede: "Villarrica", reason: "Control asma",              state: "confirmado", pago: "pagado"   },
  { id: "t6", time: "16:15", patientId: 6, name: "Antonia Vidal",   age: "14 años", tutor: "Patricia Vidal",    type: "Control sano", sede: "Villarrica", reason: "Control adolescente",       state: "confirmado", pago: "pendiente"},
];

const CLINICAL_TASKS: ClinicalTask[] = [
  { id: "c1", kind: "lab",     icon: "FileText",      patientId: 5, patient: "Tomás Silva",    title: "Hemograma por revisar",  detail: "Resultado cargado hoy 08:15",           action: "Revisar",   urgent: true  },
  { id: "c2", kind: "receta",  icon: "FileCheck",     patientId: 3, patient: "Lucas Martínez", title: "Receta por firmar",      detail: "Amoxicilina 250 mg/5 ml · 7 días",     action: "Firmar",    urgent: false },
  { id: "c3", kind: "mensaje", icon: "MessageCircle", patientId: 2, patient: "Daniela Pérez",  title: "Mensaje de tutora",      detail: '"¿Sofía puede bañarse tras la vacuna?"', action: "Responder", urgent: false },
  { id: "c4", kind: "vacuna",  icon: "Syringe",       patientId: 2, patient: "Sofía Pérez",    title: "Vacuna pendiente",       detail: "Pentavalente 6m · vence en 3 días",     action: "Agendar",   urgent: true  },
  { id: "c5", kind: "mensaje", icon: "MessageCircle", patientId: 4, patient: "Javiera Rojas",  title: "Mensaje de tutora",      detail: '"Adjunto foto de la erupción"',          action: "Responder", urgent: false },
];

const PRICE_BY_TYPE: Record<string, number> = {
  "Control sano": 40000,
  "Consulta":     40000,
  "Online":       35000,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dashCLP(n: number): string {
  return "$" + n.toLocaleString("es-CL");
}

function greetingText(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

function todayFormatted(): string {
  return new Date().toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function patientInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

type AvatarColors = { fg: string; bg: string };

function avatarColor(name: string): AvatarColors {
  const palettes: AvatarColors[] = [
    { fg: "#F4A89A", bg: "#FFE2D9" },
    { fg: "#7DD3C0", bg: "#D6F1EA" },
    { fg: "#C7B8E8", bg: "#EDE4FF" },
    { fg: "#A8D5B5", bg: "#DAEFE0" },
    { fg: "#F5D4A0", bg: "#FCEACB" },
  ];
  return palettes[name.charCodeAt(0) % palettes.length];
}

// ─── Static metadata ──────────────────────────────────────────────────────────

const FLOW_ORDER: FlowState[] = ["confirmado", "espera", "consulta", "atendido"];

const STATE_META: Record<FlowState, {
  label: string;
  short: string;
  color: string;
  bg: string;
  dot: string;
  Icon: React.ElementType;
}> = {
  confirmado: { label: "Confirmado",  short: "Confirmados", color: "#6B569E", bg: "rgba(199, 184, 232, 0.30)", dot: "#C7B8E8", Icon: Calendar    },
  espera:     { label: "En sala",     short: "En sala",     color: "#9C7423", bg: "rgba(245, 212, 160, 0.45)", dot: "#F5D4A0", Icon: Clock        },
  consulta:   { label: "En consulta", short: "En consulta", color: "#3E8E7C", bg: "rgba(125, 211, 192, 0.28)", dot: "#7DD3C0", Icon: Stethoscope  },
  atendido:   { label: "Atendido",    short: "Atendidos",   color: "#3F8358", bg: "rgba(168, 213, 181, 0.35)", dot: "#A8D5B5", Icon: Check        },
};

const NEXT_ACTION: Partial<Record<FlowState, { label: string; Icon: React.ElementType }>> = {
  confirmado: { label: "Marcar llegada",   Icon: Check       },
  espera:     { label: "Iniciar consulta", Icon: Stethoscope },
  consulta:   { label: "Finalizar",        Icon: Check       },
};

const TASK_ICON_MAP: Record<string, React.ElementType> = {
  FileText,
  FileCheck,
  MessageCircle,
  Syringe,
};

const TASK_KIND_COLORS: Record<TaskKind, { bg: string; text: string }> = {
  lab:     { bg: "rgba(244, 168, 154, 0.25)", text: "#B5604F" },
  receta:  { bg: "rgba(125, 211, 192, 0.20)", text: "#3E8E7C" },
  mensaje: { bg: "rgba(199, 184, 232, 0.28)", text: "#6B569E" },
  vacuna:  { bg: "rgba(245, 212, 160, 0.45)", text: "#9C7423" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypeChip({ type }: { type: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    "Control sano": { bg: "rgba(125, 211, 192, 0.20)", text: "#3E8E7C" },
    "Consulta":     { bg: "rgba(199, 184, 232, 0.30)", text: "#6B569E" },
    "Online":       { bg: "rgba(244, 168, 154, 0.25)", text: "#B5604F" },
  };
  const s = map[type] ?? map["Consulta"];
  return (
    <span
      className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold"
      style={{ background: s.bg, color: s.text }}
    >
      {type}
    </span>
  );
}

function StateBadge({ state }: { state: FlowState }) {
  const m = STATE_META[state];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{ background: m.bg, color: m.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.dot }} />
      {m.label}
    </span>
  );
}

function StageCard({
  stateKey,
  count,
  active,
  onClick,
}: {
  stateKey: FlowState;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  const m = STATE_META[stateKey];
  const IconComp = m.Icon;
  return (
    <button
      onClick={onClick}
      className={[
        "text-left bg-surface border rounded-[14px] p-4 shadow-[var(--shadow-card)] transition focus-ring",
        active
          ? "border-teal-dark ring-2 ring-teal/25"
          : "border-line hover:shadow-[var(--shadow-soft)]",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <div
          className="w-8 h-8 rounded-[9px] flex items-center justify-center"
          style={{ background: m.bg, color: m.color }}
        >
          <IconComp size={15} />
        </div>
        <span className="text-[28px] font-bold text-ink leading-none tracking-tight">
          {count}
        </span>
      </div>
      <div className="mt-2.5 text-[12.5px] font-semibold text-ink2">{m.short}</div>
    </button>
  );
}

function FocusCard({
  turn,
  onAdvance,
  onOpenFicha,
}: {
  turn: Turn | null;
  onAdvance: (id: string) => void;
  onOpenFicha: (patientId: number) => void;
}) {
  if (!turn) {
    return (
      <div className="bg-surface border border-line rounded-[16px] shadow-[var(--shadow-card)] p-6 flex items-center gap-4">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center"
          style={{ background: "rgba(168, 213, 181, 0.30)", color: "#3F8358" }}
        >
          <Check size={20} />
        </div>
        <div>
          <h3 className="text-[15px] font-bold text-ink">Día al día</h3>
          <p className="text-[12.5px] text-ink2 mt-0.5">
            No hay pacientes en sala ni en consulta ahora mismo.
          </p>
        </div>
      </div>
    );
  }

  const m = STATE_META[turn.state];
  const av = avatarColor(turn.name);
  const inConsult = turn.state === "consulta";
  const act = NEXT_ACTION[turn.state];

  return (
    <div
      className="rounded-[16px] shadow-[var(--shadow-card)] p-5 border"
      style={{
        borderColor: inConsult ? "rgba(125,211,192,0.5)" : "#E8E6E1",
        background: inConsult
          ? "linear-gradient(135deg, rgba(125,211,192,0.12), rgba(199,184,232,0.06))"
          : "#fff",
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-[11px] uppercase tracking-[0.14em] font-bold"
          style={{ color: m.color }}
        >
          {inConsult
            ? "● Ahora en consulta"
            : turn.state === "espera"
            ? "Siguiente · en sala"
            : "Siguiente paciente"}
        </span>
        <span className="text-[12px] font-bold text-teal-dark">{turn.time}</span>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={() => onOpenFicha(turn.patientId)}
          className="w-12 h-12 rounded-full flex items-center justify-center text-[16px] font-bold shrink-0 focus-ring"
          style={{ background: av.bg, color: av.fg }}
        >
          {patientInitial(turn.name)}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onOpenFicha(turn.patientId)}
              className="text-[16px] font-bold text-ink hover:text-teal-dark transition text-left focus-ring"
            >
              {turn.name}
            </button>
            <span className="text-[12px] text-ink3">· {turn.age}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 flex-wrap text-[12px] text-ink2">
            <TypeChip type={turn.type} />
            <span className="inline-flex items-center gap-1">
              <MapPin size={11} className="text-ink3" />
              {turn.sede}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 px-3 py-2 rounded-[10px] text-[12.5px] text-ink2" style={{ background: "rgba(250, 250, 247, 0.70)" }}>
        <span className="font-semibold text-ink">Motivo:</span> {turn.reason}
        {turn.pago === "pendiente" && (
          <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#9C7423]">
            <AlertCircle size={11} /> Pago pendiente
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2">
        {act && (
          <button
            onClick={() => onAdvance(turn.id)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[10px] text-white text-[13px] font-semibold hover:opacity-90 transition shadow-[var(--shadow-soft)] focus-ring"
            style={{ background: "#5CB8A4" }}
          >
            <act.Icon size={15} />
            {act.label}
          </button>
        )}
        <button
          onClick={() => onOpenFicha(turn.patientId)}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[10px] bg-surface border border-line text-[13px] font-semibold text-ink2 hover:bg-bg transition focus-ring"
        >
          <FileText size={15} />
          Ficha
        </button>
      </div>
    </div>
  );
}

function AgendaRow({
  turn,
  onAdvance,
  onCobrar,
  onOpenFicha,
}: {
  turn: Turn;
  onAdvance: (id: string) => void;
  onCobrar: (id: string) => void;
  onOpenFicha: (patientId: number) => void;
}) {
  const av = avatarColor(turn.name);
  const act = NEXT_ACTION[turn.state];
  const done = turn.state === "atendido";

  return (
    <div
      className={[
        "group flex items-center gap-4 px-4 py-3 rounded-[12px] transition",
        done ? "opacity-70" : "hover:bg-bg",
      ].join(" ")}
    >
      <div className="w-12 shrink-0 text-teal-dark font-bold text-[14px] leading-tight">
        {turn.time}
      </div>
      <div className="w-px self-stretch bg-line shrink-0" />
      <button
        onClick={() => onOpenFicha(turn.patientId)}
        className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 focus-ring"
        style={{ background: av.bg, color: av.fg }}
      >
        {patientInitial(turn.name)}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onOpenFicha(turn.patientId)}
            className="text-[13.5px] font-semibold text-ink hover:text-teal-dark transition text-left focus-ring"
          >
            {turn.name}
          </button>
          <span className="text-[11px] text-ink3">· {turn.age}</span>
          <TypeChip type={turn.type} />
        </div>
        <div className="mt-0.5 text-[11.5px] text-ink2 truncate">{turn.reason}</div>
      </div>
      <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0">
        <StateBadge state={turn.state} />
        {turn.pago === "pendiente" && (
          <span className="text-[10.5px] font-semibold text-[#9C7423] inline-flex items-center gap-1">
            <CreditCard size={10} /> Por cobrar
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0 w-[150px] justify-end">
        {turn.pago === "pendiente" && !done && (
          <button
            onClick={() => onCobrar(turn.id)}
            className="inline-flex items-center gap-1 px-2.5 py-2 rounded-[9px] text-[11.5px] font-semibold transition focus-ring"
            style={{ background: "rgba(245, 212, 160, 0.40)", color: "#9C7423" }}
            title="Registrar pago"
          >
            <CreditCard size={13} />
            Cobrar
          </button>
        )}
        {act ? (
          <button
            onClick={() => onAdvance(turn.id)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[9px] text-white text-[11.5px] font-semibold hover:opacity-90 transition focus-ring whitespace-nowrap"
            style={{ background: "#5CB8A4" }}
          >
            <act.Icon size={13} />
            {act.label}
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-2 text-[11.5px] font-semibold text-[#3F8358]">
            <Check size={14} /> Listo
          </span>
        )}
      </div>
    </div>
  );
}

function TaskRow({
  task,
  onResolve,
  onOpenFicha,
}: {
  task: ClinicalTask;
  onResolve: (id: string) => void;
  onOpenFicha: (patientId: number) => void;
}) {
  const colors = TASK_KIND_COLORS[task.kind] ?? { bg: "#F2F1EC", text: "#6B6B6B" };
  const IconComp = TASK_ICON_MAP[task.icon] ?? FileText;

  return (
    <div className="group flex items-start gap-3 px-4 py-3 hover:bg-bg transition">
      <div
        className="w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0"
        style={{ background: colors.bg, color: colors.text }}
      >
        <IconComp size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[12.5px] font-semibold text-ink leading-tight">
            {task.title}
          </span>
          {task.urgent && (
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: "#F4A89A" }}
              title="Urgente"
            />
          )}
        </div>
        <button
          onClick={() => onOpenFicha(task.patientId)}
          className="text-[11px] font-medium hover:underline focus-ring"
          style={{ color: "#5CB8A4" }}
        >
          {task.patient}
        </button>
        <div className="text-[11.5px] text-ink2 mt-0.5 leading-snug">{task.detail}</div>
      </div>
      <button
        onClick={() => onResolve(task.id)}
        className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] bg-surface border border-line text-[11.5px] font-semibold text-ink2 hover:bg-teal/10 hover:text-teal-dark hover:border-teal/40 transition focus-ring"
      >
        {task.action}
      </button>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-[12px] text-white text-[12.5px] font-semibold shadow-[var(--shadow-pop)] flex items-center gap-2" style={{ background: "#2C2C2C" }}>
      <Check size={14} style={{ color: "#7DD3C0" }} />
      {message}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const sedeName = useSedeStore((s) => s.sedeName);

  const [flow, setFlow] = useState<Turn[]>(() => TODAY_AGENDA.map((t) => ({ ...t })));
  const [tasks, setTasks] = useState<ClinicalTask[]>(() => CLINICAL_TASKS.map((t) => ({ ...t })));
  const [filter, setFilter] = useState<FlowState | null>(null);
  const [resolved, setResolved] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const firstName = user?.first_name ?? "Estefi";

  // Flash toast
  const flash = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  // Sede filter: "Todas" shows everything; a named sede shows that sede + online turns
  const inSede = useCallback(
    (t: Turn) => sedeName === "Todas" || t.sede === sedeName || t.sede === "Online",
    [sedeName]
  );

  const sedeFlow = useMemo(() => flow.filter(inSede), [flow, inSede]);

  const counts = useMemo(() => {
    const c: Record<FlowState, number> = { confirmado: 0, espera: 0, consulta: 0, atendido: 0 };
    sedeFlow.forEach((t) => { c[t.state]++; });
    return c;
  }, [sedeFlow]);

  // Focus: patient in consulta → espera → first confirmado → null
  const focus = useMemo(
    () =>
      sedeFlow.find((t) => t.state === "consulta") ??
      sedeFlow.find((t) => t.state === "espera") ??
      sedeFlow.find((t) => t.state === "confirmado") ??
      null,
    [sedeFlow]
  );

  const shown = useMemo(
    () => (filter ? sedeFlow.filter((t) => t.state === filter) : sedeFlow),
    [filter, sedeFlow]
  );

  // Money
  const ingresosHoy = useMemo(
    () => sedeFlow.filter((t) => t.state === "atendido" && t.pago === "pagado").reduce((s, t) => s + (PRICE_BY_TYPE[t.type] ?? 40000), 0),
    [sedeFlow]
  );
  const porCobrar = useMemo(
    () => sedeFlow.filter((t) => t.pago === "pendiente").reduce((s, t) => s + (PRICE_BY_TYPE[t.type] ?? 40000), 0),
    [sedeFlow]
  );

  // Actions
  const advance = useCallback(
    (id: string) => {
      setFlow((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          const idx = FLOW_ORDER.indexOf(t.state);
          const next = FLOW_ORDER[Math.min(idx + 1, FLOW_ORDER.length - 1)];
          const labels: Partial<Record<FlowState, string>> = {
            espera:   "en sala de espera",
            consulta: "en consulta",
            atendido: "atendido",
          };
          flash(`${t.name} → ${labels[next] ?? next}`);
          return { ...t, state: next };
        })
      );
    },
    [flash]
  );

  const cobrar = useCallback(
    (id: string) => {
      setFlow((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          flash(`Pago de ${t.name} registrado · ${dashCLP(PRICE_BY_TYPE[t.type] ?? 40000)}`);
          return { ...t, pago: "pagado" };
        })
      );
    },
    [flash]
  );

  const resolveTask = useCallback(
    (id: string) => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      setResolved((r) => r + 1);
      flash("Tarea resuelta");
    },
    [flash]
  );

  const openFicha = useCallback(
    (patientId: number) => navigate(`/dashboard/pacientes/${patientId}`),
    [navigate]
  );

  const goCalendar = useCallback(
    () => navigate("/dashboard/calendario"),
    [navigate]
  );

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-[12.5px] text-ink3 font-medium">
            <Sun size={14} style={{ color: "#F4A89A" }} />
            {todayFormatted()} · {sedeName === "Todas" ? "Todas las sedes" : sedeName}
          </div>
          <h1 className="mt-1.5 text-[28px] font-bold text-ink tracking-tight">
            {greetingText()}, {firstName}
          </h1>
          <p className="mt-1 text-[13.5px] text-ink2">
            {counts.atendido} de {sedeFlow.length} atendidos ·{" "}
            <span className="font-semibold text-ink">{counts.consulta + counts.espera}</span> en curso ·{" "}
            <span className="font-semibold text-ink">{tasks.length}</span> tareas clínicas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goCalendar}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-surface border border-line text-[13px] font-semibold text-ink2 hover:bg-bg transition focus-ring"
          >
            <Calendar size={15} />
            Ver agenda
          </button>
          <button
            onClick={goCalendar}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-white text-[13px] font-semibold hover:opacity-90 transition shadow-[var(--shadow-soft)] focus-ring"
            style={{ background: "#5CB8A4" }}
          >
            <Plus size={15} />
            Nuevo turno
          </button>
        </div>
      </div>

      {/* Flow pipeline */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-[13px] font-bold text-ink">Flujo del día</h2>
          {filter && (
            <button
              onClick={() => setFilter(null)}
              className="text-[11.5px] font-semibold hover:underline focus-ring"
              style={{ color: "#5CB8A4" }}
            >
              Ver todos
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {FLOW_ORDER.map((s) => (
            <StageCard
              key={s}
              stateKey={s}
              count={counts[s]}
              active={filter === s}
              onClick={() => setFilter(filter === s ? null : s)}
            />
          ))}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Left: focus card + agenda */}
        <div className="xl:col-span-2 space-y-5">
          {/* Focus card */}
          <FocusCard turn={focus} onAdvance={advance} onOpenFicha={openFicha} />

          {/* Agenda de hoy */}
          <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div>
                <h3 className="text-[15px] font-bold text-ink">Agenda de hoy</h3>
                <p className="text-[11.5px] text-ink3 mt-0.5">
                  {filter
                    ? `Filtrando: ${STATE_META[filter].short}`
                    : `${sedeFlow.length} ${sedeFlow.length === 1 ? "turno" : "turnos"} · ${sedeName === "Todas" ? "Pucón y Villarrica" : sedeName}`}
                </p>
              </div>
              <button
                onClick={goCalendar}
                className="text-[12px] font-semibold hover:underline inline-flex items-center gap-1 focus-ring"
                style={{ color: "#5CB8A4" }}
              >
                Ver semana <ChevronRight size={13} />
              </button>
            </div>
            <div className="px-2 pb-3">
              {shown.length > 0 ? (
                shown.map((t, i) => (
                  <div key={t.id}>
                    <AgendaRow
                      turn={t}
                      onAdvance={advance}
                      onCobrar={cobrar}
                      onOpenFicha={openFicha}
                    />
                    {i < shown.length - 1 && (
                      <div className="ml-[68px] h-px bg-line/70" />
                    )}
                  </div>
                ))
              ) : (
                <div className="px-4 py-10 text-center text-[12.5px] text-ink3">
                  Sin turnos en este estado.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: clinical inbox + caja */}
        <div className="space-y-5">
          {/* Bandeja clínica */}
          <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div>
                <h3 className="text-[15px] font-bold text-ink">Bandeja clínica</h3>
                <p className="text-[11.5px] text-ink3 mt-0.5">
                  {tasks.length > 0 ? `${tasks.length} pendientes` : "Todo al día"}
                  {resolved > 0 && ` · ${resolved} resueltas hoy`}
                </p>
              </div>
              <div
                className="w-8 h-8 rounded-[9px] flex items-center justify-center"
                style={{ background: "rgba(125, 211, 192, 0.15)", color: "#5CB8A4" }}
              >
                <Inbox size={16} />
              </div>
            </div>
            <div className="pb-2">
              {tasks.length > 0 ? (
                tasks.map((t, i) => (
                  <div key={t.id}>
                    <TaskRow task={t} onResolve={resolveTask} onOpenFicha={openFicha} />
                    {i < tasks.length - 1 && (
                      <div className="mx-4 h-px bg-line/60" />
                    )}
                  </div>
                ))
              ) : (
                <div className="px-5 py-10 text-center">
                  <div
                    className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-3"
                    style={{ background: "rgba(168, 213, 181, 0.25)", color: "#3F8358" }}
                  >
                    <Check size={20} />
                  </div>
                  <div className="text-[13px] font-bold text-ink">Bandeja vacía</div>
                  <div className="text-[11.5px] text-ink3 mt-1">
                    Resolviste todas las tareas.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Caja de hoy */}
          <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] p-5">
            <h3 className="text-[14px] font-bold text-ink">Caja de hoy</h3>
            <div className="mt-4 flex items-stretch gap-3">
              <div className="flex-1 rounded-[12px] p-3.5" style={{ background: "rgba(168, 213, 181, 0.15)" }}>
                <div className="text-[11px] font-semibold text-[#3F8358]">Cobrado</div>
                <div className="mt-1 text-[20px] font-bold text-ink leading-none tracking-tight">
                  {dashCLP(ingresosHoy)}
                </div>
              </div>
              <div className="flex-1 rounded-[12px] p-3.5" style={{ background: "rgba(245, 212, 160, 0.25)" }}>
                <div className="text-[11px] font-semibold text-[#9C7423]">Por cobrar</div>
                <div className="mt-1 text-[20px] font-bold text-ink leading-none tracking-tight">
                  {dashCLP(porCobrar)}
                </div>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-ink3">
              Registrá los pagos pendientes desde la agenda con el botón "Cobrar".
            </p>
          </div>
        </div>
      </div>

      {/* Toast */}
      <Toast message={toast} />
    </div>
  );
}
