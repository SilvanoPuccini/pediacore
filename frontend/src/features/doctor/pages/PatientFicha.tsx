import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Droplets,
  AlertCircle,
  User,
  FileText,
  TrendingUp,
  Paperclip,
  Syringe,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  Download,
} from "lucide-react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Patient, GrowthPoint, PaginatedResponse, Encounter, PatientFile } from "@/types/api";

// ─── OMS reference data — lookup by metric + sex ─────────────────────────────

type OmsRow = { ageMonths: number; p3: number; p15: number; p50: number; p85: number; p97: number };
type MetricKey = "weight" | "height" | "hc" | "bmi";
type SexKey = "M" | "F";

const OMS_DATA: Record<MetricKey, Record<SexKey, OmsRow[]>> = {
  weight: {
    M: [
      { ageMonths: 0,  p3: 2.5,  p15: 2.9,  p50: 3.3,  p85: 3.9,  p97: 4.4  },
      { ageMonths: 2,  p3: 4.4,  p15: 4.9,  p50: 5.6,  p85: 6.4,  p97: 7.0  },
      { ageMonths: 4,  p3: 5.6,  p15: 6.2,  p50: 7.0,  p85: 8.0,  p97: 8.7  },
      { ageMonths: 6,  p3: 6.4,  p15: 7.1,  p50: 7.9,  p85: 9.0,  p97: 9.8  },
      { ageMonths: 9,  p3: 7.1,  p15: 7.9,  p50: 8.9,  p85: 10.1, p97: 11.0 },
      { ageMonths: 12, p3: 7.7,  p15: 8.6,  p50: 9.6,  p85: 10.9, p97: 11.8 },
      { ageMonths: 18, p3: 8.8,  p15: 9.7,  p50: 10.9, p85: 12.5, p97: 13.7 },
      { ageMonths: 24, p3: 9.7,  p15: 10.8, p50: 12.2, p85: 14.0, p97: 15.3 },
      { ageMonths: 30, p3: 10.5, p15: 11.7, p50: 13.3, p85: 15.4, p97: 16.9 },
      { ageMonths: 36, p3: 11.3, p15: 12.7, p50: 14.3, p85: 16.6, p97: 18.3 },
      { ageMonths: 42, p3: 12.0, p15: 13.5, p50: 15.3, p85: 17.8, p97: 19.6 },
      { ageMonths: 48, p3: 12.8, p15: 14.3, p50: 16.3, p85: 18.9, p97: 20.9 },
      { ageMonths: 54, p3: 13.5, p15: 15.1, p50: 17.2, p85: 20.1, p97: 22.3 },
      { ageMonths: 60, p3: 14.1, p15: 15.9, p50: 18.3, p85: 21.3, p97: 23.7 },
    ],
    F: [
      { ageMonths: 0,  p3: 2.4,  p15: 2.8,  p50: 3.2,  p85: 3.7,  p97: 4.2  },
      { ageMonths: 2,  p3: 4.0,  p15: 4.5,  p50: 5.1,  p85: 5.9,  p97: 6.5  },
      { ageMonths: 4,  p3: 5.1,  p15: 5.6,  p50: 6.4,  p85: 7.3,  p97: 8.1  },
      { ageMonths: 6,  p3: 5.8,  p15: 6.4,  p50: 7.3,  p85: 8.3,  p97: 9.2  },
      { ageMonths: 9,  p3: 6.6,  p15: 7.3,  p50: 8.2,  p85: 9.4,  p97: 10.4 },
      { ageMonths: 12, p3: 7.0,  p15: 7.8,  p50: 8.9,  p85: 10.2, p97: 11.3 },
      { ageMonths: 18, p3: 8.1,  p15: 9.0,  p50: 10.2, p85: 11.8, p97: 13.0 },
      { ageMonths: 24, p3: 9.0,  p15: 10.1, p50: 11.5, p85: 13.3, p97: 14.7 },
      { ageMonths: 36, p3: 10.8, p15: 12.0, p50: 13.9, p85: 16.0, p97: 17.7 },
      { ageMonths: 48, p3: 12.3, p15: 13.8, p50: 16.1, p85: 18.7, p97: 20.9 },
      { ageMonths: 60, p3: 13.7, p15: 15.5, p50: 18.2, p85: 21.4, p97: 24.1 },
    ],
  },
  height: {
    M: [
      { ageMonths: 0,  p3: 46.3, p15: 47.9, p50: 49.9, p85: 51.8, p97: 53.4 },
      { ageMonths: 2,  p3: 54.7, p15: 56.4, p50: 58.4, p85: 60.5, p97: 62.2 },
      { ageMonths: 6,  p3: 63.4, p15: 65.4, p50: 67.6, p85: 69.8, p97: 71.6 },
      { ageMonths: 12, p3: 71.0, p15: 73.2, p50: 75.7, p85: 78.3, p97: 80.5 },
      { ageMonths: 24, p3: 81.0, p15: 83.9, p50: 87.1, p85: 90.4, p97: 93.3 },
      { ageMonths: 36, p3: 88.7, p15: 91.9, p50: 96.1, p85: 99.8, p97: 103.5 },
      { ageMonths: 48, p3: 94.9, p15: 99.1, p50: 103.3, p85: 107.5, p97: 111.7 },
      { ageMonths: 60, p3: 100.7, p15: 105.3, p50: 110.0, p85: 114.6, p97: 119.2 },
    ],
    F: [
      { ageMonths: 0,  p3: 45.6, p15: 47.2, p50: 49.1, p85: 51.1, p97: 52.7 },
      { ageMonths: 2,  p3: 53.2, p15: 55.0, p50: 57.1, p85: 59.1, p97: 60.9 },
      { ageMonths: 6,  p3: 61.5, p15: 63.5, p50: 65.7, p85: 68.0, p97: 69.8 },
      { ageMonths: 12, p3: 69.2, p15: 71.4, p50: 74.0, p85: 76.6, p97: 78.9 },
      { ageMonths: 24, p3: 79.3, p15: 82.2, p50: 85.7, p85: 89.1, p97: 92.0 },
      { ageMonths: 36, p3: 87.4, p15: 90.8, p50: 95.1, p85: 98.8, p97: 102.7 },
      { ageMonths: 48, p3: 94.1, p15: 98.0, p50: 102.7, p85: 107.4, p97: 111.3 },
      { ageMonths: 60, p3: 99.9, p15: 104.7, p50: 109.4, p85: 114.2, p97: 119.0 },
    ],
  },
  hc: {
    M: [
      { ageMonths: 0,  p3: 32.1, p15: 33.1, p50: 34.5, p85: 35.8, p97: 36.9 },
      { ageMonths: 3,  p3: 38.1, p15: 39.1, p50: 40.5, p85: 41.9, p97: 42.9 },
      { ageMonths: 6,  p3: 40.8, p15: 41.8, p50: 43.3, p85: 44.7, p97: 45.8 },
      { ageMonths: 12, p3: 43.6, p15: 44.6, p50: 46.1, p85: 47.5, p97: 48.5 },
      { ageMonths: 24, p3: 45.7, p15: 46.8, p50: 48.3, p85: 49.8, p97: 50.8 },
      { ageMonths: 36, p3: 47.0, p15: 48.0, p50: 49.5, p85: 51.0, p97: 52.0 },
      { ageMonths: 60, p3: 48.3, p15: 49.3, p50: 50.7, p85: 52.2, p97: 53.2 },
    ],
    F: [
      { ageMonths: 0,  p3: 31.5, p15: 32.4, p50: 33.9, p85: 35.2, p97: 36.2 },
      { ageMonths: 3,  p3: 37.1, p15: 38.1, p50: 39.5, p85: 40.9, p97: 42.0 },
      { ageMonths: 6,  p3: 39.7, p15: 40.8, p50: 42.2, p85: 43.6, p97: 44.6 },
      { ageMonths: 12, p3: 42.3, p15: 43.4, p50: 44.9, p85: 46.3, p97: 47.4 },
      { ageMonths: 24, p3: 44.6, p15: 45.6, p50: 47.2, p85: 48.7, p97: 49.7 },
      { ageMonths: 36, p3: 45.8, p15: 46.9, p50: 48.5, p85: 50.0, p97: 51.0 },
      { ageMonths: 60, p3: 47.2, p15: 48.2, p50: 49.8, p85: 51.3, p97: 52.3 },
    ],
  },
  bmi: {
    M: [
      { ageMonths: 0,  p3: 11.1, p15: 12.2, p50: 13.4, p85: 14.8, p97: 16.3 },
      { ageMonths: 6,  p3: 14.4, p15: 15.5, p50: 17.0, p85: 18.6, p97: 19.9 },
      { ageMonths: 12, p3: 14.4, p15: 15.4, p50: 16.7, p85: 18.2, p97: 19.5 },
      { ageMonths: 24, p3: 13.7, p15: 14.7, p50: 16.0, p85: 17.5, p97: 18.7 },
      { ageMonths: 36, p3: 13.3, p15: 14.2, p50: 15.5, p85: 17.0, p97: 18.2 },
      { ageMonths: 48, p3: 13.1, p15: 14.0, p50: 15.3, p85: 16.9, p97: 18.3 },
      { ageMonths: 60, p3: 13.0, p15: 13.9, p50: 15.3, p85: 17.0, p97: 18.6 },
    ],
    F: [
      { ageMonths: 0,  p3: 10.8, p15: 11.8, p50: 13.3, p85: 14.6, p97: 16.1 },
      { ageMonths: 6,  p3: 14.0, p15: 15.0, p50: 16.4, p85: 18.0, p97: 19.4 },
      { ageMonths: 12, p3: 13.9, p15: 14.9, p50: 16.4, p85: 18.0, p97: 19.4 },
      { ageMonths: 24, p3: 13.4, p15: 14.4, p50: 15.7, p85: 17.3, p97: 18.7 },
      { ageMonths: 36, p3: 13.0, p15: 13.9, p50: 15.3, p85: 16.9, p97: 18.3 },
      { ageMonths: 48, p3: 12.8, p15: 13.7, p50: 15.1, p85: 16.8, p97: 18.5 },
      { ageMonths: 60, p3: 12.7, p15: 13.5, p50: 15.0, p85: 16.8, p97: 18.7 },
    ],
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatAge(patient: Patient): string {
  const { years, months } = patient.age;
  if (years === 0) return `${months} meses`;
  if (months === 0) return `${years} año${years !== 1 ? "s" : ""}`;
  return `${years} a ${months} m`;
}

function sexLabel(sex: string): string {
  if (sex === "M") return "Masculino";
  if (sex === "F") return "Femenino";
  return "No especifica";
}

function getPalette(name: string): [string, string] {
  const PALETTES: [string, string][] = [
    ["#F4A89A", "#FFE2D9"],
    ["#7DD3C0", "#D6F1EA"],
    ["#C7B8E8", "#EDE4FF"],
    ["#A8D5B5", "#DAEFE0"],
    ["#F5D4A0", "#FCEACB"],
  ];
  const code = name.charCodeAt(0) % PALETTES.length;
  return PALETTES[code];
}

// ─── Tab definitions ──────────────────────────────────────────────────────────

type TabKey = "datos" | "antecedentes" | "consultas" | "crecimiento" | "archivos" | "vacunas";

// ─── Placeholder card ─────────────────────────────────────────────────────────

function PlaceholderCard({ label }: { label: string }) {
  return (
    <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] p-10 flex flex-col items-center justify-center gap-3 text-ink3 min-h-[240px]">
      <ClipboardList size={32} className="opacity-30" />
      <p className="text-[14px]">{label}</p>
    </div>
  );
}

// ─── Encounter card ───────────────────────────────────────────────────────────

const STATUS_CHIP: Record<string, string> = {
  COMPLETED:   "bg-teal/10 text-teal-dark",
  SCHEDULED:   "bg-blue-50 text-blue-600",
  IN_PROGRESS: "bg-amber-50 text-amber-600",
  CANCELLED:   "bg-bg text-ink3",
};

const STATUS_LABEL: Record<string, string> = {
  COMPLETED:   "Completada",
  SCHEDULED:   "Programada",
  IN_PROGRESS: "En curso",
  CANCELLED:   "Cancelada",
};

const TYPE_LABEL: Record<string, string> = {
  FIRST_VISIT:  "Primera consulta",
  FOLLOW_UP:    "Control",
  URGENT:       "Urgencia",
  PREVENTIVE:   "Preventiva",
  TELEMEDICINE: "Telemedicina",
};

function EncounterCard({ encounter }: { encounter: Encounter }) {
  const [open, setOpen] = useState(false);
  const soap = encounter.soap_notes?.[0];
  const hasSoap = !!soap && (soap.subjective || soap.objective || soap.assessment || soap.plan);
  const hasDx = encounter.diagnoses?.length > 0;

  const dateStr = new Date(encounter.scheduled_at).toLocaleDateString("es-CL", {
    day: "2-digit", month: "short", year: "numeric",
  });

  return (
    <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] overflow-hidden">
      <div
        className={cn("p-4", (hasSoap || hasDx) && "cursor-pointer hover:bg-bg transition-colors")}
        onClick={() => (hasSoap || hasDx) && setOpen((v) => !v)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-[12px] font-semibold text-ink2">{dateStr}</span>
              <span className="px-2 py-0.5 rounded-full bg-bg border border-line text-[10.5px] text-ink2">
                {TYPE_LABEL[encounter.encounter_type] ?? encounter.encounter_type}
              </span>
              <span className={cn("px-2 py-0.5 rounded-full text-[10.5px] font-medium", STATUS_CHIP[encounter.status] ?? "bg-bg text-ink3")}>
                {STATUS_LABEL[encounter.status] ?? encounter.status}
              </span>
            </div>
            {encounter.reason_for_visit && (
              <p className="text-[13px] text-ink">{encounter.reason_for_visit}</p>
            )}
          </div>
          {(hasSoap || hasDx) && (
            <div className="shrink-0 text-ink3 mt-0.5">
              {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </div>
          )}
        </div>
      </div>

      {open && (
        <div className="border-t border-line px-4 pb-4 pt-3 space-y-3">
          {hasSoap && (
            <div className="space-y-2">
              {soap.subjective && (
                <div>
                  <p className="text-[10.5px] font-semibold text-ink3 uppercase tracking-wide mb-0.5">S — Subjetivo</p>
                  <p className="text-[12.5px] text-ink2">{soap.subjective}</p>
                </div>
              )}
              {soap.objective && (
                <div>
                  <p className="text-[10.5px] font-semibold text-ink3 uppercase tracking-wide mb-0.5">O — Objetivo</p>
                  <p className="text-[12.5px] text-ink2">{soap.objective}</p>
                </div>
              )}
              {soap.assessment && (
                <div>
                  <p className="text-[10.5px] font-semibold text-ink3 uppercase tracking-wide mb-0.5">A — Evaluación</p>
                  <p className="text-[12.5px] text-ink2">{soap.assessment}</p>
                </div>
              )}
              {soap.plan && (
                <div>
                  <p className="text-[10.5px] font-semibold text-ink3 uppercase tracking-wide mb-0.5">P — Plan</p>
                  <p className="text-[12.5px] text-ink2">{soap.plan}</p>
                </div>
              )}
            </div>
          )}
          {hasDx && (
            <div>
              <p className="text-[10.5px] font-semibold text-ink3 uppercase tracking-wide mb-1.5">Diagnósticos</p>
              <div className="flex flex-wrap gap-1.5">
                {encounter.diagnoses.map((dx) => (
                  <span key={dx.id} className="px-2.5 py-1 rounded-full bg-bg border border-line text-[11px] text-ink2">
                    <span className="font-semibold text-ink">{dx.code}</span> {dx.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── File card ────────────────────────────────────────────────────────────────

const CATEGORY_CHIP: Record<string, string> = {
  EXAM_RESULT:  "bg-teal/10 text-teal-dark",
  PRESCRIPTION: "bg-amber-50 text-amber-700",
  IMAGE:        "bg-coral/10 text-coral",
  OTHER:        "bg-bg text-ink3 border border-line",
};

const CATEGORY_LABEL: Record<string, string> = {
  EXAM_RESULT:  "Examen",
  PRESCRIPTION: "Receta",
  IMAGE:        "Imagen",
  OTHER:        "Otro",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileCard({ file }: { file: PatientFile }) {
  const uploadDate = new Date(file.uploaded_at).toLocaleDateString("es-CL", {
    day: "2-digit", month: "short", year: "numeric",
  });

  return (
    <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-ink truncate">{file.file_name}</p>
          <p className="text-[11px] text-ink3 mt-0.5">{formatFileSize(file.file_size)} · {uploadDate}</p>
        </div>
        <a
          href={file.file}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 p-1.5 rounded-lg bg-bg border border-line text-ink2 hover:text-teal-dark transition-colors"
          title="Descargar"
        >
          <Download size={14} />
        </a>
      </div>

      <div className="flex items-center justify-between">
        <span className={cn("px-2.5 py-1 rounded-full text-[10.5px] font-medium", CATEGORY_CHIP[file.category] ?? CATEGORY_CHIP.OTHER)}>
          {CATEGORY_LABEL[file.category] ?? file.category}
        </span>
        <p className="text-[11px] text-ink3">{file.uploaded_by_name}</p>
      </div>

      {file.description && (
        <p className="text-[12px] text-ink2 leading-relaxed border-t border-line pt-2">{file.description}</p>
      )}
    </div>
  );
}

// ─── Growth chart ─────────────────────────────────────────────────────────────

type ChartPoint = {
  ageMonths: number;
  p3?: number;
  p15?: number;
  p50?: number;
  p85?: number;
  p97?: number;
  patient?: number;
};

const METRIC_CONFIG: Record<MetricKey, { label: string; unit: string; title: string }> = {
  weight: { label: "Peso / Edad",  unit: "kg",    title: "Peso / Edad"          },
  height: { label: "Talla / Edad", unit: "cm",    title: "Talla / Edad"         },
  hc:     { label: "PC / Edad",   unit: "cm",    title: "Perímetro Cefálico / Edad" },
  bmi:    { label: "IMC / Edad",  unit: "kg/m²", title: "IMC / Edad"           },
};

const INDICATOR_CONFIG: Record<MetricKey, {
  percentileKey: keyof GrowthPoint;
  zKey: keyof GrowthPoint;
  label: string;
}> = {
  weight: { percentileKey: "weight_for_age_percentile", zKey: "weight_for_age_z", label: "peso/edad" },
  height: { percentileKey: "height_for_age_percentile", zKey: "height_for_age_z", label: "talla/edad" },
  hc:     { percentileKey: "head_circumference_for_age_percentile", zKey: "head_circumference_for_age_z", label: "PC/edad" },
  bmi:    { percentileKey: "bmi_for_age_percentile", zKey: "bmi_for_age_z", label: "IMC/edad" },
};

function getPatientValue(pt: GrowthPoint, metric: MetricKey): number | null {
  switch (metric) {
    case "weight": return pt.weight_kg ? parseFloat(pt.weight_kg) : null;
    case "height": return pt.height_cm ? parseFloat(pt.height_cm) : null;
    case "hc":     return pt.head_circumference_cm ? parseFloat(pt.head_circumference_cm) : null;
    case "bmi":    return pt.bmi ? parseFloat(pt.bmi) : null;
  }
}

function GrowthChart({
  growthData,
  metric,
  sex,
}: {
  growthData: GrowthPoint[];
  metric: MetricKey;
  sex: SexKey;
}) {
  const omsDataset = OMS_DATA[metric][sex];
  const cfg = METRIC_CONFIG[metric];
  const indCfg = INDICATOR_CONFIG[metric];

  const omsMap = new Map<number, OmsRow>();
  for (const pt of omsDataset) omsMap.set(pt.ageMonths, pt);

  const patientMap = new Map<number, number>();
  for (const pt of growthData) {
    if (pt.age_months !== null) {
      const val = getPatientValue(pt, metric);
      if (val !== null) patientMap.set(pt.age_months, val);
    }
  }

  const allMonths = Array.from(
    new Set([...omsMap.keys(), ...patientMap.keys()])
  ).sort((a, b) => a - b);

  const chartData: ChartPoint[] = allMonths.map((m) => {
    const oms = omsMap.get(m);
    const pt: ChartPoint = { ageMonths: m };
    if (oms) { pt.p3 = oms.p3; pt.p15 = oms.p15; pt.p50 = oms.p50; pt.p85 = oms.p85; pt.p97 = oms.p97; }
    const v = patientMap.get(m);
    if (v !== undefined) pt.patient = v;
    return pt;
  });

  const latestGrowth =
    growthData.length > 0
      ? growthData.reduce((a, b) =>
          new Date(a.encounter_date) > new Date(b.encounter_date) ? a : b
        )
      : null;

  const latestPercentile = latestGrowth
    ? (latestGrowth[indCfg.percentileKey] as number | null)
    : null;
  const latestZ = latestGrowth
    ? (latestGrowth[indCfg.zKey] as number | null)
    : null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
      {/* Chart */}
      <div className="xl:col-span-2 bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-bold text-ink">{cfg.title}</h3>
          <div className="flex items-center gap-3 text-[11px] text-ink3">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-px border-t border-dashed border-ink3 inline-block" />
              Percentiles OMS
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-px bg-teal inline-block" />
              Paciente
            </span>
          </div>
        </div>

        {growthData.length === 0 ? (
          <div className="flex items-center justify-center h-[260px] text-ink3 text-[13px]">
            Sin registros de crecimiento
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E6E1" vertical={false} />
              <XAxis
                dataKey="ageMonths"
                tick={{ fontSize: 10.5, fill: "#A0A0A0" }}
                tickLine={false}
                axisLine={false}
                label={{ value: "Meses", position: "insideBottomRight", offset: -4, fontSize: 10.5, fill: "#A0A0A0" }}
              />
              <YAxis
                tick={{ fontSize: 10.5, fill: "#A0A0A0" }}
                tickLine={false}
                axisLine={false}
                width={36}
                label={{ value: cfg.unit, angle: -90, position: "insideLeft", fontSize: 10.5, fill: "#A0A0A0" }}
              />
              <Tooltip
                contentStyle={{ fontSize: 11.5, border: "1px solid #E8E6E1", borderRadius: 8, color: "#2C2C2C" }}
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    p3: "P3", p15: "P15", p50: "P50", p85: "P85", p97: "P97",
                    patient: "Paciente",
                  };
                  return [`${value} ${cfg.unit}`, labels[name] ?? name];
                }}
                labelFormatter={(v) => `${v} meses`}
              />
              {(["p3", "p15", "p50", "p85", "p97"] as const).map((key) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke="#C0C0C0"
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  dot={false}
                  connectNulls
                />
              ))}
              <Line
                type="monotone"
                dataKey="patient"
                stroke="#7BB5BD"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#7BB5BD", strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Side panel */}
      <div className="space-y-4">
        {/* Latest measurement */}
        <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] p-4">
          <h4 className="text-[12.5px] font-bold text-ink mb-3">Última medición</h4>
          {latestGrowth ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10.5px] text-ink3 font-medium uppercase tracking-wide">Peso</p>
                <p className="text-[18px] font-bold text-ink mt-0.5">
                  {latestGrowth.weight_kg}
                  <span className="text-[11px] font-normal text-ink3 ml-1">kg</span>
                </p>
              </div>
              <div>
                <p className="text-[10.5px] text-ink3 font-medium uppercase tracking-wide">Talla</p>
                <p className="text-[18px] font-bold text-ink mt-0.5">
                  {latestGrowth.height_cm || "—"}
                  <span className="text-[11px] font-normal text-ink3 ml-1">cm</span>
                </p>
              </div>
              <div>
                <p className="text-[10.5px] text-ink3 font-medium uppercase tracking-wide">PC</p>
                <p className="text-[18px] font-bold text-ink mt-0.5">
                  {latestGrowth.head_circumference_cm || "—"}
                  <span className="text-[11px] font-normal text-ink3 ml-1">cm</span>
                </p>
              </div>
              <div>
                <p className="text-[10.5px] text-ink3 font-medium uppercase tracking-wide">IMC</p>
                <p className="text-[18px] font-bold text-ink mt-0.5">
                  {latestGrowth.bmi ? parseFloat(latestGrowth.bmi).toFixed(1) : "—"}
                  <span className="text-[11px] font-normal text-ink3 ml-1">kg/m²</span>
                </p>
              </div>
            </div>
          ) : (
            <p className="text-[12.5px] text-ink3">Sin registros</p>
          )}
        </div>

        {/* Indicators — dynamic per metric */}
        <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] p-4">
          <h4 className="text-[12.5px] font-bold text-ink mb-3">Indicadores</h4>
          {latestGrowth ? (
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-[11.5px] text-ink2">Percentil {indCfg.label}</span>
                <span className="text-[12.5px] font-semibold text-ink">
                  {latestPercentile != null ? `P${Math.round(latestPercentile)}` : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11.5px] text-ink2">Z-score {indCfg.label}</span>
                <span className="text-[12.5px] font-semibold text-ink">
                  {latestZ != null ? latestZ.toFixed(2) : "—"}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-[12.5px] text-ink3">Sin datos disponibles</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PatientFicha page ────────────────────────────────────────────────────────

export default function PatientFicha() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>("crecimiento");
  const [metric, setMetric] = useState<MetricKey>("weight");

  const patientQ = useQuery<Patient>({
    queryKey: ["patient", id],
    queryFn: async () => {
      const { data } = await api.get<Patient>(`/patients/${id}/`);
      return data;
    },
    enabled: !!id,
  });

  const encountersQ = useQuery<PaginatedResponse<Encounter>>({
    queryKey: ["encounters", id],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Encounter>>(
        `/encounters/?patient_id=${id}&page_size=500`
      );
      return data;
    },
    enabled: !!id,
  });

  const growthQ = useQuery<GrowthPoint[]>({
    queryKey: ["growth", id],
    queryFn: async () => {
      const { data } = await api.get<GrowthPoint[]>(`/patients/${id}/growth-history/`);
      return data;
    },
    enabled: !!id,
  });

  const filesQ = useQuery<{ count: number }>({
    queryKey: ["patient-files-count", id],
    queryFn: async () => {
      const { data } = await api.get<{ count: number; results: unknown[] }>(
        `/patients/${id}/files/?page_size=1`
      );
      return { count: data.count };
    },
    enabled: !!id,
  });

  const filesFullQ = useQuery<{ count: number; results: PatientFile[] }>({
    queryKey: ["patient-files", id],
    queryFn: async () => {
      const { data } = await api.get<{ count: number; results: PatientFile[] }>(
        `/patients/${id}/files/?page_size=100`
      );
      return data;
    },
    enabled: !!id && activeTab === "archivos",
  });

  const patient = patientQ.data;
  const encounterCount = encountersQ.data?.count ?? 0;
  const fileCount = filesQ.data?.count ?? 0;
  const growthData = growthQ.data ?? [];

  const tabs: { key: TabKey; label: string; count?: number; icon: React.ReactNode }[] = [
    { key: "datos", label: "Datos", icon: <User size={14} /> },
    { key: "antecedentes", label: "Antecedentes", icon: <FileText size={14} /> },
    { key: "consultas", label: "Consultas", count: encounterCount, icon: <ClipboardList size={14} /> },
    { key: "crecimiento", label: "Crecimiento", icon: <TrendingUp size={14} /> },
    { key: "archivos", label: "Archivos", count: fileCount, icon: <Paperclip size={14} /> },
    { key: "vacunas", label: "Vacunas", icon: <Syringe size={14} /> },
  ];

  if (patientQ.isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-5 w-5 rounded-full border-2 border-line border-t-teal animate-spin" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-ink3">
        <AlertCircle size={32} className="opacity-40" />
        <p className="text-[14px]">Paciente no encontrado</p>
        <button
          onClick={() => navigate("/dashboard/pacientes")}
          className="text-[12.5px] text-teal-dark font-semibold hover:underline"
        >
          Volver a pacientes
        </button>
      </div>
    );
  }

  const [borderColor, bgColor] = getPalette(patient.full_name);
  const initials = patient.full_name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const primaryTutor = patient.tutors.find((t) => t.is_primary) ?? patient.tutors[0];

  return (
    <div className="space-y-5 max-w-[1200px]">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-[12.5px] text-ink2 hover:text-ink transition-colors"
      >
        <ArrowLeft size={14} />
        Volver
      </button>

      {/* Patient header card */}
      <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] p-5">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          {/* Gradient avatar */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-[20px] font-bold shrink-0"
            style={{
              background: `linear-gradient(135deg, ${bgColor}, ${borderColor})`,
              color: borderColor,
              border: `2px solid ${borderColor}`,
            }}
          >
            {initials}
          </div>

          {/* Name + chips */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[20px] font-bold text-ink">{patient.full_name}</h1>
              <span className="text-[11.5px] text-ink3">{patient.rut}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="px-2.5 py-1 rounded-full bg-teal/10 text-teal-dark text-[11.5px] font-medium">
                {formatAge(patient)}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-bg border border-line text-ink2 text-[11.5px]">
                {sexLabel(patient.sex_at_birth)}
              </span>
              {patient.blood_type && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-bg border border-line text-ink2 text-[11.5px]">
                  <Droplets size={11} className="text-coral" />
                  {patient.blood_type}
                </span>
              )}
              {patient.insurance && (
                <span className="px-2.5 py-1 rounded-full bg-bg border border-line text-ink2 text-[11.5px]">
                  {patient.insurance}
                </span>
              )}
            </div>

            {/* Allergies */}
            {patient.allergies && (
              <div className="mt-2 flex items-start gap-1.5 text-[12px] text-ink2">
                <AlertCircle size={12} className="text-coral shrink-0 mt-px" />
                <span><span className="font-semibold">Alergias:</span> {patient.allergies}</span>
              </div>
            )}

            {/* Tutors */}
            {patient.tutors.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-3">
                {patient.tutors.map((t) => (
                  <span key={t.id} className="text-[11.5px] text-ink2">
                    <span className="font-medium">{t.tutor_full_name}</span>
                    <span className="text-ink3 ml-1">({t.relationship}{t.is_primary ? " · principal" : ""})</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Primary tutor summary */}
          {primaryTutor && (
            <div className="shrink-0 text-right hidden sm:block">
              <p className="text-[10.5px] text-ink3 font-medium uppercase tracking-wide">Tutor principal</p>
              <p className="text-[13px] font-semibold text-ink mt-1">{primaryTutor.tutor_full_name}</p>
              <p className="text-[11.5px] text-ink3">{primaryTutor.tutor_email}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-line">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "inline-flex items-center gap-1.5 px-4 py-3 text-[13px] font-medium whitespace-nowrap transition-colors",
                "border-b-2 -mb-px",
                activeTab === tab.key
                  ? "border-teal text-teal-dark"
                  : "border-transparent text-ink2 hover:text-ink"
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={cn(
                    "text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full",
                    activeTab === tab.key
                      ? "bg-teal/15 text-teal-dark"
                      : "bg-bg text-ink3"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {/* ── DATOS ── */}
        {activeTab === "datos" && (
          <div className="space-y-4">
            {/* Personal */}
            <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] p-5">
              <h3 className="text-[13px] font-bold text-ink mb-4">Información personal</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                {[
                  { label: "Nombre completo", value: patient.full_name },
                  { label: "RUT", value: patient.rut },
                  {
                    label: "Fecha de nacimiento",
                    value: new Date(patient.date_of_birth + "T00:00:00").toLocaleDateString("es-CL", {
                      day: "2-digit", month: "long", year: "numeric",
                    }),
                  },
                  { label: "Sexo", value: sexLabel(patient.sex_at_birth) },
                  { label: "Grupo sanguíneo", value: patient.blood_type ?? "No registrado" },
                  { label: "Previsión", value: patient.insurance ?? "No registrada" },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10.5px] text-ink3 font-medium uppercase tracking-wide">{label}</p>
                    <p className="text-[13.5px] text-ink mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tutores */}
            {patient.tutors.length > 0 && (
              <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] p-5">
                <h3 className="text-[13px] font-bold text-ink mb-4">Tutores</h3>
                <div className="space-y-3">
                  {patient.tutors.map((t) => (
                    <div key={t.id} className="flex items-start justify-between gap-4 py-2.5 border-b border-line last:border-0 last:pb-0">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-[13.5px] font-semibold text-ink">{t.tutor_full_name}</p>
                          {t.is_primary && (
                            <span className="px-2 py-0.5 rounded-full bg-teal/10 text-teal-dark text-[10.5px] font-medium">
                              Principal
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-ink3 mt-0.5">{t.relationship}</p>
                      </div>
                      <p className="text-[12px] text-ink2 shrink-0">{t.tutor_email}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Escolar */}
            {(patient.school_name || patient.grade) && (
              <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] p-5">
                <h3 className="text-[13px] font-bold text-ink mb-4">Información escolar</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                  {patient.school_name && (
                    <div>
                      <p className="text-[10.5px] text-ink3 font-medium uppercase tracking-wide">Escuela</p>
                      <p className="text-[13.5px] text-ink mt-0.5">{patient.school_name}</p>
                    </div>
                  )}
                  {patient.grade && (
                    <div>
                      <p className="text-[10.5px] text-ink3 font-medium uppercase tracking-wide">Grado</p>
                      <p className="text-[13.5px] text-ink mt-0.5">{patient.grade}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ANTECEDENTES ── */}
        {activeTab === "antecedentes" && (
          <div className="space-y-4">
            {/* Nacimiento */}
            <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] p-5">
              <h3 className="text-[13px] font-bold text-ink mb-4">Antecedentes de nacimiento</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-3">
                {[
                  {
                    label: "Peso al nacer",
                    value: patient.birth_weight_grams
                      ? `${(patient.birth_weight_grams / 1000).toFixed(2)} kg`
                      : "No registrado",
                  },
                  {
                    label: "Talla al nacer",
                    value: patient.birth_length_cm ? `${patient.birth_length_cm} cm` : "No registrada",
                  },
                  {
                    label: "Semanas gestacionales",
                    value: patient.gestational_weeks ? `${patient.gestational_weeks} sem` : "No registradas",
                  },
                  { label: "Tipo de parto", value: patient.birth_type ?? "No registrado" },
                  { label: "Apgar 1 min", value: patient.apgar_1min?.toString() ?? "—" },
                  { label: "Apgar 5 min", value: patient.apgar_5min?.toString() ?? "—" },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10.5px] text-ink3 font-medium uppercase tracking-wide">{label}</p>
                    <p className="text-[13.5px] text-ink mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Alimentación */}
            <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] p-5">
              <h3 className="text-[13px] font-bold text-ink mb-2">Alimentación</h3>
              <p className="text-[13.5px] text-ink">{patient.feeding_type ?? "No registrada"}</p>
            </div>

            {/* Condiciones crónicas */}
            <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] p-5">
              <h3 className="text-[13px] font-bold text-ink mb-2">Condiciones crónicas</h3>
              {patient.chronic_conditions ? (
                <p className="text-[13.5px] text-ink">{patient.chronic_conditions}</p>
              ) : (
                <p className="text-[13px] text-ink3 italic">Sin condiciones crónicas registradas</p>
              )}
            </div>

            {/* Alergias */}
            <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] p-5">
              <h3 className="text-[13px] font-bold text-ink mb-2">Alergias</h3>
              {patient.allergies ? (
                <p className="text-[13.5px] text-ink">{patient.allergies}</p>
              ) : (
                <p className="text-[13px] text-ink3 italic">Sin alergias registradas</p>
              )}
            </div>
          </div>
        )}

        {/* ── CONSULTAS ── */}
        {activeTab === "consultas" && (
          <div className="space-y-3">
            {encountersQ.isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-5 w-5 rounded-full border-2 border-line border-t-teal animate-spin" />
              </div>
            ) : !encountersQ.data?.results?.length ? (
              <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] p-10 flex flex-col items-center justify-center gap-3 text-ink3 min-h-[240px]">
                <ClipboardList size={32} className="opacity-30" />
                <p className="text-[14px]">Sin consultas registradas</p>
              </div>
            ) : (
              encountersQ.data.results
                .slice()
                .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())
                .map((enc) => <EncounterCard key={enc.id} encounter={enc} />)
            )}
          </div>
        )}

        {/* ── CRECIMIENTO ── */}
        {activeTab === "crecimiento" && (
          <div className="space-y-4">
            {/* Metric toggle */}
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { key: "weight" as MetricKey, label: "Peso / Edad" },
                  { key: "height" as MetricKey, label: "Talla / Edad" },
                  { key: "hc"     as MetricKey, label: "PC / Edad"   },
                  { key: "bmi"    as MetricKey, label: "IMC / Edad"  },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setMetric(key)}
                  className={cn(
                    "px-3.5 py-2 rounded-[10px] text-[12.5px] font-medium transition-colors",
                    metric === key
                      ? "bg-teal text-white"
                      : "bg-surface border border-line text-ink2 hover:text-ink"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {growthQ.isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-5 w-5 rounded-full border-2 border-line border-t-teal animate-spin" />
              </div>
            ) : (
              <GrowthChart
                growthData={growthData}
                metric={metric}
                sex={patient.sex_at_birth === "F" ? "F" : "M"}
              />
            )}
          </div>
        )}

        {/* ── ARCHIVOS ── */}
        {activeTab === "archivos" && (
          <div>
            {filesFullQ.isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-5 w-5 rounded-full border-2 border-line border-t-teal animate-spin" />
              </div>
            ) : !filesFullQ.data?.results?.length ? (
              <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] p-10 flex flex-col items-center justify-center gap-3 text-ink3 min-h-[240px]">
                <Paperclip size={32} className="opacity-30" />
                <p className="text-[14px]">Sin archivos cargados</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filesFullQ.data.results.map((file) => (
                  <FileCard key={file.id} file={file} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── VACUNAS ── */}
        {activeTab === "vacunas" && (
          <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] p-10 flex flex-col items-center justify-center gap-4 text-center min-h-[280px]">
            <div className="w-14 h-14 rounded-2xl bg-teal/10 flex items-center justify-center">
              <Syringe size={26} className="text-teal-dark" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-ink">Registro de vacunas</h3>
              <p className="text-[13px] text-ink3 mt-1.5 max-w-[320px]">
                Próximamente: registro y seguimiento del calendario de vacunación PNI Chile.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
