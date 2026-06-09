import { useState, useMemo } from "react";
import { Calculator, Receipt, TrendingUp, Info, ArrowRight } from "lucide-react";
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
  // Strip everything except digits
  const digits = raw.replace(/\D/g, "");
  return digits === "" ? 0 : parseInt(digits, 10);
}

function formatInputDisplay(n: number): string {
  if (n === 0) return "";
  return n.toLocaleString("es-CL");
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
      <span
        className={cn(
          "text-[13px]",
          muted ? "text-ink3" : "text-ink2"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "text-[13px] font-medium",
          highlight ? "text-teal-dark font-bold" : bold ? "text-ink font-semibold" : "text-ink"
        )}
      >
        {value}
      </span>
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
        <p className="text-[13px] text-ink3 mt-0.5">Herramientas tributarias y financieras para tu práctica</p>
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
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-ink3 font-medium">$</span>
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
                    {result.comparison.recommendation === "factura" ? "factura exenta" : "boleta de honorarios"}
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
                Estimación orientativa. Valores basados en UTM 2025 ≈ $67.000 y tramos impuesto global complementario
                vigentes. No reemplaza asesoría de un contador.
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

      {/* ── Flujo de caja placeholder ── */}
      <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] p-6">
        <SectionHeader
          icon={TrendingUp}
          title="Flujo de Caja Mensual"
          subtitle="Seguimiento de ingresos y egresos de tu práctica"
        />
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-12 h-12 rounded-full bg-bg border border-line flex items-center justify-center mb-3">
            <TrendingUp size={22} className="text-ink3" strokeWidth={1.5} />
          </div>
          <p className="text-[13.5px] font-medium text-ink2">Próximamente: Flujo de caja mensual</p>
          <p className="text-[12px] text-ink3 mt-1 max-w-xs">
            Visualizá tus ingresos por consulta, gastos operativos y proyecciones mensuales.
          </p>
        </div>
      </div>

    </div>
  );
}
