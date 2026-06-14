import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  AlertCircle,
  Check,
  Clock,
  Stethoscope,
  Scale,
  Ruler,
  Activity,
  TrendingUp,
  CalendarDays,
  X,
  Trash2,
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
import {
  Avatar,
  Card,
  Chip,
  Btn,
  EmptyState,
  childPalette,
} from "@/features/tutor/components/portal-ui";
import InlinePatientForm from "@/features/booking/components/InlinePatientForm";
import type { Patient, PaginatedResponse, Encounter, GrowthPoint } from "@/types/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VaccineRecord {
  id: number;
  name: string;
  recommended_age: string;
  status: "done" | "pending" | "overdue";
  administered_at: string | null;
  location_name: string | null;
}

// ─── OMS Weight-for-age percentiles (boys, 0–60 months) ──────────────────────
// Values are weight in kg at each age in months.
// Columns: P3, P15, P50, P85, P97

const OMS_PERCENTILES: Array<{
  age: number;
  p3: number;
  p15: number;
  p50: number;
  p85: number;
  p97: number;
}> = [
  { age: 0, p3: 2.5, p15: 2.9, p50: 3.3, p85: 3.9, p97: 4.3 },
  { age: 1, p3: 3.4, p15: 3.9, p50: 4.5, p85: 5.1, p97: 5.7 },
  { age: 2, p3: 4.4, p15: 5.0, p50: 5.6, p85: 6.3, p97: 7.1 },
  { age: 3, p3: 5.1, p15: 5.7, p50: 6.4, p85: 7.2, p97: 8.0 },
  { age: 4, p3: 5.6, p15: 6.2, p50: 7.0, p85: 7.9, p97: 8.7 },
  { age: 5, p3: 6.0, p15: 6.7, p50: 7.5, p85: 8.4, p97: 9.3 },
  { age: 6, p3: 6.4, p15: 7.1, p50: 7.9, p85: 8.8, p97: 9.8 },
  { age: 7, p3: 6.7, p15: 7.4, p50: 8.3, p85: 9.2, p97: 10.2 },
  { age: 8, p3: 7.0, p15: 7.7, p50: 8.6, p85: 9.6, p97: 10.5 },
  { age: 9, p3: 7.2, p15: 8.0, p50: 8.9, p85: 9.9, p97: 10.9 },
  { age: 10, p3: 7.5, p15: 8.2, p50: 9.2, p85: 10.2, p97: 11.2 },
  { age: 11, p3: 7.7, p15: 8.4, p50: 9.4, p85: 10.5, p97: 11.5 },
  { age: 12, p3: 7.8, p15: 8.7, p50: 9.6, p85: 10.8, p97: 11.8 },
  { age: 15, p3: 8.3, p15: 9.2, p50: 10.3, p85: 11.5, p97: 12.6 },
  { age: 18, p3: 8.8, p15: 9.8, p50: 10.9, p85: 12.2, p97: 13.4 },
  { age: 21, p3: 9.2, p15: 10.3, p50: 11.5, p85: 12.9, p97: 14.2 },
  { age: 24, p3: 9.7, p15: 10.8, p50: 12.2, p85: 13.6, p97: 15.0 },
  { age: 30, p3: 10.5, p15: 11.8, p50: 13.3, p85: 14.9, p97: 16.5 },
  { age: 36, p3: 11.4, p15: 12.7, p50: 14.3, p85: 16.2, p97: 17.8 },
  { age: 42, p3: 12.1, p15: 13.6, p50: 15.3, p85: 17.2, p97: 19.0 },
  { age: 48, p3: 12.7, p15: 14.3, p50: 16.3, p85: 18.4, p97: 20.4 },
  { age: 54, p3: 13.3, p15: 15.0, p50: 17.1, p85: 19.5, p97: 21.7 },
  { age: 60, p3: 14.0, p15: 15.8, p50: 18.0, p85: 20.5, p97: 22.9 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcAgeShort(dateOfBirth: string): string {
  const birth = new Date(dateOfBirth);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (months < 0) { years--; months += 12; }
  if (now.getDate() < birth.getDate()) {
    months--;
    if (months < 0) { years--; months += 12; }
  }
  if (years >= 1) return `${years}a`;
  if (months >= 1) return `${months}m`;
  return "RN";
}

function calcAgeFull(dateOfBirth: string): string {
  const birth = new Date(dateOfBirth);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (months < 0) { years--; months += 12; }
  if (now.getDate() < birth.getDate()) {
    months--;
    if (months < 0) { years--; months += 12; }
  }
  if (years === 0 && months === 0) return "Recién nacido";
  if (years === 0) return `${months} ${months === 1 ? "mes" : "meses"}`;
  if (years < 2) return `${years} año y ${months} ${months === 1 ? "mes" : "meses"}`;
  return `${years} años`;
}


function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  return new Date(isoDate + "T00:00:00").toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const SEX_LABEL: Record<string, string> = {
  M: "Masculino",
  F: "Femenino",
  NO_ESPECIFICA: "No especifica",
};

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type TabId = "growth" | "vaccines" | "encounters" | "data";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "growth", label: "Crecimiento" },
  { id: "vaccines", label: "Vacunas" },
  { id: "encounters", label: "Consultas" },
  { id: "data", label: "Datos" },
];

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="h-8 w-8 rounded-full border-2 border-line border-t-teal animate-spin" />
    </div>
  );
}

// ─── ConfirmModal ─────────────────────────────────────────────────────────────

interface ConfirmModalProps {
  patient: Patient;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}

function ConfirmModal({ patient, onConfirm, onCancel, isPending }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-surface rounded-[20px] border border-line shadow-[var(--shadow-pop)] p-6 w-full max-w-[360px]">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-ink3 hover:text-ink transition-colors"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>
        <h2 className="font-display text-[20px] font-semibold text-ink mb-2">
          Quitar a {patient.first_name}?
        </h2>
        <p className="text-[13px] text-ink2 leading-relaxed mb-6">
          Se va a desvincular de tu perfil. La doctora seguirá teniendo acceso a
          su historia clínica.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 h-10 rounded-[12px] border border-line text-[13px] font-semibold text-ink2 hover:bg-cream transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 h-10 rounded-[12px] bg-coral text-[13px] font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isPending ? "Quitando..." : "Quitar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ChildSwitcher ────────────────────────────────────────────────────────────

interface ChildSwitcherProps {
  patients: Patient[];
  activeId: number;
  onSelect: (id: number) => void;
  onAdd: () => void;
}

function ChildSwitcher({ patients, activeId, onSelect, onAdd }: ChildSwitcherProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {patients.map((p, idx) => {
        const pal = childPalette(idx);
        const isActive = p.id === activeId;
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={cn(
              "flex items-center gap-2 pl-2 pr-4 py-2 rounded-full border text-[13px] font-semibold transition-all",
              isActive
                ? "border-teal text-teal-dark"
                : "bg-surface border-line text-ink2 hover:bg-bg"
            )}
            style={isActive ? { backgroundColor: pal.bg } : undefined}
          >
            <Avatar name={p.first_name} childIndex={idx} size={26} />
            <span>{p.first_name}</span>
            <span className={cn("text-[11px] font-normal", isActive ? "text-teal-dark/70" : "text-ink3")}>
              {calcAgeShort(p.date_of_birth)}
            </span>
          </button>
        );
      })}
      <button
        onClick={onAdd}
        className="flex items-center gap-1.5 pl-3 pr-4 py-2 rounded-full border border-dashed border-line text-[13px] font-semibold text-ink3 hover:border-teal hover:text-teal-dark hover:bg-bg transition-all"
      >
        <Plus size={14} />
        Agregar hijo
      </button>
    </div>
  );
}

// ─── ChildHeaderCard ──────────────────────────────────────────────────────────

interface ChildHeaderCardProps {
  patient: Patient;
  childIndex: number;
  onSchedule: () => void;
  onUnlink: () => void;
}

function ChildHeaderCard({ patient, childIndex, onSchedule, onUnlink }: ChildHeaderCardProps) {
  const pal = childPalette(childIndex);
  const age = calcAgeFull(patient.date_of_birth);
  const isMale = patient.sex_at_birth === "M";
  const isFemale = patient.sex_at_birth === "F";

  return (
    <div
      className="rounded-[18px] p-6 shadow-card relative overflow-hidden border border-line bg-surface"
    >
      {/* Decorative circle */}
      <div
        className="absolute -top-12 -right-12 w-44 h-44 rounded-full opacity-50 pointer-events-none"
        style={{ backgroundColor: pal.solid }}
      />

      <div className="relative">
        {/* Top row: avatar + identity + unlink */}
        <div className="flex items-start gap-4 mb-5">
          <Avatar name={patient.first_name} childIndex={childIndex} size={64} />
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-[24px] font-semibold text-ink leading-tight truncate">
              {patient.full_name}
            </h2>
            <p className="text-[13px] text-ink3 mt-0.5">{patient.rut || "Sin RUT registrado"}</p>

            {/* Chips row */}
            <div className="flex flex-wrap gap-2 mt-3">
              <Chip color="teal" icon="Baby">
                {age}
              </Chip>
              {(isMale || isFemale) && (
                <Chip color={isMale ? "teal" : "coral"}>
                  {SEX_LABEL[patient.sex_at_birth]}
                </Chip>
              )}
              {patient.blood_type && (
                <Chip color="neutral" icon="Droplet">
                  {patient.blood_type}
                </Chip>
              )}
              {patient.allergies && (
                <Chip color="err" icon="AlertCircle">
                  Alergias
                </Chip>
              )}
            </div>
          </div>

          {/* Unlink */}
          <button
            onClick={onUnlink}
            title="Desvincular"
            className="shrink-0 h-8 w-8 rounded-[10px] flex items-center justify-center text-ink3 hover:text-coral hover:bg-coral/10 transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <StatCell
            label="Nacimiento"
            value={formatDate(patient.date_of_birth)}
            icon={<CalendarDays size={14} className="text-ink3" />}
          />
          <StatCell
            label="Última visita"
            value={formatDate(patient.last_encounter_date)}
            icon={<Stethoscope size={14} className="text-ink3" />}
          />
          <StatCell
            label="Próximo control"
            value={formatDate(patient.next_appointment_date)}
            icon={<Clock size={14} className="text-ink3" />}
          />
          <StatCell
            label="Clasificación"
            value={patient.insurance || "—"}
            icon={<Activity size={14} className="text-ink3" />}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Btn variant="ghost" icon="Bell" size="sm">
            Recordatorio
          </Btn>
          <Btn variant="primary" icon="CalendarDays" size="sm" onClick={onSchedule}>
            Agendar control
          </Btn>
        </div>
      </div>
    </div>
  );
}

function StatCell({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-bg rounded-[12px] px-3 py-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wide text-ink3">{label}</span>
      </div>
      <p className="text-[13px] font-semibold text-ink truncate">{value}</p>
    </div>
  );
}

// ─── ChildTabs ────────────────────────────────────────────────────────────────

interface ChildTabsProps {
  activeTab: TabId;
  onTab: (id: TabId) => void;
  vaccineCount?: number;
  encounterCount?: number;
}

function ChildTabs({ activeTab, onTab, vaccineCount, encounterCount }: ChildTabsProps) {
  const badges: Partial<Record<TabId, number>> = {};
  if (vaccineCount !== undefined) badges.vaccines = vaccineCount;
  if (encounterCount !== undefined) badges.encounters = encounterCount;

  return (
    <div className="flex gap-0 border-b border-line overflow-x-auto">
      {TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        const badge = badges[tab.id];
        return (
          <button
            key={tab.id}
            onClick={() => onTab(tab.id)}
            className={cn(
              "relative flex items-center gap-1.5 px-4 py-3 text-[13px] font-semibold whitespace-nowrap transition-colors",
              isActive ? "text-teal-dark" : "text-ink3 hover:text-ink2"
            )}
          >
            {tab.label}
            {badge !== undefined && badge > 0 && (
              <span
                className={cn(
                  "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold",
                  isActive ? "bg-teal/20 text-teal-dark" : "bg-cream text-ink3"
                )}
              >
                {badge}
              </span>
            )}
            {isActive && (
              <span className="absolute bottom-0 left-4 right-4 h-[2px] rounded-t-full bg-teal-dark" />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Tab: Crecimiento ─────────────────────────────────────────────────────────

interface GrowthTabProps {
  patient: Patient;
  growthData: GrowthPoint[];
}

function GrowthTab({ patient, growthData }: GrowthTabProps) {
  // Merge OMS bands with patient measurements
  const patientPoints = growthData
    .filter((g) => g.age_months !== null && g.weight_kg)
    .map((g) => ({
      age: g.age_months as number,
      weight: parseFloat(g.weight_kg),
    }));

  // Build chart data: merge OMS percentile ages + patient measurement ages
  const allAges = Array.from(
    new Set([
      ...OMS_PERCENTILES.map((o) => o.age),
      ...patientPoints.map((p) => p.age),
    ])
  ).sort((a, b) => a - b);

  const chartData = allAges.map((age) => {
    const oms = OMS_PERCENTILES.find((o) => o.age === age);
    const pt = patientPoints.find((p) => p.age === age);
    return {
      age,
      p3: oms?.p3,
      p15: oms?.p15,
      p50: oms?.p50,
      p85: oms?.p85,
      p97: oms?.p97,
      weight: pt?.weight,
    };
  });

  const lastMeasure = growthData[growthData.length - 1] ?? null;

  return (
    <div className="grid xl:grid-cols-[1fr_300px] gap-5">
      {/* Chart */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[15px] font-bold text-ink">Curva de peso</h3>
            <p className="text-[12px] text-ink3 mt-0.5">
              Percentiles OMS · peso/edad · {patient.sex_at_birth === "F" ? "niñas" : "niños"}
            </p>
          </div>
          <TrendingUp size={18} className="text-teal shrink-0" />
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E6E1" />
              <XAxis
                dataKey="age"
                tick={{ fontSize: 11, fill: "#A0A0A0" }}
                label={{ value: "Edad (meses)", position: "insideBottomRight", offset: -4, fontSize: 10, fill: "#A0A0A0" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#A0A0A0" }}
                label={{ value: "kg", angle: -90, position: "insideLeft", fontSize: 10, fill: "#A0A0A0" }}
              />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: "1px solid #E8E6E1", fontSize: 12 }}
                formatter={(value: unknown, name: unknown) => {
                  if (name === "weight") return [`${value} kg`, "Paciente"];
                  return [`${value} kg`, String(name).toUpperCase()];
                }}
                labelFormatter={(label) => `${label} meses`}
              />
              {/* OMS bands */}
              {(["p3", "p15", "p50", "p85", "p97"] as const).map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={["#C8C8C8", "#B0B0B0", "#909090", "#B0B0B0", "#C8C8C8"][i]}
                  strokeWidth={key === "p50" ? 1.5 : 1}
                  strokeDasharray="4 3"
                  dot={false}
                  connectNulls
                  legendType="none"
                />
              ))}
              {/* Patient line */}
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#4A8590"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#4A8590", strokeWidth: 0 }}
                activeDot={{ r: 6 }}
                connectNulls
                name="weight"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-line">
          <div className="flex items-center gap-1.5 text-[11px] text-ink3">
            <span className="w-6 h-0 border border-dashed border-[#909090] inline-block" />
            Percentiles OMS (P3 P15 P50 P85 P97)
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-teal-dark font-semibold">
            <span className="w-6 h-0.5 bg-teal-dark rounded inline-block" />
            {patient.first_name}
          </div>
        </div>
      </Card>

      {/* Right column */}
      <div className="flex flex-col gap-4">
        {/* Last measurement */}
        <Card>
          <h3 className="text-[13px] font-bold text-ink mb-3">Última medición</h3>
          {lastMeasure ? (
            <div className="space-y-2.5">
              <MeasureRow icon={<Scale size={14} className="text-teal" />} label="Peso" value={`${lastMeasure.weight_kg} kg`} />
              <MeasureRow icon={<Ruler size={14} className="text-teal" />} label="Talla" value={`${lastMeasure.height_cm} cm`} />
              {lastMeasure.head_circumference_cm && (
                <MeasureRow icon={<Activity size={14} className="text-teal" />} label="PC" value={`${lastMeasure.head_circumference_cm} cm`} />
              )}
              {lastMeasure.bmi && (
                <MeasureRow icon={<TrendingUp size={14} className="text-teal" />} label="IMC" value={lastMeasure.bmi} />
              )}
              <p className="text-[11px] text-ink3 pt-1">{formatDate(lastMeasure.encounter_date)}</p>
            </div>
          ) : (
            <p className="text-[13px] text-ink3">Sin mediciones registradas.</p>
          )}
        </Card>

        {/* Indicators */}
        <Card>
          <h3 className="text-[13px] font-bold text-ink mb-3">Indicadores</h3>
          {lastMeasure ? (
            <div className="space-y-2">
              <IndicatorRow
                label="Peso/Edad"
                percentile={lastMeasure.weight_for_age_percentile}
                z={lastMeasure.weight_for_age_z}
              />
              <IndicatorRow
                label="Talla/Edad"
                percentile={lastMeasure.height_for_age_percentile}
                z={lastMeasure.height_for_age_z}
              />
              {lastMeasure.bmi_for_age_z !== null && (
                <IndicatorRow
                  label="IMC/Edad"
                  percentile={lastMeasure.bmi_for_age_percentile}
                  z={lastMeasure.bmi_for_age_z}
                />
              )}
            </div>
          ) : (
            <p className="text-[13px] text-ink3">Sin datos OMS disponibles.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function MeasureRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-[13px] text-ink2">
        {icon}
        {label}
      </div>
      <span className="text-[13px] font-semibold text-ink">{value}</span>
    </div>
  );
}

function IndicatorRow({ label, percentile, z }: { label: string; percentile: number | null | undefined; z: number | null | undefined }) {
  const pct = percentile != null ? Math.round(percentile) : null;
  const zScore = z != null ? z.toFixed(1) : null;
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-ink2">{label}</span>
      <div className="flex items-center gap-1.5">
        {pct !== null && (
          <Chip color={pct < 3 || pct > 97 ? "err" : pct < 15 || pct > 85 ? "mustard" : "sage"}>
            P{pct}
          </Chip>
        )}
        {zScore !== null && (
          <span className="text-ink3">z={zScore}</span>
        )}
        {pct === null && zScore === null && <span className="text-ink3">—</span>}
      </div>
    </div>
  );
}

// ─── Tab: Vacunas ─────────────────────────────────────────────────────────────

interface VaccinesTabProps {
  patientId: number;
}

function VaccinesTab({ patientId }: VaccinesTabProps) {
  const { data, isLoading, isError } = useQuery<VaccineRecord[]>({
    queryKey: ["vaccines", patientId],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<VaccineRecord>>(`/vaccinations/?patient=${patientId}`);
      return data.results;
    },
    retry: false,
  });

  if (isLoading) return <div className="py-8"><Spinner /></div>;

  if (isError || !data) {
    return (
      <EmptyState
        icon="Syringe"
        title="Vacunas no disponibles"
        text="El módulo de vacunación todavía no está activo en tu portal."
      />
    );
  }

  const done = data.filter((v) => v.status === "done").length;
  const total = data.length;

  return (
    <Card padding={false}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-line">
        <div>
          <p className="text-[14px] font-bold text-ink">Carnet de vacunas</p>
          <p className="text-[12px] text-ink3 mt-0.5">
            {done} de {total} aplicadas
          </p>
        </div>
        <Btn variant="ghost" icon="FileText" size="sm">
          Carnet PDF
        </Btn>
      </div>

      {data.length === 0 ? (
        <EmptyState icon="Syringe" title="Sin vacunas registradas" text="Cuando la doctora registre las vacunas aparecerán acá." />
      ) : (
        <ul className="divide-y divide-line">
          {data.map((vaccine) => (
            <VaccineRow key={vaccine.id} vaccine={vaccine} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function VaccineRow({ vaccine }: { vaccine: VaccineRecord }) {
  const icons = {
    done: <Check size={15} className="text-sage-700" />,
    pending: <Clock size={15} className="text-mustard" style={{ color: "#8A6A1F" }} />,
    overdue: <AlertCircle size={15} className="text-coral" style={{ color: "#A85050" }} />,
  };
  const bgMap = {
    done: "rgba(168,201,168,0.30)",
    pending: "rgba(229,184,71,0.28)",
    overdue: "rgba(232,160,160,0.26)",
  };

  return (
    <li className="flex items-center gap-4 px-5 py-3.5 hover:bg-bg/60 transition-colors">
      {/* Status icon */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: bgMap[vaccine.status] }}
      >
        {icons[vaccine.status]}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-ink truncate">{vaccine.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-ink3">{vaccine.recommended_age}</span>
          {vaccine.location_name && (
            <>
              <span className="text-ink3 text-[10px]">·</span>
              <span className="text-[11px] text-ink3">{vaccine.location_name}</span>
            </>
          )}
          {vaccine.administered_at && (
            <>
              <span className="text-ink3 text-[10px]">·</span>
              <span className="text-[11px] text-ink3">{formatDate(vaccine.administered_at)}</span>
            </>
          )}
        </div>
      </div>

      {/* Action */}
      {vaccine.status !== "done" && (
        <Btn variant="ghost" size="sm">
          Agendar
        </Btn>
      )}
    </li>
  );
}

// ─── Tab: Consultas ───────────────────────────────────────────────────────────

interface EncountersTabProps {
  patientId: number;
}

function EncountersTab({ patientId }: EncountersTabProps) {
  const { data, isLoading, isError } = useQuery<Encounter[]>({
    queryKey: ["encounters-tutor", patientId],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Encounter>>(
        `/encounters/?patient=${patientId}`
      );
      return data.results;
    },
    retry: false,
  });

  if (isLoading) return <div className="py-8"><Spinner /></div>;

  if (isError || !data) {
    return (
      <EmptyState
        icon="Stethoscope"
        title="Historial no disponible"
        text="El historial de consultas no está disponible en este momento."
      />
    );
  }

  return (
    <Card padding={false}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-line">
        <div>
          <p className="text-[14px] font-bold text-ink">Historial de consultas</p>
          <p className="text-[12px] text-ink3 mt-0.5">{data.length} {data.length === 1 ? "consulta" : "consultas"}</p>
        </div>
      </div>

      {data.length === 0 ? (
        <EmptyState icon="Stethoscope" title="Sin consultas registradas" text="Las consultas con la doctora aparecerán acá cuando estén registradas." />
      ) : (
        <ul className="divide-y divide-line">
          {data.map((enc) => (
            <EncounterRow key={enc.id} encounter={enc} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function EncounterRow({ encounter }: { encounter: Encounter }) {
  const [expanded, setExpanded] = useState(false);
  const soap = encounter.soap_note;
  const hasSoap = soap && (soap.subjective || soap.objective || soap.assessment || soap.plan);

  return (
    <li className="px-5 py-4 hover:bg-bg/60 transition-colors">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="w-8 h-8 rounded-[10px] bg-teal/10 flex items-center justify-center shrink-0 mt-0.5">
          <Stethoscope size={15} className="text-teal-dark" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="text-[13px] font-semibold text-ink">{encounter.reason_for_visit || "Consulta"}</p>
            <Chip color="neutral">{encounter.encounter_type_display}</Chip>
          </div>
          <p className="text-[11px] text-ink3 mb-1.5">{formatDate(encounter.scheduled_at.split("T")[0])}</p>
          {!expanded && soap?.plan && (
            <p className="text-[12px] text-ink2 line-clamp-2">{soap.plan}</p>
          )}
        </div>

        {/* Action */}
        {hasSoap && (
          <Btn
            variant="ghost"
            size="sm"
            iconRight={expanded ? "ChevronUp" : "ChevronDown"}
            onClick={() => setExpanded(!expanded)}
          >
            Resumen
          </Btn>
        )}
      </div>

      {/* Expanded SOAP note */}
      {expanded && hasSoap && (
        <div className="ml-12 mt-3 bg-bg rounded-[12px] border border-line p-4 space-y-3">
          {soap.subjective && (
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-ink3 mb-0.5">Motivo de consulta</p>
              <p className="text-[12.5px] text-ink leading-relaxed">{soap.subjective}</p>
            </div>
          )}
          {soap.objective && (
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-ink3 mb-0.5">Examen</p>
              <p className="text-[12.5px] text-ink leading-relaxed">{soap.objective}</p>
            </div>
          )}
          {soap.assessment && (
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-ink3 mb-0.5">Evaluación</p>
              <p className="text-[12.5px] text-ink leading-relaxed">{soap.assessment}</p>
            </div>
          )}
          {soap.plan && (
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-ink3 mb-0.5">Plan</p>
              <p className="text-[12.5px] text-ink leading-relaxed">{soap.plan}</p>
            </div>
          )}
          {encounter.diagnoses && encounter.diagnoses.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-ink3 mb-0.5">Diagnósticos</p>
              <div className="flex flex-wrap gap-1.5">
                {encounter.diagnoses.map((d) => (
                  <span key={d.id} className="text-[11px] px-2 py-0.5 rounded-full bg-teal/10 text-teal-dark font-medium">
                    {d.code} — {d.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

// ─── Tab: Datos ───────────────────────────────────────────────────────────────

interface DataTabProps {
  patient: Patient;
}

function DataTab({ patient }: DataTabProps) {
  const navigate = useNavigate();

  return (
    <div className="grid md:grid-cols-2 gap-5">
      {/* Personal data */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-bold text-ink">Datos personales</h3>
        </div>
        <dl className="space-y-3">
          <DataRow label="Nombre completo" value={patient.full_name} />
          <DataRow label="RUT" value={patient.rut || "—"} />
          <DataRow label="Fecha de nacimiento" value={formatDate(patient.date_of_birth)} />
          <DataRow label="Sexo" value={SEX_LABEL[patient.sex_at_birth] ?? "—"} />
          <DataRow label="Grupo sanguíneo" value={patient.blood_type || "—"} />
          <DataRow label="Previsión" value={patient.insurance || "—"} />
        </dl>
        <div className="mt-4 pt-4 border-t border-line">
          <Btn
            variant="ghost"
            size="sm"
            icon="ExternalLink"
            onClick={() => navigate(`/portal/hijos/${patient.id}`)}
          >
            Editar datos
          </Btn>
        </div>
      </Card>

      {/* Medical background */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-bold text-ink">Antecedentes</h3>
        </div>
        <dl className="space-y-3">
          <DataRow
            label="Alergias"
            value={patient.allergies || "Sin alergias conocidas"}
            highlight={!!patient.allergies}
          />
          <DataRow
            label="Condiciones crónicas"
            value={patient.chronic_conditions || "—"}
          />
          <DataRow label="Notas clínicas" value={patient.notes || "—"} />
          {patient.birth_weight_grams && (
            <DataRow label="Peso al nacer" value={`${(patient.birth_weight_grams / 1000).toFixed(2)} kg`} />
          )}
          {patient.birth_length_cm && (
            <DataRow label="Talla al nacer" value={`${patient.birth_length_cm} cm`} />
          )}
          {patient.gestational_weeks && (
            <DataRow label="Semanas gestacionales" value={`${patient.gestational_weeks} sem`} />
          )}
        </dl>
        <div className="mt-4 pt-4 border-t border-line">
          <Btn
            variant="ghost"
            size="sm"
            icon="ExternalLink"
            onClick={() => navigate(`/portal/hijos/${patient.id}`)}
          >
            Actualizar
          </Btn>
        </div>
      </Card>
    </div>
  );
}

function DataRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink3 mb-0.5">{label}</dt>
      <dd className={cn("text-[13px]", highlight ? "text-coral font-semibold" : "text-ink")}>{value}</dd>
    </div>
  );
}

// ─── ChildDetailView ──────────────────────────────────────────────────────────

interface ChildDetailViewProps {
  patient: Patient;
  childIndex: number;
  onUnlink: () => void;
  initialTab?: TabId;
}

function ChildDetailView({ patient, childIndex, onUnlink, initialTab }: ChildDetailViewProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>(initialTab ?? "growth");

  const { data: growthData = [] } = useQuery<GrowthPoint[]>({
    queryKey: ["growth", patient.id],
    queryFn: async () => {
      try {
        const { data } = await api.get<GrowthPoint[]>(`/growth/?patient=${patient.id}`);
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
    retry: false,
  });

  const { data: vaccinesData } = useQuery<VaccineRecord[]>({
    queryKey: ["vaccines", patient.id],
    queryFn: async () => {
      try {
        const { data } = await api.get<PaginatedResponse<VaccineRecord>>(`/vaccinations/?patient=${patient.id}`);
        return data.results ?? [];
      } catch {
        return [];
      }
    },
    retry: false,
  });

  const { data: encountersData } = useQuery<Encounter[]>({
    queryKey: ["encounters-tutor", patient.id],
    queryFn: async () => {
      try {
        const { data } = await api.get<PaginatedResponse<Encounter>>(
          `/encounters/?patient=${patient.id}`
        );
        return data.results ?? [];
      } catch {
        return [];
      }
    },
    retry: false,
  });

  const pendingVaccines = useMemo(
    () => vaccinesData?.filter((v) => v.status !== "done").length,
    [vaccinesData]
  );

  return (
    <div className="space-y-5">
      <ChildHeaderCard
        patient={patient}
        childIndex={childIndex}
        onSchedule={() => navigate("/booking")}
        onUnlink={onUnlink}
      />

      <Card padding={false}>
        <ChildTabs
          activeTab={activeTab}
          onTab={setActiveTab}
          vaccineCount={pendingVaccines}
          encounterCount={encountersData?.length}
        />
        <div className="p-5">
          {activeTab === "growth" && (
            <GrowthTab patient={patient} growthData={growthData} />
          )}
          {activeTab === "vaccines" && <VaccinesTab patientId={patient.id} />}
          {activeTab === "encounters" && <EncountersTab patientId={patient.id} />}
          {activeTab === "data" && <DataTab patient={patient} />}
        </div>
      </Card>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const VALID_TABS: TabId[] = ["growth", "vaccines", "encounters", "data"];

export default function MyChildren() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") as TabId | null;
  const initialTab = tabParam && VALID_TABS.includes(tabParam) ? tabParam : undefined;
  const [showForm, setShowForm] = useState(false);
  const [activeChildId, setActiveChildId] = useState<number | null>(null);
  const [pendingUnlink, setPendingUnlink] = useState<Patient | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["my-patients"],
    queryFn: () =>
      api.get<PaginatedResponse<Patient>>("/patients/").then((r) => r.data),
  });

  const patients = data?.results ?? [];

  // Auto-select first child when list loads
  const resolvedActiveId = useMemo(() => {
    if (activeChildId !== null && patients.some((p) => p.id === activeChildId)) {
      return activeChildId;
    }
    return patients[0]?.id ?? null;
  }, [patients, activeChildId]);

  const activePatient = patients.find((p) => p.id === resolvedActiveId) ?? null;
  const activeIndex = patients.findIndex((p) => p.id === resolvedActiveId);

  const unlinkMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/patients/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-patients"] });
      setPendingUnlink(null);
      setActiveChildId(null);
    },
  });

  return (
    <>
      <div className="max-w-5xl space-y-6">
        {/* Page header */}
        <div>
          <h1 className="font-display text-[28px] font-semibold text-ink mb-1">
            Mis hijos
          </h1>
          <p className="text-[14px] text-ink3">
            Los perfiles vinculados a tu cuenta.
          </p>
        </div>

        {/* Add form */}
        {showForm && (
          <InlinePatientForm
            onSuccess={() => {
              setShowForm(false);
              queryClient.invalidateQueries({ queryKey: ["my-patients"] });
            }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Loading */}
        {isLoading && <Spinner />}

        {/* Empty state */}
        {!isLoading && patients.length === 0 && !showForm && (
          <Card>
            <EmptyState
              icon="Baby"
              title="Todavía no hay perfiles registrados"
              text="Cuando reserves un turno, el perfil del chico va a aparecer acá. O podés agregar uno ahora."
              action={
                <Btn icon="Plus" onClick={() => setShowForm(true)}>
                  Agregar hijo
                </Btn>
              }
            />
          </Card>
        )}

        {/* Switcher + detail */}
        {!isLoading && patients.length > 0 && (
          <>
            <ChildSwitcher
              patients={patients}
              activeId={resolvedActiveId ?? -1}
              onSelect={(id) => {
                setActiveChildId(id);
                setShowForm(false);
              }}
              onAdd={() => setShowForm(true)}
            />

            {activePatient && (
              <ChildDetailView
                key={activePatient.id}
                patient={activePatient}
                childIndex={activeIndex}
                onUnlink={() => setPendingUnlink(activePatient)}
                initialTab={initialTab}
              />
            )}
          </>
        )}
      </div>

      {/* Confirm unlink modal */}
      {pendingUnlink && (
        <ConfirmModal
          patient={pendingUnlink}
          onConfirm={() => unlinkMutation.mutate(pendingUnlink.id)}
          onCancel={() => setPendingUnlink(null)}
          isPending={unlinkMutation.isPending}
        />
      )}
    </>
  );
}
