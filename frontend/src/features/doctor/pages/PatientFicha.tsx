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
} from "lucide-react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Patient, GrowthPoint, PaginatedResponse, Encounter } from "@/types/api";

// ─── OMS reference data (weight-for-age, boys, 0-60 months) ─────────────────

const OMS_WEIGHT_AGE_BOYS = [
  { ageMonths: 0,  p3: 2.5, p15: 2.9, p50: 3.3, p85: 3.9, p97: 4.4 },
  { ageMonths: 2,  p3: 4.4, p15: 4.9, p50: 5.6, p85: 6.4, p97: 7.0 },
  { ageMonths: 4,  p3: 5.6, p15: 6.2, p50: 7.0, p85: 8.0, p97: 8.7 },
  { ageMonths: 6,  p3: 6.4, p15: 7.1, p50: 7.9, p85: 9.0, p97: 9.8 },
  { ageMonths: 9,  p3: 7.1, p15: 7.9, p50: 8.9, p85: 10.1, p97: 11.0 },
  { ageMonths: 12, p3: 7.7, p15: 8.6, p50: 9.6, p85: 10.9, p97: 11.8 },
  { ageMonths: 18, p3: 8.8, p15: 9.7, p50: 10.9, p85: 12.5, p97: 13.7 },
  { ageMonths: 24, p3: 9.7, p15: 10.8, p50: 12.2, p85: 14.0, p97: 15.3 },
  { ageMonths: 30, p3: 10.5, p15: 11.7, p50: 13.3, p85: 15.4, p97: 16.9 },
  { ageMonths: 36, p3: 11.3, p15: 12.7, p50: 14.3, p85: 16.6, p97: 18.3 },
  { ageMonths: 42, p3: 12.0, p15: 13.5, p50: 15.3, p85: 17.8, p97: 19.6 },
  { ageMonths: 48, p3: 12.8, p15: 14.3, p50: 16.3, p85: 18.9, p97: 20.9 },
  { ageMonths: 54, p3: 13.5, p15: 15.1, p50: 17.2, p85: 20.1, p97: 22.3 },
  { ageMonths: 60, p3: 14.1, p15: 15.9, p50: 18.3, p85: 21.3, p97: 23.7 },
];

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

function GrowthChart({ growthData }: { growthData: GrowthPoint[] }) {
  // Merge OMS reference + patient data on ageMonths axis
  const omsMap = new Map<number, (typeof OMS_WEIGHT_AGE_BOYS)[0]>();
  for (const pt of OMS_WEIGHT_AGE_BOYS) omsMap.set(pt.ageMonths, pt);

  const patientMap = new Map<number, number>();
  for (const pt of growthData) {
    if (pt.age_months !== null && pt.weight_kg) {
      patientMap.set(pt.age_months, parseFloat(pt.weight_kg));
    }
  }

  const allMonths = Array.from(
    new Set([...omsMap.keys(), ...patientMap.keys()])
  ).sort((a, b) => a - b);

  const chartData: ChartPoint[] = allMonths.map((m) => {
    const oms = omsMap.get(m);
    const pt: ChartPoint = { ageMonths: m };
    if (oms) {
      pt.p3 = oms.p3;
      pt.p15 = oms.p15;
      pt.p50 = oms.p50;
      pt.p85 = oms.p85;
      pt.p97 = oms.p97;
    }
    const w = patientMap.get(m);
    if (w !== undefined) pt.patient = w;
    return pt;
  });

  const latestGrowth =
    growthData.length > 0
      ? growthData.reduce((a, b) =>
          new Date(a.encounter_date) > new Date(b.encounter_date) ? a : b
        )
      : null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
      {/* Chart */}
      <div className="xl:col-span-2 bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-bold text-ink">Peso / Edad</h3>
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
                width={30}
                label={{ value: "kg", angle: -90, position: "insideLeft", fontSize: 10.5, fill: "#A0A0A0" }}
              />
              <Tooltip
                contentStyle={{ fontSize: 11.5, border: "1px solid #E8E6E1", borderRadius: 8, color: "#2C2C2C" }}
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    p3: "P3", p15: "P15", p50: "P50", p85: "P85", p97: "P97",
                    patient: "Paciente",
                  };
                  return [`${value} kg`, labels[name] ?? name];
                }}
                labelFormatter={(v) => `${v} meses`}
              />
              {/* OMS percentile lines */}
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
              {/* Patient data */}
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
                </p>
              </div>
            </div>
          ) : (
            <p className="text-[12.5px] text-ink3">Sin registros</p>
          )}
        </div>

        {/* Indicators */}
        <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] p-4">
          <h4 className="text-[12.5px] font-bold text-ink mb-3">Indicadores</h4>
          {latestGrowth ? (
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-[11.5px] text-ink2">Percentil peso/edad</span>
                <span className="text-[12.5px] font-semibold text-ink">
                  {latestGrowth.weight_for_age_percentile != null
                    ? `P${Math.round(latestGrowth.weight_for_age_percentile)}`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11.5px] text-ink2">Z-score peso/edad</span>
                <span className="text-[12.5px] font-semibold text-ink">
                  {latestGrowth.weight_for_age_z != null
                    ? latestGrowth.weight_for_age_z.toFixed(2)
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11.5px] text-ink2">Percentil talla/edad</span>
                <span className="text-[12.5px] font-semibold text-ink">
                  {latestGrowth.height_for_age_percentile != null
                    ? `P${Math.round(latestGrowth.height_for_age_percentile)}`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11.5px] text-ink2">Z-score talla/edad</span>
                <span className="text-[12.5px] font-semibold text-ink">
                  {latestGrowth.height_for_age_z != null
                    ? latestGrowth.height_for_age_z.toFixed(2)
                    : "—"}
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
        {activeTab === "datos" && (
          <PlaceholderCard label="Datos del paciente próximamente" />
        )}
        {activeTab === "antecedentes" && (
          <PlaceholderCard label="Antecedentes próximamente" />
        )}
        {activeTab === "consultas" && (
          <PlaceholderCard label="Historial de consultas próximamente" />
        )}
        {activeTab === "crecimiento" && (
          <div className="space-y-4">
            {/* Metric toggle */}
            <div className="flex gap-2">
              {["Peso / Edad", "Talla / Edad", "PC / Edad", "IMC / Edad"].map((label, i) => (
                <button
                  key={label}
                  disabled={i !== 0}
                  className={cn(
                    "px-3.5 py-2 rounded-[10px] text-[12.5px] font-medium transition-colors",
                    i === 0
                      ? "bg-teal text-white"
                      : "bg-surface border border-line text-ink3 cursor-not-allowed opacity-50"
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
              <GrowthChart growthData={growthData} />
            )}
          </div>
        )}
        {activeTab === "archivos" && (
          <PlaceholderCard label="Archivos del paciente próximamente" />
        )}
        {activeTab === "vacunas" && (
          <PlaceholderCard label="Registro de vacunas próximamente" />
        )}
      </div>
    </div>
  );
}
