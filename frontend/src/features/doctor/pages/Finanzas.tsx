import { useState, useMemo } from "react";
import {
  Calculator,
  Receipt,
  TrendingUp,
  Info,
  ArrowRight,
  Plus,
  Trash2,
  DollarSign,
  BarChart2,
  Home,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

// ─── Chilean 2025 tax constants ───────────────────────────────────────────────

const RETENTION_RATE = 0.1375;
const PPM_RATE = 0.10;
const UTM_2025 = 67_000;

const TAX_BRACKETS: [number | null, number][] = [
  [13.5,  0.00],
  [30.0,  0.04],
  [50.0,  0.08],
  [70.0,  0.135],
  [90.0,  0.23],
  [120.0, 0.304],
  [310.0, 0.35],
  [null,  0.40],
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonthlyExpense {
  id: number;
  practice: number;
  name: string;
  category: string;
  category_display: string;
  amount: number;
  is_active: boolean;
  notes: string;
}

interface CashFlowMonth {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

interface ExpenseBreakdownItem {
  name: string;
  category: string;
  amount: number;
}

interface CashFlowData {
  months: CashFlowMonth[];
  current_month: {
    income: number;
    total_expenses: number;
    net: number;
    expenses_breakdown: ExpenseBreakdownItem[];
  };
}

interface CreateExpensePayload {
  name: string;
  category: string;
  amount: number;
  notes?: string;
}

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: "RENT",      label: "Arriendo" },
  { value: "SUPPLIES",  label: "Insumos médicos" },
  { value: "SALARY",    label: "Sueldos/Honorarios" },
  { value: "PLATFORM",  label: "Plataformas digitales" },
  { value: "INSURANCE", label: "Seguros" },
  { value: "UTILITIES", label: "Servicios básicos" },
  { value: "TAXES",     label: "Impuestos/Patentes" },
  { value: "OTHER",     label: "Otros" },
];

const CATEGORY_COLORS: Record<string, string> = {
  RENT:      "bg-blue-100 text-blue-700",
  SUPPLIES:  "bg-emerald-100 text-emerald-700",
  SALARY:    "bg-purple-100 text-purple-700",
  PLATFORM:  "bg-amber-100 text-amber-700",
  INSURANCE: "bg-sky-100 text-sky-700",
  UTILITIES: "bg-orange-100 text-orange-700",
  TAXES:     "bg-red-100 text-red-700",
  OTHER:     "bg-gray-100 text-gray-600",
};

// ─── Pure calculation helpers ─────────────────────────────────────────────────

function effectiveAnnualTax(grossMonthly: number): number {
  const monthlyUtm = grossMonthly / UTM_2025;
  let prevLimit = 0;
  let monthlyTax = 0;

  for (const [upper, rate] of TAX_BRACKETS) {
    if (rate === 0) {
      prevLimit = upper ?? monthlyUtm;
      continue;
    }
    const upperUtm = upper ?? Infinity;
    const taxableUtm = Math.max(0, Math.min(monthlyUtm, upperUtm) - prevLimit);
    monthlyTax += taxableUtm * UTM_2025 * rate;
    if (monthlyUtm <= upperUtm) break;
    prevLimit = upperUtm;
  }

  return Math.round(monthlyTax * 12);
}

interface TaxResult {
  boleta: {
    retentionRate: number;
    retention: number;
    netAmount: number;
    monthlyPpm: number;
    annualNet: number;
  };
  factura: {
    netAmount: number;
    monthlyPpm: number;
    annualTaxEstimate: number;
    annualNet: number;
  };
  comparison: {
    difference: number;
    recommendation: "boleta" | "factura";
  };
}

function calculate(gross: number): TaxResult {
  const boletaRetention = Math.round(gross * RETENTION_RATE);
  const boletaNet = gross - boletaRetention;
  const boletaPpm = Math.round(gross * PPM_RATE);
  const boletaAnnualNet = boletaNet * 12;

  const facturaAnnualTax = effectiveAnnualTax(gross);
  const facturaAnnualNet = Math.round(gross * 12 - facturaAnnualTax);
  const facturaPpm = Math.round(gross * PPM_RATE);

  const difference = Math.abs(facturaAnnualNet - boletaAnnualNet);
  const recommendation: "boleta" | "factura" =
    facturaAnnualNet >= boletaAnnualNet ? "factura" : "boleta";

  return {
    boleta: {
      retentionRate: RETENTION_RATE,
      retention: boletaRetention,
      netAmount: boletaNet,
      monthlyPpm: boletaPpm,
      annualNet: boletaAnnualNet,
    },
    factura: {
      netAmount: gross,
      monthlyPpm: facturaPpm,
      annualTaxEstimate: facturaAnnualTax,
      annualNet: facturaAnnualNet,
    },
    comparison: { difference, recommendation },
  };
}

// ─── Formatters ───────────────────────────────────────────────────────────────

const clpFmt = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

function fmtCLP(n: number): string {
  return clpFmt.format(n);
}

function parseCLPInput(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  return digits === "" ? 0 : parseInt(digits, 10);
}

function formatInputDisplay(n: number): string {
  if (n === 0) return "";
  return n.toLocaleString("es-CL");
}

function fmtMonth(key: string): string {
  const [year, month] = key.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleString("es-CL", { month: "short", year: "2-digit" });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="w-9 h-9 rounded-[10px] bg-teal/15 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={18} className="text-teal-dark" strokeWidth={1.75} />
      </div>
      <div>
        <h2 className="text-[15px] font-bold text-ink leading-tight">{title}</h2>
        {subtitle && <p className="text-[12.5px] text-ink3 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function DataRow({
  label,
  value,
  highlight,
  muted,
  bold,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  muted?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-line last:border-0">
      <span className={cn("text-[13px]", muted ? "text-ink3" : "text-ink2")}>
        {label}
      </span>
      <span
        className={cn(
          "text-[13px] font-medium",
          highlight
            ? "text-teal-dark font-bold"
            : bold
            ? "text-ink font-semibold"
            : "text-ink"
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Recharts custom tooltip ──────────────────────────────────────────────────

function CashFlowTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; fill: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-line rounded-[10px] px-3.5 py-2.5 shadow-sm text-[12.5px]">
      <p className="font-semibold text-ink mb-1.5">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.fill }} className="font-medium">
          {p.name}: {fmtCLP(p.value)}
        </p>
      ))}
    </div>
  );
}

// ─── Gastos Fijos section ─────────────────────────────────────────────────────

function GastosFijosSection() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", category: "RENT", amount: "" });

  const { data: expenses = [], isLoading } = useQuery<MonthlyExpense[]>({
    queryKey: ["monthly-expenses"],
    queryFn: async () => {
      const res = await api.get("/billing/monthly-expenses/");
      return res.data.results ?? res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: CreateExpensePayload) => {
      const res = await api.post("/billing/monthly-expenses/", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly-expenses"] });
      queryClient.invalidateQueries({ queryKey: ["cash-flow"] });
      setForm({ name: "", category: "RENT", amount: "" });
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/billing/monthly-expenses/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly-expenses"] });
      queryClient.invalidateQueries({ queryKey: ["cash-flow"] });
    },
  });

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amountNum = parseCLPInput(form.amount);
    if (!form.name.trim() || amountNum <= 0) return;
    createMutation.mutate({
      name: form.name.trim(),
      category: form.category,
      amount: amountNum,
    });
  }

  return (
    <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] p-6">
      <div className="flex items-start justify-between mb-5">
        <SectionHeader
          icon={DollarSign}
          title="Gastos Fijos Mensuales"
          subtitle="Costos recurrentes de tu práctica"
        />
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-teal/10 text-teal-dark text-[12.5px] font-semibold hover:bg-teal/20 transition shrink-0 mt-0.5"
        >
          <Plus size={13} strokeWidth={2.5} />
          Agregar
        </button>
      </div>

      {/* Inline add form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-bg border border-line rounded-[12px] p-4 mb-4 space-y-3"
        >
          <p className="text-[12px] font-bold text-ink uppercase tracking-wide">
            Nuevo gasto fijo
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Nombre"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="border border-line rounded-[8px] px-3 py-2 text-[13px] text-ink bg-surface placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal/60 transition"
              required
            />
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="border border-line rounded-[8px] px-3 py-2 text-[13px] text-ink bg-surface focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal/60 transition"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-ink3 font-medium">
                $
              </span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="250.000"
                value={form.amount}
                onChange={(e) => {
                  const n = parseCLPInput(e.target.value);
                  setForm((f) => ({ ...f, amount: n > 0 ? formatInputDisplay(n) : "" }));
                }}
                className="w-full border border-line rounded-[8px] pl-7 pr-3 py-2 text-[13px] text-ink bg-surface placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal/60 transition"
                required
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-1.5 rounded-[8px] bg-teal text-white text-[12.5px] font-semibold hover:bg-teal-dark transition disabled:opacity-50"
            >
              {createMutation.isPending ? "Guardando…" : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-1.5 rounded-[8px] border border-line text-ink2 text-[12.5px] font-medium hover:bg-line/30 transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Expense list */}
      {isLoading ? (
        <div className="py-8 text-center text-[13px] text-ink3">Cargando…</div>
      ) : expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-12 h-12 rounded-full bg-bg border border-line flex items-center justify-center mb-3">
            <DollarSign size={22} className="text-ink3" strokeWidth={1.5} />
          </div>
          <p className="text-[13.5px] font-medium text-ink2">Sin gastos registrados</p>
          <p className="text-[12px] text-ink3 mt-1">
            Agregá tus gastos fijos mensuales para calcular el flujo de caja.
          </p>
        </div>
      ) : (
        <div className="space-y-0">
          {expenses.map((expense) => (
            <div
              key={expense.id}
              className="flex items-center justify-between py-2.5 border-b border-line last:border-0"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={cn(
                    "text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0",
                    CATEGORY_COLORS[expense.category] ?? "bg-gray-100 text-gray-600"
                  )}
                >
                  {expense.category_display}
                </span>
                <span className="text-[13px] text-ink truncate">{expense.name}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-3">
                <span className="text-[13px] font-semibold text-ink">
                  {fmtCLP(expense.amount)}
                </span>
                <button
                  onClick={() => deleteMutation.mutate(expense.id)}
                  disabled={deleteMutation.isPending}
                  className="text-ink3 hover:text-red-500 transition disabled:opacity-40"
                  aria-label="Eliminar gasto"
                >
                  <Trash2 size={14} strokeWidth={1.75} />
                </button>
              </div>
            </div>
          ))}

          {/* Total row */}
          <div className="flex items-center justify-between pt-3 mt-1">
            <span className="text-[12.5px] font-bold text-ink uppercase tracking-wide">
              Total mensual
            </span>
            <span className="text-[15px] font-bold text-ink">{fmtCLP(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Flujo de Caja section ────────────────────────────────────────────────────

function FlujoDeCajaSection() {
  const { data, isLoading } = useQuery<CashFlowData>({
    queryKey: ["cash-flow"],
    queryFn: async () => {
      const res = await api.get("/billing/cash-flow/");
      return res.data;
    },
  });

  const chartData = useMemo(
    () =>
      (data?.months ?? []).map((m) => ({
        month: fmtMonth(m.month),
        Ingresos: m.income,
        Gastos: m.expenses,
      })),
    [data]
  );

  const current = data?.current_month;
  const net = current?.net ?? 0;
  const isPositive = net >= 0;

  return (
    <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] p-6">
      <SectionHeader
        icon={BarChart2}
        title="Flujo de Caja Mensual"
        subtitle="Ingresos por consulta vs. gastos operativos — últimos 6 meses"
      />

      {isLoading ? (
        <div className="py-10 text-center text-[13px] text-ink3">Cargando…</div>
      ) : (
        <div className="space-y-5">

          {/* ── Summary cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Income */}
            <div className="bg-bg rounded-[12px] border border-line p-4">
              <p className="text-[11.5px] text-ink3 mb-1">Ingresos del mes</p>
              <p className="text-[20px] font-bold text-ink leading-tight">
                {fmtCLP(current?.income ?? 0)}
              </p>
              <p className="text-[11px] text-ink3 mt-0.5">pagos completados</p>
            </div>

            {/* Expenses */}
            <div className="bg-bg rounded-[12px] border border-line p-4">
              <p className="text-[11.5px] text-ink3 mb-1">Gastos del mes</p>
              <p className="text-[20px] font-bold text-ink leading-tight">
                {fmtCLP(current?.total_expenses ?? 0)}
              </p>
              <p className="text-[11px] text-ink3 mt-0.5">gastos fijos activos</p>
            </div>

            {/* Net */}
            <div
              className={cn(
                "rounded-[12px] border p-4",
                isPositive
                  ? "bg-emerald-50 border-emerald-200/70"
                  : "bg-red-50 border-red-200/70"
              )}
            >
              <p className={cn("text-[11.5px] mb-1", isPositive ? "text-emerald-600" : "text-red-500")}>
                Resultado neto
              </p>
              <p
                className={cn(
                  "text-[20px] font-bold leading-tight",
                  isPositive ? "text-emerald-700" : "text-red-600"
                )}
              >
                {isPositive ? "+" : ""}
                {fmtCLP(net)}
              </p>
              <p className={cn("text-[11px] mt-0.5", isPositive ? "text-emerald-500" : "text-red-400")}>
                {isPositive ? "superávit" : "déficit"}
              </p>
            </div>
          </div>

          {/* ── Bar chart ── */}
          <div className="bg-bg rounded-[12px] border border-line p-4">
            <p className="text-[11px] font-bold text-ink uppercase tracking-wide mb-4">
              Últimos 6 meses
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barCategoryGap="30%" barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line, #e5e7eb)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "var(--color-ink3, #9ca3af)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--color-ink3, #9ca3af)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    v === 0 ? "0" : `${(v / 1_000_000).toFixed(1)}M`
                  }
                  width={38}
                />
                <Tooltip content={<CashFlowTooltip />} cursor={{ fill: "var(--color-line, #e5e7eb)", opacity: 0.5 }} />
                <Bar dataKey="Ingresos" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Gastos" fill="#f87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 justify-center">
              <span className="flex items-center gap-1.5 text-[11.5px] text-ink3">
                <span className="w-3 h-3 rounded-sm bg-teal inline-block" />
                Ingresos
              </span>
              <span className="flex items-center gap-1.5 text-[11.5px] text-ink3">
                <span className="w-3 h-3 rounded-sm bg-red-400 inline-block" />
                Gastos
              </span>
            </div>
          </div>

          {/* ── Expenses breakdown ── */}
          {(current?.expenses_breakdown?.length ?? 0) > 0 && (
            <div className="bg-bg rounded-[12px] border border-line p-4">
              <p className="text-[11px] font-bold text-ink uppercase tracking-wide mb-3">
                Detalle de gastos — este mes
              </p>
              {current!.expenses_breakdown.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2 border-b border-line last:border-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        "text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0",
                        CATEGORY_COLORS[item.category] ?? "bg-gray-100 text-gray-600"
                      )}
                    >
                      {CATEGORIES.find((c) => c.value === item.category)?.label ?? item.category}
                    </span>
                    <span className="text-[13px] text-ink2 truncate">{item.name}</span>
                  </div>
                  <span className="text-[13px] font-medium text-ink shrink-0 ml-3">
                    {fmtCLP(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Simulador de Arriendo section ────────────────────────────────────────────

function SimuladorArriendoSection() {
  const [rent, setRent] = useState("");
  const [commonExpenses, setCommonExpenses] = useState("");
  const [internet, setInternet] = useState("");
  const [electricity, setElectricity] = useState("");
  const [professionalUse, setProfessionalUse] = useState(50);

  const results = useMemo(() => {
    const rentVal = parseCLPInput(rent);
    const commonVal = parseCLPInput(commonExpenses);
    const internetVal = parseCLPInput(internet);
    const electricityVal = parseCLPInput(electricity);

    const totalMonthly = rentVal + commonVal + internetVal + electricityVal;
    const deductibleMonthly = Math.round(totalMonthly * (professionalUse / 100));
    const deductibleAnnual = deductibleMonthly * 12;
    const taxSavings = Math.round(deductibleAnnual * RETENTION_RATE);

    return { totalMonthly, deductibleMonthly, deductibleAnnual, taxSavings };
  }, [rent, commonExpenses, internet, electricity, professionalUse]);

  const hasInput = results.totalMonthly > 0;

  function makeCLPHandler(setter: React.Dispatch<React.SetStateAction<string>>) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const n = parseCLPInput(e.target.value);
      setter(n > 0 ? formatInputDisplay(n) : "");
    };
  }

  return (
    <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] p-6">
      <SectionHeader
        icon={Home}
        title="Simulador de Arriendo como Gasto"
        subtitle="Estimá el gasto deducible y el ahorro tributario por uso profesional del espacio"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── Inputs ── */}
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-ink2 uppercase tracking-wide mb-1.5">
              Arriendo mensual (CLP)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-ink3 font-medium">$</span>
              <input
                type="text"
                inputMode="numeric"
                value={rent}
                onChange={makeCLPHandler(setRent)}
                placeholder="500.000"
                className="w-full border border-line rounded-[10px] pl-7 pr-4 py-2.5 text-[14px] text-ink bg-bg placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal/60 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-ink2 uppercase tracking-wide mb-1.5">
              Gastos comunes (CLP)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-ink3 font-medium">$</span>
              <input
                type="text"
                inputMode="numeric"
                value={commonExpenses}
                onChange={makeCLPHandler(setCommonExpenses)}
                placeholder="40.000"
                className="w-full border border-line rounded-[10px] pl-7 pr-4 py-2.5 text-[14px] text-ink bg-bg placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal/60 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-ink2 uppercase tracking-wide mb-1.5">
              Internet (CLP)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-ink3 font-medium">$</span>
              <input
                type="text"
                inputMode="numeric"
                value={internet}
                onChange={makeCLPHandler(setInternet)}
                placeholder="25.000"
                className="w-full border border-line rounded-[10px] pl-7 pr-4 py-2.5 text-[14px] text-ink bg-bg placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal/60 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-ink2 uppercase tracking-wide mb-1.5">
              Electricidad (CLP)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-ink3 font-medium">$</span>
              <input
                type="text"
                inputMode="numeric"
                value={electricity}
                onChange={makeCLPHandler(setElectricity)}
                placeholder="20.000"
                className="w-full border border-line rounded-[10px] pl-7 pr-4 py-2.5 text-[14px] text-ink bg-bg placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal/60 transition"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[12px] font-semibold text-ink2 uppercase tracking-wide">
                % uso profesional
              </label>
              <span className="text-[13px] font-bold text-teal-dark">{professionalUse}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={professionalUse}
              onChange={(e) => setProfessionalUse(Number(e.target.value))}
              className="w-full accent-teal h-2 cursor-pointer"
            />
            <div className="flex justify-between mt-1">
              <span className="text-[11px] text-ink3">0%</span>
              <span className="text-[11px] text-ink3">50%</span>
              <span className="text-[11px] text-ink3">100%</span>
            </div>
          </div>
        </div>

        {/* ── Results card ── */}
        <div className="flex flex-col">
          {hasInput ? (
            <div className="bg-bg rounded-[12px] border border-line p-5 h-full space-y-0">
              <p className="text-[11px] font-bold text-ink uppercase tracking-wide mb-3">
                Resultados del simulador
              </p>
              <DataRow
                label="Total gastos mensuales"
                value={fmtCLP(results.totalMonthly)}
                bold
              />
              <DataRow
                label={`Gasto deducible mensual (${professionalUse}%)`}
                value={fmtCLP(results.deductibleMonthly)}
              />
              <DataRow
                label="Gasto deducible anual"
                value={fmtCLP(results.deductibleAnnual)}
                bold
              />
              <DataRow
                label={`Ahorro tributario estimado (ret. ${(RETENTION_RATE * 100).toFixed(2)}%)`}
                value={fmtCLP(results.taxSavings)}
                highlight
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center bg-bg rounded-[12px] border border-line h-full">
              <div className="w-12 h-12 rounded-full bg-surface border border-line flex items-center justify-center mb-3">
                <Home size={22} className="text-ink3" strokeWidth={1.5} />
              </div>
              <p className="text-[13.5px] font-medium text-ink2">Ingresá los gastos para simular</p>
              <p className="text-[12px] text-ink3 mt-1">
                Completá al menos un campo para ver los resultados
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200/70 rounded-[10px] px-3.5 py-2.5 mt-5">
        <Info size={14} className="text-amber-500 shrink-0 mt-0.5" />
        <p className="text-[12px] text-amber-700 leading-relaxed">
          Estimación basada en el uso profesional declarado. Consulte con su contador para la deducción exacta.
        </p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type DocType = "boleta" | "factura_exenta";

export default function Finanzas() {
  const [inputValue, setInputValue] = useState("");
  const [docType, setDocType] = useState<DocType>("boleta");

  const gross = parseCLPInput(inputValue);
  const result = useMemo(() => (gross > 0 ? calculate(gross) : null), [gross]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const n = parseCLPInput(raw);
    setInputValue(formatInputDisplay(n));
  }

  const isBoleta = docType === "boleta";

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* ── Page header ── */}
      <div>
        <h1 className="text-[20px] font-bold text-ink">Finanzas</h1>
        <p className="text-[13px] text-ink3 mt-0.5">
          Herramientas tributarias y financieras para tu práctica
        </p>
      </div>

      {/* ── Calculator card ── */}
      <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] p-6">
        <SectionHeader
          icon={Calculator}
          title="Calculadora de Honorarios"
          subtitle="Estimación tributaria 2025 — Boleta vs. Factura Exenta"
        />

        {/* Input row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          {/* Amount */}
          <div>
            <label className="block text-[12px] font-semibold text-ink2 uppercase tracking-wide mb-1.5">
              Monto bruto (CLP)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-ink3 font-medium">
                $
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={inputValue}
                onChange={handleInputChange}
                placeholder="500.000"
                className="w-full border border-line rounded-[10px] pl-7 pr-4 py-2.5 text-[14px] text-ink bg-bg placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal/60 transition"
              />
            </div>
          </div>

          {/* Doc type toggle */}
          <div>
            <label className="block text-[12px] font-semibold text-ink2 uppercase tracking-wide mb-1.5">
              Tipo de documento
            </label>
            <div className="flex rounded-[10px] border border-line overflow-hidden bg-bg">
              <button
                onClick={() => setDocType("boleta")}
                className={cn(
                  "flex-1 py-2.5 text-[13px] font-medium transition-colors",
                  isBoleta
                    ? "bg-teal/15 text-teal-dark font-semibold"
                    : "text-ink2 hover:bg-line/40"
                )}
              >
                Boleta de Honorarios
              </button>
              <button
                onClick={() => setDocType("factura_exenta")}
                className={cn(
                  "flex-1 py-2.5 text-[13px] font-medium transition-colors",
                  !isBoleta
                    ? "bg-teal/15 text-teal-dark font-semibold"
                    : "text-ink2 hover:bg-line/40"
                )}
              >
                Factura Exenta
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-4 mt-2">

            {/* Active scenario detail */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Boleta detail */}
              <div className="bg-bg rounded-[12px] border border-line p-4">
                <p className="text-[11px] font-bold text-ink uppercase tracking-wide mb-3">
                  Boleta de Honorarios
                </p>
                <DataRow label="Monto bruto" value={fmtCLP(gross)} />
                <DataRow
                  label={`Retención (${(RETENTION_RATE * 100).toFixed(2)}%)`}
                  value={`− ${fmtCLP(result.boleta.retention)}`}
                  muted
                />
                <DataRow
                  label="Líquido a recibir"
                  value={fmtCLP(result.boleta.netAmount)}
                  highlight
                />
                <DataRow
                  label="PPM mensual estimado"
                  value={fmtCLP(result.boleta.monthlyPpm)}
                  muted
                />
              </div>

              {/* Factura detail */}
              <div className="bg-bg rounded-[12px] border border-line p-4">
                <p className="text-[11px] font-bold text-ink uppercase tracking-wide mb-3">
                  Factura Exenta
                </p>
                <DataRow label="Monto bruto" value={fmtCLP(gross)} />
                <DataRow label="Retención en origen" value="Sin retención" muted />
                <DataRow
                  label="Líquido a recibir"
                  value={fmtCLP(result.factura.netAmount)}
                  highlight
                />
                <DataRow
                  label="PPM mensual estimado"
                  value={fmtCLP(result.factura.monthlyPpm)}
                  muted
                />
                <DataRow
                  label="Impuesto anual estimado"
                  value={fmtCLP(result.factura.annualTaxEstimate)}
                  muted
                />
              </div>
            </div>

            {/* Annual comparison */}
            <div className="bg-bg rounded-[12px] border border-line p-4">
              <p className="text-[11px] font-bold text-ink uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <TrendingUp size={14} className="text-teal-dark" />
                Proyección anual (12 meses)
              </p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Boleta annual */}
                <div
                  className={cn(
                    "rounded-[10px] border p-3 transition",
                    result.comparison.recommendation === "boleta"
                      ? "border-teal/50 bg-teal/8"
                      : "border-line bg-surface"
                  )}
                >
                  <p className="text-[11.5px] text-ink3 mb-1">Si emitís boleta</p>
                  <p className="text-[18px] font-bold text-ink leading-tight">
                    {fmtCLP(result.boleta.annualNet)}
                  </p>
                  <p className="text-[11px] text-ink3 mt-0.5">neto anual</p>
                  {result.comparison.recommendation === "boleta" && (
                    <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-teal/15 text-teal-dark">
                      Recomendado
                    </span>
                  )}
                </div>

                {/* Factura annual */}
                <div
                  className={cn(
                    "rounded-[10px] border p-3 transition",
                    result.comparison.recommendation === "factura"
                      ? "border-teal/50 bg-teal/8"
                      : "border-line bg-surface"
                  )}
                >
                  <p className="text-[11.5px] text-ink3 mb-1">Si emitís factura</p>
                  <p className="text-[18px] font-bold text-ink leading-tight">
                    {fmtCLP(result.factura.annualNet)}
                  </p>
                  <p className="text-[11px] text-ink3 mt-0.5">neto anual</p>
                  {result.comparison.recommendation === "factura" && (
                    <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-teal/15 text-teal-dark">
                      Recomendado
                    </span>
                  )}
                </div>
              </div>

              {/* Difference callout */}
              <div className="flex items-center gap-2 bg-surface border border-line rounded-[9px] px-3.5 py-2.5">
                <ArrowRight size={14} className="text-teal-dark shrink-0" />
                <p className="text-[12.5px] text-ink">
                  La{" "}
                  <span className="font-semibold text-teal-dark">
                    {result.comparison.recommendation === "factura"
                      ? "factura exenta"
                      : "boleta de honorarios"}
                  </span>{" "}
                  te dejaría{" "}
                  <span className="font-semibold text-ink">
                    {fmtCLP(result.comparison.difference)}
                  </span>{" "}
                  más al año.
                </p>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200/70 rounded-[10px] px-3.5 py-2.5">
              <Info size={14} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[12px] text-amber-700 leading-relaxed">
                Estimación orientativa. Valores basados en UTM 2025 ≈ $67.000 y tramos
                impuesto global complementario vigentes. No reemplaza asesoría de un contador.
              </p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!result && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-12 h-12 rounded-full bg-bg border border-line flex items-center justify-center mb-3">
              <Receipt size={22} className="text-ink3" strokeWidth={1.5} />
            </div>
            <p className="text-[13.5px] font-medium text-ink2">Ingresá un monto para calcular</p>
            <p className="text-[12px] text-ink3 mt-1">
              Compará el neto entre boleta de honorarios y factura exenta
            </p>
          </div>
        )}
      </div>

      {/* ── Gastos Fijos Mensuales ── */}
      <GastosFijosSection />

      {/* ── Flujo de Caja ── */}
      <FlujoDeCajaSection />

      {/* ── Simulador de Arriendo ── */}
      <SimuladorArriendoSection />

    </div>
  );
}
