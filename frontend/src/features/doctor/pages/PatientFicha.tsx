import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Droplets, AlertCircle, FileText, TrendingUp,
  Paperclip, Syringe, ClipboardList, Download, Baby, Users,
  Scale, Ruler, CircleUser, Activity, ChevronRight,
  X, Pencil, Plus, Check, Stethoscope, Video, Thermometer,
  Calendar, Phone, Mail, MapPin, Pill, Trash2, Clock, User,
  FileCheck, Folder,
} from "lucide-react";
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import type {
  Patient, GrowthPoint, PaginatedResponse, Encounter, PatientFile,
} from "@/types/api";

// ─── OMS reference data ─────────────────────────────────────────────────────

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

// ─── Types ───────────────────────────────────────────────────────────────────

type TabKey = "datos" | "antecedentes" | "consultas" | "crecimiento" | "archivos" | "vacunas";

type ChartPoint = {
  ageMonths: number;
  p3?: number; p15?: number; p50?: number; p85?: number; p97?: number;
  patient?: number;
};

type VacunaLocal = {
  id: string; nombre: string; edad: string; fecha: string;
  estado: "aplicada" | "pendiente";
  lote?: string; via?: string; sitio?: string; prof?: string;
};

type SistemaState = { estado: "normal" | "alterado"; nota: string };
type MedRow = { nombre: string; dosis: string; frecuencia: string; duracion: string };

type ConsultaSaveData = {
  tipoId: string;
  motivo: string;
  peso: string;
  talla: string;
  pc: string;
  temp: string;
  sistemas: Record<string, { estado: "normal" | "alterado"; nota: string }>;
  dx: string[];
  indicaciones: string;
  meds: MedRow[];
  prox: string;
  sede: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function encodeText(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
}

function formatAge(patient: Patient): string {
  const { years, months } = patient.age;
  if (years === 0) return `${months} meses`;
  if (months === 0) return `${years} ano${years !== 1 ? "s" : ""}`;
  return `${years} a ${months} m`;
}

function sexLabel(sex: string): string {
  if (sex === "M") return "Masculino";
  if (sex === "F") return "Femenino";
  return "No especifica";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ─── Constants ───────────────────────────────────────────────────────────────

const consultaInput = "w-full px-3 py-2.5 rounded-[10px] bg-bg border border-line text-[13px] text-ink placeholder:text-ink3 focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition";

const TYPE_LABEL: Record<string, string> = {
  FIRST_VISIT: "Primera consulta", FOLLOW_UP: "Control",
  URGENT: "Urgencia", PREVENTIVE: "Preventiva", TELEMEDICINE: "Telemedicina",
};

const CHIP_COLORS: Record<string, { bg: string; text: string }> = {
  teal:     { bg: "rgba(62,142,124,0.12)",  text: "#2D6B5E" },
  lavender: { bg: "rgba(107,86,158,0.12)",  text: "#4C3A7A" },
  coral:    { bg: "rgba(181,96,79,0.12)",   text: "#8B3D2E" },
  ok:       { bg: "rgba(63,131,88,0.12)",   text: "#2A6040" },
  warn:     { bg: "rgba(156,116,35,0.12)",  text: "#7A5A10" },
  neutral:  { bg: "rgba(107,107,107,0.1)",  text: "#4A4A4A" },
};

const METRIC_CONFIG: Record<MetricKey, { label: string; unit: string; title: string }> = {
  weight: { label: "Peso / Edad",  unit: "kg",    title: "Peso / Edad" },
  height: { label: "Talla / Edad", unit: "cm",    title: "Talla / Edad" },
  hc:     { label: "PC / Edad",    unit: "cm",    title: "Perimetro Cefalico / Edad" },
  bmi:    { label: "IMC / Edad",   unit: "kg/m2", title: "IMC / Edad" },
};

const INDICATOR_CONFIG: Record<MetricKey, {
  percentileKey: keyof GrowthPoint; zKey: keyof GrowthPoint; label: string;
}> = {
  weight: { percentileKey: "weight_for_age_percentile", zKey: "weight_for_age_z", label: "peso/edad" },
  height: { percentileKey: "height_for_age_percentile", zKey: "height_for_age_z", label: "talla/edad" },
  hc:     { percentileKey: "head_circumference_for_age_percentile", zKey: "head_circumference_for_age_z", label: "PC/edad" },
  bmi:    { percentileKey: "bmi_for_age_percentile", zKey: "bmi_for_age_z", label: "IMC/edad" },
};

const TIPO_CHIP_COLORS: Record<string, { bg: string; text: string }> = {
  PREVENTIVE:   { bg: "rgba(125,211,192,0.20)", text: "#3E8E7C" },
  FOLLOW_UP:    { bg: "rgba(125,211,192,0.20)", text: "#3E8E7C" },
  FIRST_VISIT:  { bg: "rgba(199,184,232,0.30)", text: "#6B569E" },
  URGENT:       { bg: "rgba(244,168,154,0.25)", text: "#B5604F" },
  TELEMEDICINE: { bg: "rgba(244,168,154,0.25)", text: "#B5604F" },
};

const SISTEMAS = [
  { id: "general", label: "Estado general" },
  { id: "piel",    label: "Piel y mucosas" },
  { id: "orl",     label: "Oidos, nariz y garganta" },
  { id: "cardio",  label: "Cardiopulmonar" },
  { id: "abdomen", label: "Abdomen" },
  { id: "neuro",   label: "Neurologico" },
];

const DX_SUGERIDOS = [
  "Control sano normal", "Faringitis aguda", "Otitis media aguda", "Bronquiolitis",
  "Resfrio comun", "Gastroenteritis aguda", "Dermatitis atopica", "Sindrome febril",
];

const PROX_CONTROL = ["1 mes", "3 meses", "6 meses", "12 meses", "Segun evolucion"];

const TIPOS_CONSULTA = [
  { id: "control", label: "Control sano" },
  { id: "consulta", label: "Consulta" },
  { id: "online", label: "Telemedicina" },
];

const TIPO_TO_ENCOUNTER: Record<string, string> = {
  control: "WELL_CHILD_VISIT",
  consulta: "CONSULTATION",
  online: "CONSULTATION",
};

const FICHA_VACUNAS_SEED: VacunaLocal[] = [
  { id: "v1", nombre: "BCG", edad: "Recien nacido", fecha: "15 dic 2022", estado: "aplicada", lote: "BCG-4471", via: "Intradermica", sitio: "Brazo derecho", prof: "Matrona" },
  { id: "v2", nombre: "Hexavalente (1a dosis)", edad: "2 meses", fecha: "18 feb 2023", estado: "aplicada", lote: "HEX-8821", via: "Intramuscular", sitio: "Muslo izquierdo", prof: "Enf. CESFAM" },
  { id: "v3", nombre: "Neumococica (1a)", edad: "2 meses", fecha: "18 feb 2023", estado: "aplicada", lote: "PCV-2231", via: "Intramuscular", sitio: "Muslo derecho", prof: "Enf. CESFAM" },
  { id: "v4", nombre: "Hexavalente (2a dosis)", edad: "4 meses", fecha: "20 abr 2023", estado: "aplicada", lote: "HEX-9014", via: "Intramuscular", sitio: "Muslo izquierdo", prof: "Enf. CESFAM" },
  { id: "v5", nombre: "Hexavalente (3a dosis)", edad: "6 meses", fecha: "22 jun 2023", estado: "aplicada", lote: "HEX-1180", via: "Intramuscular", sitio: "Muslo derecho", prof: "Dra. Estefi" },
  { id: "v6", nombre: "Tres virica (SRP)", edad: "12 meses", fecha: "18 dic 2023", estado: "aplicada", lote: "SRP-5567", via: "Subcutanea", sitio: "Brazo izquierdo", prof: "Dra. Estefi" },
  { id: "v7", nombre: "Hepatitis A", edad: "18 meses", fecha: "20 jun 2024", estado: "aplicada", lote: "HEP-3390", via: "Intramuscular", sitio: "Brazo derecho", prof: "Dra. Estefi" },
  { id: "v8", nombre: "DTP refuerzo", edad: "4 anos", fecha: "Pendiente", estado: "pendiente" },
  { id: "v9", nombre: "Tres virica (2a dosis)", edad: "4 anos", fecha: "Pendiente", estado: "pendiente" },
];

// ─── Small UI components ─────────────────────────────────────────────────────

function FichaChip({ color = "neutral", icon, children }: {
  color?: keyof typeof CHIP_COLORS; icon?: React.ReactNode; children: React.ReactNode;
}) {
  const { bg, text } = CHIP_COLORS[color] ?? CHIP_COLORS.neutral;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-semibold"
      style={{ background: bg, color: text }}>
      {icon}{children}
    </span>
  );
}

function MeasurementRow({ icon, iconBg, iconColor, label, value, unit, hint }: {
  icon: React.ReactNode; iconBg: string; iconColor: string;
  label: string; value: string | null; unit: string; hint?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0"
        style={{ background: iconBg, color: iconColor }}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[11.5px] text-ink3 font-medium">{label}</p>
        <p className="text-[16px] font-bold text-ink leading-tight">
          {value ?? "\u2014"}
          {value && <span className="text-[11px] font-normal text-ink3 ml-1">{unit}</span>}
        </p>
        {hint && <p className="text-[10.5px] text-ink3">{hint}</p>}
      </div>
    </div>
  );
}

function DataRow({ label, value, half }: { label: string; value: string; half?: boolean }) {
  return (
    <div className={half ? "" : "col-span-2"}>
      <div className="text-[11px] text-ink3 font-medium">{label}</div>
      <div className="text-[13.5px] text-ink font-semibold mt-0.5">{value}</div>
    </div>
  );
}

function EditRow({ label, value, onChange, half, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; half?: boolean; placeholder?: string;
}) {
  return (
    <div className={half ? "" : "col-span-2"}>
      <div className="text-[11px] text-ink3 font-medium mb-1">{label}</div>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 rounded-[9px] bg-bg border border-line text-[13px] text-ink focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition" />
    </div>
  );
}

function EditField({ label, value, onChange, options, half }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; half?: boolean;
}) {
  return (
    <div className={half ? "" : "col-span-2"}>
      <div className="text-[11px] text-ink3 font-medium mb-1">{label}</div>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-[9px] bg-bg border border-line text-[13px] text-ink focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition">
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

function EditList({ items, onChange, placeholder }: {
  items: string[]; onChange: (v: string[]) => void; placeholder: string;
}) {
  const [val, setVal] = useState("");
  const add = () => { const v = val.trim(); if (v) { onChange([...items, v]); setVal(""); } };
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {items.map((it, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg border border-line text-[12px] font-medium text-ink2">
            {it}
            <button onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="hover:text-[#A85050] transition"><X size={11} /></button>
          </span>
        ))}
        {items.length === 0 && <span className="text-[12px] text-ink3 italic">Sin registros</span>}
      </div>
      <div className="flex gap-2">
        <input value={val} onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder} className={consultaInput} />
        <button onClick={add} className="shrink-0 px-3 rounded-[9px] bg-teal-dark text-white hover:opacity-90 transition focus-ring">
          <Plus size={15} />
        </button>
      </div>
    </div>
  );
}

function SectionTitle({ icon, n, children, hint }: {
  icon: React.ReactNode; n: string | number; children: React.ReactNode; hint?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <span className="w-7 h-7 rounded-[8px] bg-teal/15 text-teal-dark flex items-center justify-center shrink-0 text-[11px] font-bold">{n}</span>
      <div>
        <h4 className="text-[13.5px] font-bold text-ink leading-tight inline-flex items-center gap-1.5">
          {icon}{children}
        </h4>
        {hint && <p className="text-[11px] text-ink3 mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}

function Vital({ icon, label, value, onChange, unit, placeholder }: {
  icon: React.ReactNode; label: string; value: string; onChange: (v: string) => void;
  unit?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-ink2 flex items-center gap-1 mb-1">{icon}{label}</label>
      <div className="relative">
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          inputMode="decimal" className={consultaInput + " pr-10"} />
        {unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-ink3 font-medium">{unit}</span>}
      </div>
    </div>
  );
}

function ConsultaTipoChip({ tipo }: { tipo: string }) {
  const s = TIPO_CHIP_COLORS[tipo] ?? TIPO_CHIP_COLORS.FIRST_VISIT;
  return (
    <span className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold"
      style={{ background: s.bg, color: s.text }}>
      {TYPE_LABEL[tipo] ?? tipo}
    </span>
  );
}

function getFileIcon(fileType: string) {
  switch (fileType) {
    case "LAB_RESULT":   return { Icon: Activity,  bg: "rgba(244,168,154,0.25)", color: "#B5604F" };
    case "IMAGE":        return { Icon: Folder,    bg: "rgba(199,184,232,0.28)", color: "#6B569E" };
    case "PRESCRIPTION": return { Icon: FileCheck, bg: "rgba(125,211,192,0.20)", color: "#3E8E7C" };
    case "CERTIFICATE":  return { Icon: FileText,  bg: "rgba(245,212,160,0.45)", color: "#9C7423" };
    default:             return { Icon: FileText,  bg: "#F2F1EC",                color: "#6B6B6B" };
  }
}

// ─── ConsultaHistRow ─────────────────────────────────────────────────────────

function ConsultaHistRow({ encounter, isNew, onOpen }: {
  encounter: Encounter; isNew?: boolean; onOpen: (e: Encounter) => void;
}) {
  const dateStr = formatDate(encounter.scheduled_at);
  const TypeIcon = encounter.encounter_type === "PREVENTIVE" || encounter.encounter_type === "FOLLOW_UP"
    ? Stethoscope : encounter.encounter_type === "TELEMEDICINE" ? Video : ClipboardList;

  return (
    <button onClick={() => onOpen(encounter)}
      className={cn("w-full text-left px-5 py-4 transition hover:bg-bg focus-ring", isNew && "bg-teal/5")}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-[10px] bg-bg flex items-center justify-center shrink-0 text-teal-dark">
          <TypeIcon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-bold text-ink">{dateStr}</span>
            <ConsultaTipoChip tipo={encounter.encounter_type} />
            {isNew && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-ok/40 text-[#3F8358]">NUEVA</span>}
          </div>
          {encounter.reason_for_visit && (
            <div className="text-[12.5px] text-ink2 mt-1.5 leading-relaxed">{encounter.reason_for_visit}</div>
          )}
          {encounter.diagnoses && encounter.diagnoses.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {encounter.diagnoses.map((d) => (
                <span key={d.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-lavender/20 text-[#6B569E] text-[10.5px] font-semibold">
                  <ClipboardList size={10} />{d.code ? `${d.code} ${d.description}` : d.description}
                </span>
              ))}
            </div>
          )}
        </div>
        <span className="text-ink3 shrink-0 mt-1"><ChevronRight size={16} /></span>
      </div>
    </button>
  );
}

// ─── ConsultaDetalle drawer ──────────────────────────────────────────────────

function ConsultaDetalle({ encounter, patientName, onClose }: {
  encounter: Encounter; patientName: string; onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const dateStr = formatDate(encounter.scheduled_at);
  const soap = encounter.soap_note;
  const hasSoap = !!soap && (soap.subjective || soap.objective || soap.assessment || soap.plan);

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-ink/25 backdrop-blur-sm" onClick={onClose}
        style={{ animation: "consultaFade 180ms ease-out" }} />
      <div className="relative h-full w-full max-w-[520px] bg-bg shadow-pop flex flex-col"
        style={{ animation: "consultaIn 280ms cubic-bezier(0.22,1,0.36,1)" }}>
        {/* Header */}
        <div className="shrink-0 bg-surface border-b border-line px-6 py-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] uppercase tracking-[0.12em] font-bold text-teal-dark">Resumen de consulta</span>
              <ConsultaTipoChip tipo={encounter.encounter_type} />
            </div>
            <h3 className="text-[17px] font-bold text-ink leading-tight mt-1">{dateStr}</h3>
            <div className="text-[11.5px] text-ink3 mt-0.5">{patientName} &middot; Dra. Estefi</div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-[10px] bg-bg border border-line flex items-center justify-center text-ink2 hover:bg-line/50 transition shrink-0 focus-ring">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {encounter.reason_for_visit && (
            <section>
              <h4 className="text-[11px] uppercase tracking-[0.12em] font-bold text-ink3 flex items-center gap-1.5">
                <ClipboardList size={13} />Motivo de consulta
              </h4>
              <p className="mt-2 text-[13.5px] text-ink leading-relaxed">{encounter.reason_for_visit}</p>
            </section>
          )}

          {encounter.anthropometry && (
            <section>
              <h4 className="text-[11px] uppercase tracking-[0.12em] font-bold text-ink3 flex items-center gap-1.5">
                <Scale size={13} />Antropometria
              </h4>
              <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[13px]">
                {encounter.anthropometry.weight_kg && (
                  <div><span className="text-ink3">Peso:</span> <span className="text-ink font-medium">{encounter.anthropometry.weight_kg} kg</span></div>
                )}
                {encounter.anthropometry.height_cm && (
                  <div><span className="text-ink3">Talla:</span> <span className="text-ink font-medium">{encounter.anthropometry.height_cm} cm</span></div>
                )}
                {encounter.anthropometry.head_circumference_cm && (
                  <div><span className="text-ink3">P. craneal:</span> <span className="text-ink font-medium">{encounter.anthropometry.head_circumference_cm} cm</span></div>
                )}
                {encounter.anthropometry.bmi && (
                  <div><span className="text-ink3">IMC:</span> <span className="text-ink font-medium">{encounter.anthropometry.bmi} kg/m²</span></div>
                )}
              </div>
            </section>
          )}

          {hasSoap && (
            <>
              {soap!.subjective && (
                <section>
                  <h4 className="text-[11px] uppercase tracking-[0.12em] font-bold text-ink3 flex items-center gap-1.5">
                    <ClipboardList size={13} />S &mdash; Subjetivo
                  </h4>
                  <p className="mt-2 text-[13px] text-ink2 leading-relaxed">{soap!.subjective}</p>
                </section>
              )}
              {soap!.objective && (
                <section>
                  <h4 className="text-[11px] uppercase tracking-[0.12em] font-bold text-ink3 flex items-center gap-1.5">
                    <Stethoscope size={13} />O &mdash; Objetivo
                  </h4>
                  <p className="mt-2 text-[13px] text-ink2 leading-relaxed">{soap!.objective}</p>
                </section>
              )}
              {soap!.assessment && (
                <section>
                  <h4 className="text-[11px] uppercase tracking-[0.12em] font-bold text-ink3 flex items-center gap-1.5">
                    <ClipboardList size={13} />A &mdash; Evaluacion
                  </h4>
                  <p className="mt-2 text-[13px] text-ink2 leading-relaxed">{soap!.assessment}</p>
                </section>
              )}
              {soap!.plan && (
                <section>
                  <h4 className="text-[11px] uppercase tracking-[0.12em] font-bold text-ink3 flex items-center gap-1.5">
                    <FileText size={13} />P &mdash; Plan
                  </h4>
                  <p className="mt-2 text-[13px] text-ink2 leading-relaxed">{soap!.plan}</p>
                </section>
              )}
            </>
          )}

          {encounter.diagnoses && encounter.diagnoses.length > 0 && (
            <section>
              <h4 className="text-[11px] uppercase tracking-[0.12em] font-bold text-ink3 flex items-center gap-1.5">
                <ClipboardList size={13} />Diagnostico
              </h4>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {encounter.diagnoses.map((d) => (
                  <span key={d.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-lavender/25 text-[#6B569E] text-[12px] font-semibold">
                    <ClipboardList size={11} />{d.code ? `${d.code} ${d.description}` : d.description}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 bg-surface border-t border-line px-6 py-3.5 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2.5 rounded-[10px] text-[12.5px] font-semibold text-ink2 hover:bg-bg transition focus-ring">Cerrar</button>
          <button
            onClick={() => {
              const soap = encounter.soap_note;
              const anthro = encounter.anthropometry;
              const dx = encounter.diagnoses;
              const sections: string[] = [];
              sections.push(`<h1>Consulta — ${encodeText(patientName)}</h1>`);
              sections.push(`<p><strong>Fecha:</strong> ${encodeText(dateStr)}</p>`);
              if (encounter.reason_for_visit) sections.push(`<h2>Motivo</h2><p>${encodeText(encounter.reason_for_visit)}</p>`);
              if (anthro) {
                const parts: string[] = [];
                if (anthro.weight_kg) parts.push(`Peso: ${anthro.weight_kg} kg`);
                if (anthro.height_cm) parts.push(`Talla: ${anthro.height_cm} cm`);
                if (anthro.head_circumference_cm) parts.push(`PC: ${anthro.head_circumference_cm} cm`);
                if (anthro.bmi) parts.push(`IMC: ${anthro.bmi} kg/m²`);
                if (parts.length) sections.push(`<h2>Antropometría</h2><p>${parts.join(" · ")}</p>`);
              }
              if (soap?.subjective) sections.push(`<h2>S — Subjetivo</h2><p>${encodeText(soap.subjective)}</p>`);
              if (soap?.objective) sections.push(`<h2>O — Objetivo</h2><p>${encodeText(soap.objective)}</p>`);
              if (soap?.assessment) sections.push(`<h2>A — Evaluación</h2><p>${encodeText(soap.assessment)}</p>`);
              if (soap?.plan) sections.push(`<h2>P — Plan</h2><p>${encodeText(soap.plan)}</p>`);
              if (dx?.length) sections.push(`<h2>Diagnóstico</h2><p>${dx.map((d) => encodeText(d.description)).join(", ")}</p>`);
              sections.push(`<p style="margin-top:40px;font-size:12px;color:#999">Pediacore — Dra. Estefanía Ortigosa</p>`);

              const blob = new Blob([
                `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Consulta</title>` +
                `<style>body{font-family:system-ui,sans-serif;max-width:700px;margin:40px auto;color:#2C2C2C;line-height:1.6}` +
                `h1{font-size:18px;border-bottom:2px solid #7DD3C0;padding-bottom:8px}h2{font-size:14px;color:#6B6B6B;margin-top:20px}</style>` +
                `</head><body>${sections.join("")}</body></html>`,
              ], { type: "text/html" });
              const url = URL.createObjectURL(blob);
              const printWin = window.open(url, "_blank");
              if (printWin) {
                printWin.onload = () => { printWin.print(); URL.revokeObjectURL(url); };
              }
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[10px] bg-surface border border-line text-[12.5px] font-semibold text-ink2 hover:bg-bg transition focus-ring"
          >
            <Download size={14} /> Descargar PDF
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── VacunaPanel drawer ──────────────────────────────────────────────────────

function VacunaPanel({ vacuna, isNew, patientName, onClose, onRegistrar }: {
  vacuna: VacunaLocal; isNew: boolean; patientName: string;
  onClose: () => void; onRegistrar: (data: VacunaLocal, isNew: boolean) => void;
}) {
  const aplicada = !isNew && vacuna.estado === "aplicada";
  const [form, setForm] = useState({
    nombre: isNew ? "" : vacuna.nombre,
    fecha: new Date().toLocaleDateString("es-CL"),
    lote: "", via: "Intramuscular", sitio: "Muslo izquierdo",
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const canSave = form.nombre.trim() && form.fecha.trim();
  const VIAS = ["Intramuscular", "Subcutanea", "Intradermica", "Oral"];
  const SITIOS = ["Muslo izquierdo", "Muslo derecho", "Brazo izquierdo", "Brazo derecho"];

  const DetailRow = ({ label, val, ic }: { label: string; val: string; ic: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-[12px] text-ink2 inline-flex items-center gap-2">{ic}{label}</span>
      <span className="text-[12.5px] font-semibold text-ink text-right">{val}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-ink/25 backdrop-blur-sm" onClick={onClose}
        style={{ animation: "consultaFade 180ms ease-out" }} />
      <div className="relative h-full w-full max-w-[460px] bg-bg shadow-pop flex flex-col"
        style={{ animation: "consultaIn 280ms cubic-bezier(0.22,1,0.36,1)" }}>
        <div className="shrink-0 bg-surface border-b border-line px-6 py-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.12em] font-bold text-teal-dark">
              {aplicada ? "Vacuna aplicada" : isNew ? "Registrar vacuna" : "Registrar aplicacion"}
            </div>
            <h3 className="text-[17px] font-bold text-ink leading-tight mt-1 truncate">
              {isNew ? "Nueva vacuna" : vacuna.nombre}
            </h3>
            <div className="text-[11.5px] text-ink3 mt-0.5">{patientName}{!isNew && vacuna.edad ? ` \u00b7 ${vacuna.edad}` : ""}</div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-[10px] bg-bg border border-line flex items-center justify-center text-ink2 hover:bg-line/50 transition shrink-0 focus-ring">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {aplicada ? (
            <>
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-[12px] bg-ok/20 border border-ok/40 mb-5">
                <div className="w-8 h-8 rounded-full bg-ok/50 flex items-center justify-center text-[#3F8358]"><Check size={16} /></div>
                <div>
                  <div className="text-[12.5px] font-bold text-ink">Aplicada el {vacuna.fecha}</div>
                  <div className="text-[11px] text-ink3">Registrada en el carne PNI</div>
                </div>
              </div>
              <div className="bg-surface border border-line rounded-[12px] px-4 divide-y divide-line/70">
                <DetailRow label="Vacuna" val={vacuna.nombre} ic={<Syringe size={13} className="text-teal-dark" />} />
                <DetailRow label="Edad" val={vacuna.edad} ic={<Baby size={13} className="text-teal-dark" />} />
                <DetailRow label="Fecha" val={vacuna.fecha} ic={<Calendar size={13} className="text-teal-dark" />} />
                <DetailRow label="Lote" val={vacuna.lote ?? "\u2014"} ic={<ClipboardList size={13} className="text-teal-dark" />} />
                <DetailRow label="Via" val={vacuna.via ?? "\u2014"} ic={<Pill size={13} className="text-teal-dark" />} />
                <DetailRow label="Sitio" val={vacuna.sitio ?? "\u2014"} ic={<MapPin size={13} className="text-teal-dark" />} />
                <DetailRow label="Profesional" val={vacuna.prof ?? "\u2014"} ic={<CircleUser size={13} className="text-teal-dark" />} />
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {isNew && (
                <div>
                  <label className="text-[11.5px] font-semibold text-ink2">Vacuna</label>
                  <input value={form.nombre} onChange={set("nombre")} placeholder="Ej: Influenza" className={"mt-1.5 " + consultaInput} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11.5px] font-semibold text-ink2">Fecha de aplicacion</label>
                  <input value={form.fecha} onChange={set("fecha")} className={"mt-1.5 " + consultaInput} />
                </div>
                <div>
                  <label className="text-[11.5px] font-semibold text-ink2">Lote</label>
                  <input value={form.lote} onChange={set("lote")} placeholder="Ej: HEX-1180" className={"mt-1.5 " + consultaInput} />
                </div>
              </div>
              <div>
                <label className="text-[11.5px] font-semibold text-ink2">Via de administracion</label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {VIAS.map((v) => (
                    <button key={v} onClick={() => setForm((f) => ({ ...f, via: v }))}
                      className={cn("px-3 py-1.5 rounded-full text-[11.5px] font-semibold border transition",
                        form.via === v ? "bg-teal-dark text-white border-teal-dark" : "bg-surface text-ink2 border-line hover:bg-bg")}>{v}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11.5px] font-semibold text-ink2">Sitio de puncion</label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {SITIOS.map((s) => (
                    <button key={s} onClick={() => setForm((f) => ({ ...f, sitio: s }))}
                      className={cn("px-3 py-1.5 rounded-full text-[11.5px] font-semibold border transition",
                        form.sitio === s ? "bg-teal/20 border-teal/40 text-teal-dark" : "bg-surface text-ink2 border-line hover:bg-bg")}>{s}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 bg-surface border-t border-line px-6 py-3.5 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2.5 rounded-[10px] text-[12.5px] font-semibold text-ink2 hover:bg-bg transition focus-ring">
            {aplicada ? "Cerrar" : "Cancelar"}
          </button>
          {aplicada ? (
            <button onClick={onClose} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[10px] bg-surface border border-line text-[12.5px] font-semibold text-ink2 hover:bg-bg transition focus-ring">
              <Download size={14} /> Carne PDF
            </button>
          ) : (
            <button disabled={!canSave}
              onClick={() => onRegistrar({ ...vacuna, ...form, estado: "aplicada" }, isNew)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-[10px] bg-teal-dark text-white text-[12.5px] font-semibold hover:opacity-90 transition shadow-soft focus-ring disabled:opacity-40 disabled:cursor-not-allowed">
              <Check size={15} /> Registrar aplicacion
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── NuevaConsulta drawer ────────────────────────────────────────────────────

function NuevaConsulta({ patientName, patientAge, patientRut, onClose, onSave, saving }: {
  patientName: string; patientAge: string; patientRut: string;
  onClose: () => void;
  onSave: (data: ConsultaSaveData) => void;
  saving: boolean;
}) {
  const [tipo, setTipo] = useState("control");
  const [sede, setSede] = useState("Pucón");
  const [motivo, setMotivo] = useState("");
  const [peso, setPeso] = useState("");
  const [talla, setTalla] = useState("");
  const [pc, setPc] = useState("");
  const [temp, setTemp] = useState("");
  const [sistemas, setSistemas] = useState<Record<string, SistemaState>>(() =>
    Object.fromEntries(SISTEMAS.map((s) => [s.id, { estado: "normal" as const, nota: "" }]))
  );
  const [dx, setDx] = useState<string[]>([]);
  const [dxInput, setDxInput] = useState("");
  const [indicaciones, setIndicaciones] = useState("");
  const [meds, setMeds] = useState<MedRow[]>([{ nombre: "", dosis: "", frecuencia: "", duracion: "" }]);
  const [prox, setProx] = useState("3 meses");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const imc = (() => {
    const w = parseFloat(peso), h = parseFloat(talla);
    if (!w || !h) return null;
    return (w / Math.pow(h / 100, 2)).toFixed(1);
  })();

  const toggleSistema = (id: string) => setSistemas((s) => ({
    ...s, [id]: { ...s[id], estado: s[id].estado === "normal" ? "alterado" : "normal" },
  }));
  const setNota = (id: string, nota: string) => setSistemas((s) => ({ ...s, [id]: { ...s[id], nota } }));

  const addDx = (d: string) => { const v = d.trim(); if (v && !dx.includes(v)) setDx([...dx, v]); setDxInput(""); };
  const removeDx = (d: string) => setDx(dx.filter((x) => x !== d));

  const setMed = (i: number, field: keyof MedRow, val: string) =>
    setMeds((m) => m.map((row, idx) => idx === i ? { ...row, [field]: val } : row));
  const addMed = () => setMeds((m) => [...m, { nombre: "", dosis: "", frecuencia: "", duracion: "" }]);
  const removeMed = (i: number) => setMeds((m) => m.length > 1 ? m.filter((_, idx) => idx !== i) : m);

  const canSave = motivo.trim().length > 0 || dx.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink/25 backdrop-blur-sm" onClick={onClose}
        style={{ animation: "consultaFade 180ms ease-out" }} />
      <div className="relative h-full w-full max-w-[600px] bg-bg shadow-pop flex flex-col"
        style={{ animation: "consultaIn 280ms cubic-bezier(0.22,1,0.36,1)" }}>
        {/* Header */}
        <div className="shrink-0 bg-surface border-b border-line px-6 py-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-teal to-lavender flex items-center justify-center text-white text-[16px] font-bold shrink-0">
              {patientName.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.12em] font-bold text-teal-dark">Nueva consulta</div>
              <h3 className="text-[16px] font-bold text-ink leading-tight truncate">{patientName}</h3>
              <div className="text-[11.5px] text-ink3">{patientAge} &middot; RUT {patientRut}</div>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-[10px] bg-bg border border-line flex items-center justify-center text-ink2 hover:bg-line/50 transition shrink-0 focus-ring">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">
          {/* Tipo / sede */}
          <div className="grid grid-cols-1 sm:grid-cols-[1.4fr_1fr] gap-3">
            <div>
              <label className="text-[11px] font-semibold text-ink2 mb-1.5 block">Tipo de consulta</label>
              <div className="inline-flex p-1 rounded-[10px] bg-surface border border-line w-full">
                {TIPOS_CONSULTA.map((t) => (
                  <button key={t.id} onClick={() => setTipo(t.id)}
                    className={cn("flex-1 px-2 py-1.5 rounded-[7px] text-[11.5px] font-semibold transition",
                      tipo === t.id ? "bg-teal-dark text-white shadow-soft" : "text-ink2 hover:bg-bg")}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-ink2 mb-1.5 block">Sede</label>
              <select value={sede} onChange={(e) => setSede(e.target.value)} className={consultaInput}>
                <option>Pucón</option><option>Villarrica</option><option>Online</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11.5px] text-ink3 -mt-3">
            <Calendar size={12} />Hoy &middot; {new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
          </div>

          {/* 1. Motivo */}
          <div>
            <SectionTitle icon={<ClipboardList size={14} className="text-ink3" />} n="1">Motivo de consulta</SectionTitle>
            <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)}
              placeholder="Sintomas, duracion, antecedentes del episodio..."
              className={consultaInput + " h-[80px] resize-none"} />
          </div>

          {/* 2. Antropometria */}
          <div>
            <SectionTitle icon={<Scale size={14} className="text-ink3" />} n="2" hint="Se calcula el IMC automaticamente.">Antropometria y signos</SectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Vital icon={<Scale size={11} className="text-ink3" />} label="Peso" value={peso} onChange={setPeso} unit="kg" placeholder="14.2" />
              <Vital icon={<Ruler size={11} className="text-ink3" />} label="Talla" value={talla} onChange={setTalla} unit="cm" placeholder="98.5" />
              <Vital icon={<CircleUser size={11} className="text-ink3" />} label="P. craneal" value={pc} onChange={setPc} unit="cm" placeholder="50.1" />
              <Vital icon={<Thermometer size={11} className="text-ink3" />} label="Temp." value={temp} onChange={setTemp} unit="\u00b0C" placeholder="36.8" />
            </div>
            {imc && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-teal/15 text-teal-dark text-[12px] font-semibold">
                <Activity size={13} />IMC calculado: {imc} kg/m\u00b2
              </div>
            )}
          </div>

          {/* 3. Examen fisico */}
          <div>
            <SectionTitle icon={<Stethoscope size={14} className="text-ink3" />} n="3" hint="Marca los sistemas alterados y agrega el detalle.">Examen fisico</SectionTitle>
            <div className="space-y-2">
              {SISTEMAS.map((s) => {
                const st = sistemas[s.id];
                const alterado = st.estado === "alterado";
                return (
                  <div key={s.id} className={cn("rounded-[10px] border transition", alterado ? "border-coral/50 bg-coral/5" : "border-line bg-surface")}>
                    <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                      <span className="text-[12.5px] font-semibold text-ink">{s.label}</span>
                      <button onClick={() => toggleSistema(s.id)} className="inline-flex p-0.5 rounded-[7px] bg-bg border border-line">
                        <span className={cn("px-2.5 py-1 rounded-[5px] text-[11px] font-semibold transition", !alterado ? "bg-ok/40 text-[#3F8358]" : "text-ink3")}>Normal</span>
                        <span className={cn("px-2.5 py-1 rounded-[5px] text-[11px] font-semibold transition", alterado ? "bg-coral/40 text-[#B5604F]" : "text-ink3")}>Alterado</span>
                      </button>
                    </div>
                    {alterado && (
                      <div className="px-3.5 pb-3">
                        <input value={st.nota} onChange={(e) => setNota(s.id, e.target.value)}
                          placeholder={`Hallazgos en ${s.label.toLowerCase()}...`} className={consultaInput} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Diagnostico */}
          <div>
            <SectionTitle icon={<ClipboardList size={14} className="text-ink3" />} n="4">Diagnostico</SectionTitle>
            {dx.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {dx.map((d) => (
                  <span key={d} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-lavender/25 text-[#6B569E] text-[11.5px] font-semibold">
                    {d}
                    <button onClick={() => removeDx(d)} className="hover:text-ink transition"><X size={11} /></button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input value={dxInput} onChange={(e) => setDxInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDx(dxInput); } }}
                placeholder="Escribir diagnostico y Enter..." className={consultaInput} />
              <button onClick={() => addDx(dxInput)} className="shrink-0 px-3 rounded-[10px] bg-teal-dark text-white hover:opacity-90 transition focus-ring">
                <Plus size={16} />
              </button>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {DX_SUGERIDOS.filter((d) => !dx.includes(d)).map((d) => (
                <button key={d} onClick={() => addDx(d)}
                  className="px-2.5 py-1 rounded-full bg-surface border border-line text-[11px] font-medium text-ink2 hover:bg-bg hover:border-teal/40 transition">
                  + {d}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Indicaciones */}
          <div>
            <SectionTitle icon={<FileText size={14} className="text-ink3" />} n="5">Indicaciones</SectionTitle>
            <textarea value={indicaciones} onChange={(e) => setIndicaciones(e.target.value)}
              placeholder="Plan, reposo, hidratacion, signos de alarma..."
              className={consultaInput + " h-[80px] resize-none"} />
          </div>

          {/* 6. Receta */}
          <div>
            <SectionTitle icon={<Pill size={14} className="text-ink3" />} n="6" hint="Agrega los medicamentos prescritos.">Receta</SectionTitle>
            <div className="space-y-2">
              {meds.map((m, i) => (
                <div key={i} className="grid grid-cols-[1.4fr_1fr_1fr_0.9fr_auto] gap-1.5 items-center">
                  <input value={m.nombre} onChange={(e) => setMed(i, "nombre", e.target.value)} placeholder="Medicamento" className={consultaInput + " !px-2.5 !py-2 !text-[12px]"} />
                  <input value={m.dosis} onChange={(e) => setMed(i, "dosis", e.target.value)} placeholder="Dosis" className={consultaInput + " !px-2.5 !py-2 !text-[12px]"} />
                  <input value={m.frecuencia} onChange={(e) => setMed(i, "frecuencia", e.target.value)} placeholder="Frecuencia" className={consultaInput + " !px-2.5 !py-2 !text-[12px]"} />
                  <input value={m.duracion} onChange={(e) => setMed(i, "duracion", e.target.value)} placeholder="Dias" className={consultaInput + " !px-2.5 !py-2 !text-[12px]"} />
                  <button onClick={() => removeMed(i)} className="w-8 h-8 rounded-[8px] flex items-center justify-center text-ink3 hover:text-[#A85050] hover:bg-err/10 transition shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addMed} className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-surface border border-line text-[11.5px] font-semibold text-ink2 hover:bg-bg hover:border-teal/40 transition">
              <Plus size={13} />Agregar medicamento
            </button>
          </div>

          {/* 7. Proximo control */}
          <div>
            <SectionTitle icon={<Calendar size={14} className="text-ink3" />} n="7">Proximo control</SectionTitle>
            <div className="flex flex-wrap gap-1.5">
              {PROX_CONTROL.map((c) => (
                <button key={c} onClick={() => setProx(c)}
                  className={cn("px-3 py-1.5 rounded-full text-[12px] font-semibold transition border",
                    prox === c ? "bg-teal/20 border-teal/40 text-teal-dark" : "bg-surface border-line text-ink2 hover:bg-bg")}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 bg-surface border-t border-line px-6 py-3.5 flex items-center justify-between gap-3">
          <span className="text-[11px] text-ink3 hidden sm:block">
            {canSave ? "Listo para guardar" : "Completa el motivo o el diagnostico"}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={onClose} className="px-4 py-2.5 rounded-[10px] text-[12.5px] font-semibold text-ink2 hover:bg-bg transition focus-ring">Cancelar</button>
            <button disabled={!canSave || saving}
              onClick={() => onSave({ tipoId: tipo, motivo, peso, talla, pc, temp, sistemas, dx, indicaciones, meds, prox, sede })}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-[10px] bg-teal-dark text-white text-[12.5px] font-semibold hover:opacity-90 transition shadow-soft focus-ring disabled:opacity-40 disabled:cursor-not-allowed">
              <Check size={15} />{saving ? "Guardando..." : "Guardar consulta"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Growth chart ────────────────────────────────────────────────────────────

function getPatientValue(pt: GrowthPoint, metric: MetricKey): number | null {
  switch (metric) {
    case "weight": return pt.weight_kg ? parseFloat(pt.weight_kg) : null;
    case "height": return pt.height_cm ? parseFloat(pt.height_cm) : null;
    case "hc":     return pt.head_circumference_cm ? parseFloat(pt.head_circumference_cm) : null;
    case "bmi":    return pt.bmi ? parseFloat(pt.bmi) : null;
  }
}

function GrowthChart({ growthData, metric, patientName, sex }: {
  growthData: GrowthPoint[]; metric: MetricKey; patientName: string; sex: SexKey;
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

  const allMonths = Array.from(new Set([...omsMap.keys(), ...patientMap.keys()])).sort((a, b) => a - b);

  const chartData: ChartPoint[] = allMonths.map((m) => {
    const oms = omsMap.get(m);
    const pt: ChartPoint = { ageMonths: m };
    if (oms) { pt.p3 = oms.p3; pt.p15 = oms.p15; pt.p50 = oms.p50; pt.p85 = oms.p85; pt.p97 = oms.p97; }
    const v = patientMap.get(m);
    if (v !== undefined) pt.patient = v;
    return pt;
  });

  const latestGrowth = growthData.length > 0
    ? growthData.reduce((a, b) => new Date(a.encounter_date) > new Date(b.encounter_date) ? a : b)
    : null;

  const latestPercentile = latestGrowth ? (latestGrowth[indCfg.percentileKey] as number | null) : null;
  const latestZ = latestGrowth ? (latestGrowth[indCfg.zKey] as number | null) : null;

  const bmiVal = latestGrowth?.bmi ? parseFloat(latestGrowth.bmi) : null;
  let bmiStatus = "\u2014";
  if (bmiVal !== null) {
    if (bmiVal < 14) bmiStatus = "Bajo peso";
    else if (bmiVal < 18) bmiStatus = "Normal";
    else if (bmiVal < 22) bmiStatus = "Sobrepeso";
    else bmiStatus = "Obesidad";
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
      <div className="bg-surface border border-line rounded-[14px] shadow-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[14px] font-bold text-ink">{cfg.title}</h3>
          <div className="flex items-center gap-4 text-[11px] text-ink3">
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-px bg-[#3E8E7C] inline-block" />{patientName.split(" ")[0]}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-px border-t-2 border-dashed border-ink3 inline-block" />Percentiles OMS
            </span>
          </div>
        </div>

        {growthData.length === 0 ? (
          <div className="flex items-center justify-center h-[400px] text-ink3 text-[13px]">Sin registros de crecimiento</div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E6E1" vertical={false} />
              <XAxis dataKey="ageMonths" tick={{ fontSize: 10.5, fill: "#A0A0A0" }} tickLine={false} axisLine={false}
                label={{ value: "Meses", position: "insideBottomRight", offset: -4, fontSize: 10.5, fill: "#A0A0A0" }} />
              <YAxis tick={{ fontSize: 10.5, fill: "#A0A0A0" }} tickLine={false} axisLine={false} width={36}
                label={{ value: cfg.unit, angle: -90, position: "insideLeft", fontSize: 10.5, fill: "#A0A0A0" }} />
              <Tooltip contentStyle={{ fontSize: 11.5, border: "1px solid #E8E6E1", borderRadius: 8, color: "#2C2C2C" }}
                formatter={(value, name) => {
                  const labels: Record<string, string> = { p3: "P3", p15: "P15", p50: "P50", p85: "P85", p97: "P97", patient: "Paciente" };
                  return [`${value} ${cfg.unit}`, labels[String(name)] ?? name];
                }}
                labelFormatter={(v) => `${v} meses`} />
              {(["p3", "p15", "p50", "p85", "p97"] as const).map((key) => (
                <Line key={key} type="monotone" dataKey={key} stroke="#C0C0C0" strokeWidth={1} strokeDasharray="4 3" dot={false} connectNulls />
              ))}
              <Line type="monotone" dataKey="patient" stroke="#3E8E7C" strokeWidth={2.5}
                dot={{ r: 4, fill: "#3E8E7C", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 5 }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        <div className="mt-4 grid grid-cols-5 rounded-[8px] overflow-hidden border border-line">
          {(["P3", "P15", "P50", "P85", "P97"] as const).map((p) => (
            <div key={p} className="bg-bg/70 text-center py-1.5 text-[11px] text-ink3 font-medium border-r border-line last:border-r-0">{p}</div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-surface border border-line rounded-[14px] shadow-card p-4">
          <h4 className="text-[12.5px] font-bold text-ink mb-1">Ultima medicion</h4>
          {latestGrowth ? (
            <div className="divide-y divide-line">
              <MeasurementRow icon={<Scale size={15} />} iconBg="rgba(62,142,124,0.12)" iconColor="#2D6B5E" label="Peso" value={latestGrowth.weight_kg} unit="kg" />
              <MeasurementRow icon={<Ruler size={15} />} iconBg="rgba(107,86,158,0.12)" iconColor="#4C3A7A" label="Talla" value={latestGrowth.height_cm || null} unit="cm" />
              <MeasurementRow icon={<CircleUser size={15} />} iconBg="rgba(181,96,79,0.12)" iconColor="#8B3D2E" label="Perimetro cefalico" value={latestGrowth.head_circumference_cm || null} unit="cm" />
              <MeasurementRow icon={<Activity size={15} />} iconBg="rgba(63,131,88,0.12)" iconColor="#2A6040" label="IMC"
                value={bmiVal !== null ? bmiVal.toFixed(1) : null} unit="kg/m2" hint={bmiVal !== null ? bmiStatus : undefined} />
            </div>
          ) : (
            <p className="text-[12.5px] text-ink3 py-3">Sin registros</p>
          )}
        </div>

        <div className="bg-surface border border-line rounded-[14px] shadow-card p-4">
          <h4 className="text-[12.5px] font-bold text-ink mb-3">Indicadores</h4>
          {latestGrowth ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[11.5px] text-ink2">Percentil</span>
                <span className="text-[13px] font-bold text-ink">{latestPercentile != null ? `P${Math.round(latestPercentile)}` : "\u2014"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11.5px] text-ink2">Z-score</span>
                <span className="text-[13px] font-bold text-ink">{latestZ != null ? latestZ.toFixed(2) : "\u2014"}</span>
              </div>
              <p className="text-[11px] text-ink3 pt-1 border-t border-line">
                {latestPercentile != null && latestPercentile >= 3 && latestPercentile <= 97
                  ? "Dentro de rangos normales OMS"
                  : latestPercentile != null ? "Fuera de rangos normales OMS" : "Sin datos suficientes"}
              </p>
            </div>
          ) : (
            <p className="text-[12.5px] text-ink3">Sin datos disponibles</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PatientFicha page ───────────────────────────────────────────────────────

export default function PatientFicha() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>("crecimiento");
  const [metric, setMetric] = useState<MetricKey>("weight");
  const [consultaOpen, setConsultaOpen] = useState(false);
  const [savingConsulta, setSavingConsulta] = useState(false);
  const [detalleConsulta, setDetalleConsulta] = useState<Encounter | null>(null);
  const [vacunas, setVacunas] = useState<VacunaLocal[]>(() => FICHA_VACUNAS_SEED.map((v) => ({ ...v })));
  const [vacunaSel, setVacunaSel] = useState<VacunaLocal | null>(null);
  const [vacunaNueva, setVacunaNueva] = useState(false);
  const [editDatos, setEditDatos] = useState(false);
  const [editAnt, setEditAnt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  // ── Queries ──

  const patientQ = useQuery<Patient>({
    queryKey: ["patient", id],
    queryFn: async () => { const { data } = await api.get<Patient>(`/patients/${id}/`); return data; },
    enabled: !!id,
  });

  const encountersQ = useQuery<PaginatedResponse<Encounter>>({
    queryKey: ["encounters", id],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Encounter>>(`/encounters/?patient_id=${id}&page_size=500&expand=true`);
      return data;
    },
    enabled: !!id,
  });

  const growthQ = useQuery<GrowthPoint[]>({
    queryKey: ["growth", id],
    queryFn: async () => { const { data } = await api.get<GrowthPoint[]>(`/patients/${id}/growth-history/`); return data; },
    enabled: !!id,
  });

  const filesQ = useQuery<{ count: number }>({
    queryKey: ["patient-files-count", id],
    queryFn: async () => {
      const { data } = await api.get<{ count: number; results: unknown[] }>(`/patients/${id}/files/?page_size=1`);
      return { count: data.count };
    },
    enabled: !!id,
  });

  const filesFullQ = useQuery<{ count: number; results: PatientFile[] }>({
    queryKey: ["patient-files", id],
    queryFn: async () => {
      const { data } = await api.get<{ count: number; results: PatientFile[] }>(`/patients/${id}/files/?page_size=100`);
      return data;
    },
    enabled: !!id && activeTab === "archivos",
  });

  const patient = patientQ.data;
  const encounterCount = encountersQ.data?.count ?? 0;
  const fileCount = filesQ.data?.count ?? 0;
  const growthData = growthQ.data ?? [];

  // ── Editable state (initialized after patient loads) ──

  type DatosForm = { sexo: string; sangre: string; prevision: string; nacionalidad: string };
  const defaultDatos: DatosForm = {
    sexo: patient ? sexLabel(patient.sex_at_birth) : "",
    sangre: patient?.blood_type ?? "No registrado",
    prevision: patient?.insurance ?? "No registrada",
    nacionalidad: patient?.country ?? "Chilena",
  };
  const [datosDraft, setDatosDraft] = useState<DatosForm>(defaultDatos);
  useEffect(() => { if (patient) setDatosDraft(defaultDatos); }, [patient?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  type AntForm = {
    alergias: string[]; patologicos: string[]; quirurgicos: string[]; familiares: string[];
    pesoNacer: string; tallaNacer: string; semanas: string; tipoParto: string;
    apgar1: string; apgar5: string; alimentacion: string;
  };
  const defaultAnt: AntForm = {
    alergias: patient?.allergies ? patient.allergies.split(",").map((s) => s.trim()).filter(Boolean) : [],
    patologicos: patient?.chronic_conditions ? patient.chronic_conditions.split(",").map((s) => s.trim()).filter(Boolean) : [],
    quirurgicos: [],
    familiares: [],
    pesoNacer: patient?.birth_weight_grams ? (patient.birth_weight_grams / 1000).toFixed(2) : "",
    tallaNacer: patient?.birth_length_cm?.toString() ?? "",
    semanas: patient?.gestational_weeks?.toString() ?? "",
    tipoParto: patient?.birth_type ?? "",
    apgar1: patient?.apgar_1min?.toString() ?? "",
    apgar5: patient?.apgar_5min?.toString() ?? "",
    alimentacion: patient?.feeding_type ?? "",
  };
  const [antDraft, setAntDraft] = useState<AntForm>(defaultAnt);
  useEffect(() => { if (patient) setAntDraft(defaultAnt); }, [patient?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mutations ──

  const qc = useQueryClient();

  const patchPatient = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.patch<Patient>(`/patients/${id}/`, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["patient", id] }); },
  });

  const uploadFile = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("file_type", "OTHER");
      fd.append("description", file.name);
      return api.post(`/patients/${id}/files/`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patient-files", id] });
      qc.invalidateQueries({ queryKey: ["patient-files-count", id] });
      flash("Archivo subido correctamente");
    },
    onError: () => flash("Error al subir archivo"),
  });

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile.mutate(file);
    e.target.value = "";
  }, [uploadFile]);

  const sexToApi = (label: string): string => {
    if (label === "Masculino") return "M";
    if (label === "Femenino") return "F";
    return "U";
  };

  const handleSaveDatos = useCallback(() => {
    if (!patient) return;
    patchPatient.mutate({
      sex_at_birth: sexToApi(datosDraft.sexo),
      blood_type: datosDraft.sangre === "No registrado" ? "" : datosDraft.sangre,
      insurance: datosDraft.prevision === "No registrada" ? "" : datosDraft.prevision,
      country: datosDraft.nacionalidad,
    }, {
      onSuccess: () => { setEditDatos(false); flash("Datos guardados"); },
      onError: () => flash("Error al guardar datos"),
    });
  }, [patient, datosDraft]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveAnt = useCallback(() => {
    if (!patient) return;
    const payload: Record<string, unknown> = {
      allergies: antDraft.alergias.join(", "),
      chronic_conditions: antDraft.patologicos.join(", "),
    };
    if (antDraft.pesoNacer) payload.birth_weight_grams = Math.round(parseFloat(antDraft.pesoNacer) * 1000);
    if (antDraft.tallaNacer) payload.birth_length_cm = antDraft.tallaNacer;
    if (antDraft.semanas) payload.gestational_weeks = parseInt(antDraft.semanas, 10);
    if (antDraft.tipoParto) payload.birth_type = antDraft.tipoParto;
    if (antDraft.apgar1) payload.apgar_1min = parseInt(antDraft.apgar1, 10);
    if (antDraft.apgar5) payload.apgar_5min = parseInt(antDraft.apgar5, 10);
    if (antDraft.alimentacion) payload.feeding_type = antDraft.alimentacion;
    patchPatient.mutate(payload, {
      onSuccess: () => { setEditAnt(false); flash("Antecedentes guardados"); },
      onError: () => flash("Error al guardar antecedentes"),
    });
  }, [patient, antDraft]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──

  const handleSaveConsulta = useCallback(async (data: ConsultaSaveData) => {
    if (!patient) return;
    const user = useAuthStore.getState().user;
    if (!user) return;

    setSavingConsulta(true);
    try {
      const encRes = await api.post<Encounter>("/encounters/", {
        practice: patient.practice,
        patient: patient.id,
        doctor: user.id,
        encounter_type: TIPO_TO_ENCOUNTER[data.tipoId] || "CONSULTATION",
        status: "COMPLETED",
        scheduled_at: new Date().toISOString(),
        reason_for_visit: data.motivo,
      });
      const encId = encRes.data.id;

      const hasAnthro = data.peso || data.talla;
      if (hasAnthro) {
        await api.post(`/encounters/${encId}/anthropometry/`, {
          weight_kg: data.peso ? parseFloat(data.peso) : null,
          height_cm: data.talla ? parseFloat(data.talla) : null,
          head_circumference_cm: data.pc ? parseFloat(data.pc) : null,
        });
      }

      const objectiveParts: string[] = [];
      if (data.peso) objectiveParts.push(`Peso: ${data.peso} kg`);
      if (data.talla) objectiveParts.push(`Talla: ${data.talla} cm`);
      if (data.pc) objectiveParts.push(`PC: ${data.pc} cm`);
      if (data.temp) objectiveParts.push(`Temp: ${data.temp}°C`);
      const imc = data.peso && data.talla
        ? (parseFloat(data.peso) / Math.pow(parseFloat(data.talla) / 100, 2)).toFixed(1)
        : null;
      if (imc) objectiveParts.push(`IMC: ${imc} kg/m²`);

      const examFindings = Object.entries(data.sistemas)
        .map(([sId, st]) => {
          const label = SISTEMAS.find((s) => s.id === sId)?.label ?? sId;
          return st.estado === "alterado"
            ? `${label}: Alterado${st.nota ? ` — ${st.nota}` : ""}`
            : `${label}: Normal`;
        })
        .join("\n");
      if (examFindings) objectiveParts.push(`\nExamen físico:\n${examFindings}`);

      const medsText = data.meds
        .filter((m) => m.nombre.trim())
        .map((m) => `${m.nombre} ${m.dosis} ${m.frecuencia} ${m.duracion}`.trim())
        .join("\n");
      const planParts: string[] = [];
      if (data.indicaciones.trim()) planParts.push(data.indicaciones);
      if (medsText) planParts.push(`\nReceta:\n${medsText}`);
      if (data.prox) planParts.push(`\nPróximo control: ${data.prox}`);

      await api.post(`/encounters/${encId}/soap/`, {
        subjective: data.motivo,
        objective: objectiveParts.join(" | ") || "",
        assessment: data.dx.join(", "),
        plan: planParts.join("\n") || "",
      });

      for (let i = 0; i < data.dx.length; i++) {
        await api.post(`/encounters/${encId}/diagnoses/`, {
          description: data.dx[i],
          is_primary: i === 0,
        });
      }

      qc.invalidateQueries({ queryKey: ["encounters", id] });
      qc.invalidateQueries({ queryKey: ["growth", id] });

      setConsultaOpen(false);
      setActiveTab("consultas");
      flash(`Consulta guardada en la ficha de ${patient.full_name}`);
    } catch (err) {
      flash("Error al guardar la consulta");
      console.error("Save consulta error:", err);
    } finally {
      setSavingConsulta(false);
    }
  }, [patient, id, qc]); // eslint-disable-line react-hooks/exhaustive-deps

  const registrarVacuna = (data: VacunaLocal, isNew: boolean) => {
    setVacunas((prev) => {
      if (isNew) return [{ ...data, id: `vn${Date.now()}`, edad: "Extra PNI" }, ...prev];
      return prev.map((v) => (v.id === data.id ? { ...v, ...data } : v));
    });
    setVacunaSel(null);
    setVacunaNueva(false);
    flash(isNew ? "Vacuna registrada" : `${data.nombre} registrada como aplicada`);
  };

  // ── Tab config ──

  const totalConsultas = encounterCount;

  const tabs: { key: TabKey; label: string; count?: number; icon: React.ReactNode }[] = [
    { key: "datos", label: "Datos", icon: <User size={14} /> },
    { key: "antecedentes", label: "Antecedentes", icon: <FileText size={14} /> },
    { key: "consultas", label: "Consultas", count: totalConsultas, icon: <ClipboardList size={14} /> },
    { key: "crecimiento", label: "Crecimiento", icon: <TrendingUp size={14} /> },
    { key: "archivos", label: "Archivos", count: fileCount, icon: <Paperclip size={14} /> },
    { key: "vacunas", label: "Vacunas", icon: <Syringe size={14} /> },
  ];

  // ── Loading / error ──

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
        <button onClick={() => navigate("/dashboard/pacientes")} className="text-[12.5px] text-teal-dark font-semibold hover:underline">
          Volver a pacientes
        </button>
      </div>
    );
  }

  const firstInitial = patient.full_name.trim()[0]?.toUpperCase() ?? "?";
  const ageStr = formatAge(patient);

  return (
    <div className="space-y-5 max-w-[1200px]">
      {/* ── Patient header card ── */}
      <div className="bg-surface border border-line rounded-[18px] shadow-card p-6">
        <div className="flex items-start gap-5 flex-wrap">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-[22px] font-bold shrink-0 text-white"
            style={{ background: "linear-gradient(135deg, #3E8E7C, #6B569E)" }}>{firstInitial}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[22px] font-bold text-ink tracking-tight">{patient.full_name}</h2>
              <span className="text-[12px] text-ink3 font-medium">&middot; RUT {patient.rut}</span>
            </div>
            <div className="mt-2.5 flex items-center gap-2 flex-wrap">
              <FichaChip color="teal" icon={<Baby size={12} />}>{ageStr}</FichaChip>
              <FichaChip color="lavender">{sexLabel(patient.sex_at_birth)}</FichaChip>
              {patient.blood_type && <FichaChip color="neutral" icon={<Droplets size={12} />}>{patient.blood_type}</FichaChip>}
              {patient.allergies && <FichaChip color="coral" icon={<AlertCircle size={12} />}>{patient.allergies}</FichaChip>}
            </div>
            {patient.tutors.length > 0 && (
              <div className="mt-2.5 flex items-center gap-1.5 text-[12px] text-ink2">
                <Users size={13} className="text-ink3 shrink-0" />
                <span>
                  <span className="text-ink3 mr-1">Tutores:</span>
                  {patient.tutors.map((t, i) => (
                    <span key={t.id}>
                      {i > 0 && <span className="text-ink3 mx-1">&middot;</span>}
                      <span className="font-medium text-ink">{t.tutor_full_name}</span>
                      {t.relationship && <span className="text-ink3 ml-1">({t.relationship})</span>}
                    </span>
                  ))}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] bg-bg text-[12.5px] font-semibold text-ink2 hover:bg-line/60 transition-colors focus-ring">
              <ArrowLeft size={14} />Volver
            </button>
            <button onClick={() => { setEditDatos(true); setActiveTab("datos"); }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] bg-surface border border-line text-[12.5px] font-semibold text-ink2 hover:bg-bg transition-colors focus-ring">
              <Pencil size={13} />Editar
            </button>
            <button onClick={() => setConsultaOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] bg-teal-dark text-white text-[12.5px] font-semibold hover:opacity-90 transition focus-ring">
              <Plus size={14} />Nueva consulta
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 border-b border-line -mx-6 px-6 flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={cn("relative inline-flex items-center gap-1.5 px-3.5 py-3 text-[13px] font-semibold whitespace-nowrap transition-colors",
                activeTab === tab.key ? "text-teal-dark" : "text-ink2 hover:text-ink")}>
              {tab.icon}{tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={cn("min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold inline-flex items-center justify-center",
                  activeTab === tab.key ? "bg-teal/30 text-teal-dark" : "bg-bg text-ink3")}>{tab.count}</span>
              )}
              {activeTab === tab.key && <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-teal-dark rounded-full" />}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}

      {/* DATOS */}
      {activeTab === "datos" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
          <div className="bg-surface border border-line rounded-[14px] shadow-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-bold text-ink">Datos personales</h3>
              {editDatos ? (
                <div className="flex items-center gap-1.5">
                  <button onClick={() => { setDatosDraft(defaultDatos); setEditDatos(false); }} className="px-3 py-1.5 rounded-[10px] text-[12px] font-semibold text-ink2 hover:bg-bg transition focus-ring">Cancelar</button>
                  <button onClick={handleSaveDatos} disabled={patchPatient.isPending} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-teal-dark text-white text-[12px] font-semibold hover:opacity-90 transition focus-ring disabled:opacity-50">
                    <Check size={13} /> {patchPatient.isPending ? "Guardando…" : "Guardar"}
                  </button>
                </div>
              ) : (
                <button onClick={() => setEditDatos(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-bg border border-line text-[12px] font-semibold text-ink2 hover:bg-line/40 transition focus-ring">
                  <Pencil size={13} /> Editar
                </button>
              )}
            </div>
            {editDatos ? (
              <div className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                <EditField label="Sexo" value={datosDraft.sexo} onChange={(v) => setDatosDraft((d) => ({ ...d, sexo: v }))} options={["Masculino", "Femenino"]} half />
                <EditField label="Grupo sanguineo" value={datosDraft.sangre} onChange={(v) => setDatosDraft((d) => ({ ...d, sangre: v }))} options={["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-", "No registrado"]} half />
                <EditField label="Prevision" value={datosDraft.prevision} onChange={(v) => setDatosDraft((d) => ({ ...d, prevision: v }))} options={["Fonasa A", "Fonasa B", "Fonasa C", "Fonasa D", "Isapre", "Particular", "No registrada"]} half />
                <EditRow label="Nacionalidad" value={datosDraft.nacionalidad} onChange={(v) => setDatosDraft((d) => ({ ...d, nacionalidad: v }))} half />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <DataRow label="Nombre completo" value={patient.full_name} />
                <DataRow label="RUT" value={patient.rut} half />
                <DataRow label="Fecha de nacimiento" value={new Date(patient.date_of_birth + "T00:00:00").toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" })} half />
                <DataRow label="Edad" value={ageStr} half />
                <DataRow label="Sexo" value={sexLabel(patient.sex_at_birth)} half />
                <DataRow label="Grupo sanguineo" value={patient.blood_type ?? "No registrado"} half />
                <DataRow label="Prevision" value={patient.insurance ?? "No registrada"} half />
              </div>
            )}
          </div>

          <div className="bg-surface border border-line rounded-[14px] shadow-card p-6">
            <h3 className="text-[15px] font-bold text-ink mb-4">Tutores y contacto</h3>
            <div className="space-y-3">
              {patient.tutors.map((t) => (
                <div key={t.id} className="flex items-start gap-3 p-3 rounded-[12px] bg-bg">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-coral to-warn flex items-center justify-center text-white font-bold text-[13px] shrink-0 mt-0.5">
                    {t.tutor_full_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-ink">{t.tutor_full_name}</div>
                    <div className="text-[11px] text-ink3">{t.relationship}{t.is_primary ? " (principal)" : ""}</div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {t.tutor_email && (
                        <a href={`mailto:${t.tutor_email}`} className="inline-flex items-center gap-1 text-[11px] text-ink2 hover:text-teal-dark transition">
                          <Mail size={11} />{t.tutor_email}
                        </a>
                      )}
                      {t.tutor_phone && (
                        <a href={`tel:${t.tutor_phone}`} className="inline-flex items-center gap-1 text-[11px] text-ink2 hover:text-teal-dark transition">
                          <Phone size={11} />{t.tutor_phone}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {patient.tutors.length === 0 && <p className="text-[12px] text-ink3 italic">Sin tutores registrados</p>}
            </div>
          </div>
        </div>
      )}

      {/* ANTECEDENTES */}
      {activeTab === "antecedentes" && (
        <div>
          <div className="flex items-center justify-end mb-4">
            {editAnt ? (
              <div className="flex items-center gap-1.5">
                <button onClick={() => { setAntDraft(defaultAnt); setEditAnt(false); }} className="px-3 py-1.5 rounded-[10px] text-[12px] font-semibold text-ink2 hover:bg-bg transition focus-ring">Cancelar</button>
                <button onClick={handleSaveAnt} disabled={patchPatient.isPending} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-teal-dark text-white text-[12px] font-semibold hover:opacity-90 transition focus-ring disabled:opacity-50">
                  <Check size={13} /> Guardar
                </button>
              </div>
            ) : (
              <button onClick={() => { setAntDraft(defaultAnt); setEditAnt(true); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-bg border border-line text-[12px] font-semibold text-ink2 hover:bg-line/40 transition focus-ring">
                <Pencil size={13} /> Editar antecedentes
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-surface border border-line rounded-[14px] shadow-card p-6">
              <h3 className="text-[15px] font-bold text-ink flex items-center gap-2"><Baby size={16} className="text-teal-dark" /> Antecedentes perinatales</h3>
              {editAnt ? (
                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
                  <EditRow label="Peso al nacer (kg)" value={antDraft.pesoNacer} onChange={(v) => setAntDraft((a) => ({ ...a, pesoNacer: v }))} half placeholder="3.30" />
                  <EditRow label="Talla al nacer (cm)" value={antDraft.tallaNacer} onChange={(v) => setAntDraft((a) => ({ ...a, tallaNacer: v }))} half placeholder="50" />
                  <EditRow label="Semanas gestacionales" value={antDraft.semanas} onChange={(v) => setAntDraft((a) => ({ ...a, semanas: v }))} half placeholder="39" />
                  <EditField label="Tipo de parto" value={antDraft.tipoParto} onChange={(v) => setAntDraft((a) => ({ ...a, tipoParto: v }))} options={["Vaginal", "Cesarea", ""]} half />
                  <EditRow label="Apgar 1 min" value={antDraft.apgar1} onChange={(v) => setAntDraft((a) => ({ ...a, apgar1: v }))} half placeholder="8" />
                  <EditRow label="Apgar 5 min" value={antDraft.apgar5} onChange={(v) => setAntDraft((a) => ({ ...a, apgar5: v }))} half placeholder="9" />
                  <EditField label="Alimentacion" value={antDraft.alimentacion} onChange={(v) => setAntDraft((a) => ({ ...a, alimentacion: v }))} options={["Lactancia materna exclusiva", "Mixta", "Formula", ""]} half />
                </div>
              ) : (
                <div className="mt-4 divide-y divide-line/70">
                  {[
                    ["Peso al nacer", patient.birth_weight_grams ? `${(patient.birth_weight_grams / 1000).toFixed(2)} kg` : "No registrado"],
                    ["Talla al nacer", patient.birth_length_cm ? `${patient.birth_length_cm} cm` : "No registrada"],
                    ["Semanas gestacionales", patient.gestational_weeks ? `${patient.gestational_weeks} sem` : "No registradas"],
                    ["Tipo de parto", patient.birth_type ?? "No registrado"],
                    ["Apgar 1 min", patient.apgar_1min?.toString() ?? "\u2014"],
                    ["Apgar 5 min", patient.apgar_5min?.toString() ?? "\u2014"],
                    ["Alimentacion", patient.feeding_type ?? "No registrada"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="text-[12.5px] text-ink2 shrink-0">{k}</span>
                      <span className="text-[13px] font-semibold text-ink">{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div className="bg-surface border border-line rounded-[14px] shadow-card p-6">
                <h3 className="text-[14px] font-bold text-ink flex items-center gap-2"><AlertCircle size={15} style={{ color: "#B5604F" }} /> Alergias</h3>
                <div className="mt-3">
                  {editAnt ? (
                    <EditList items={antDraft.alergias} onChange={(v) => setAntDraft((a) => ({ ...a, alergias: v }))} placeholder="Agregar alergia y Enter" />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {(patient.allergies ? patient.allergies.split(",").map((s) => s.trim()).filter(Boolean) : []).length > 0
                        ? patient.allergies!.split(",").map((a) => a.trim()).filter(Boolean).map((a) => (
                          <span key={a} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-coral/20 text-[#B5604F] text-[12px] font-semibold">
                            <AlertCircle size={11} />{a}
                          </span>
                        ))
                        : <span className="text-[12px] text-ink3 italic">Sin alergias registradas</span>}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-surface border border-line rounded-[14px] shadow-card p-6">
                <h3 className="text-[14px] font-bold text-ink flex items-center gap-2"><Activity size={15} className="text-teal-dark" /> Condiciones cronicas</h3>
                <div className="mt-3">
                  {editAnt ? (
                    <EditList items={antDraft.patologicos} onChange={(v) => setAntDraft((a) => ({ ...a, patologicos: v }))} placeholder="Agregar condicion y Enter" />
                  ) : (
                    patient.chronic_conditions ? (
                      <ul className="space-y-2">
                        {patient.chronic_conditions.split(",").map((x) => x.trim()).filter(Boolean).map((x) => (
                          <li key={x} className="flex items-start gap-2 text-[12.5px] text-ink2">
                            <span className="w-1.5 h-1.5 rounded-full bg-lavender mt-1.5 shrink-0" />{x}
                          </li>
                        ))}
                      </ul>
                    ) : <span className="text-[12px] text-ink3 italic">Sin condiciones registradas</span>
                  )}
                </div>
              </div>

              <div className="bg-surface border border-line rounded-[14px] shadow-card p-6">
                <h3 className="text-[14px] font-bold text-ink flex items-center gap-2"><Syringe size={15} className="text-teal-dark" /> Quirurgicos</h3>
                <div className="mt-3">
                  {editAnt ? (
                    <EditList items={antDraft.quirurgicos} onChange={(v) => setAntDraft((a) => ({ ...a, quirurgicos: v }))} placeholder="Agregar cirugia y Enter" />
                  ) : (
                    antDraft.quirurgicos.length > 0 ? (
                      <ul className="space-y-2">
                        {antDraft.quirurgicos.map((x) => (
                          <li key={x} className="flex items-start gap-2 text-[12.5px] text-ink2">
                            <span className="w-1.5 h-1.5 rounded-full bg-coral mt-1.5 shrink-0" />{x}
                          </li>
                        ))}
                      </ul>
                    ) : <span className="text-[12px] text-ink3 italic">Sin antecedentes quirurgicos</span>
                  )}
                </div>
              </div>

              <div className="bg-surface border border-line rounded-[14px] shadow-card p-6">
                <h3 className="text-[14px] font-bold text-ink flex items-center gap-2"><Users size={15} className="text-teal-dark" /> Familiares</h3>
                <div className="mt-3">
                  {editAnt ? (
                    <EditList items={antDraft.familiares} onChange={(v) => setAntDraft((a) => ({ ...a, familiares: v }))} placeholder="Agregar antecedente y Enter" />
                  ) : (
                    antDraft.familiares.length > 0 ? (
                      <ul className="space-y-2">
                        {antDraft.familiares.map((x) => (
                          <li key={x} className="flex items-start gap-2 text-[12.5px] text-ink2">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal mt-1.5 shrink-0" />{x}
                          </li>
                        ))}
                      </ul>
                    ) : <span className="text-[12px] text-ink3 italic">Sin antecedentes familiares registrados</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONSULTAS */}
      {activeTab === "consultas" && (
        <div className="bg-surface border border-line rounded-[14px] shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-line/70">
            <div>
              <h3 className="text-[15px] font-bold text-ink">Historial de consultas</h3>
              <p className="text-[11.5px] text-ink3 mt-0.5">{totalConsultas} consultas registradas</p>
            </div>
            <button onClick={() => setConsultaOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] bg-teal/15 text-teal-dark text-[12px] font-semibold hover:bg-teal/25 transition focus-ring">
              <Plus size={13} /> Nueva consulta
            </button>
          </div>

          {encountersQ.isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-5 w-5 rounded-full border-2 border-line border-t-teal animate-spin" />
            </div>
          ) : !encountersQ.data?.results?.length ? (
            <div className="px-5 py-16 text-center">
              <ClipboardList size={32} className="mx-auto opacity-30 text-ink3 mb-3" />
              <p className="text-[14px] text-ink3">Sin consultas registradas</p>
            </div>
          ) : (
            <div className="divide-y divide-line/70">
              {encountersQ.data?.results
                ?.slice()
                .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())
                .map((enc) => <ConsultaHistRow key={enc.id} encounter={enc} onOpen={setDetalleConsulta} />)}
            </div>
          )}
        </div>
      )}

      {/* CRECIMIENTO */}
      {activeTab === "crecimiento" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {([
              { key: "weight" as MetricKey, label: "Peso / Edad" },
              { key: "height" as MetricKey, label: "Talla / Edad" },
              { key: "hc"     as MetricKey, label: "PC / Edad" },
              { key: "bmi"    as MetricKey, label: "IMC / Edad" },
            ]).map(({ key, label }) => (
              <button key={key} onClick={() => setMetric(key)}
                className={cn("px-3.5 py-2 rounded-[10px] text-[12.5px] font-semibold border transition-colors",
                  metric === key ? "border-teal-dark text-white" : "bg-surface border-line text-ink2 hover:text-ink")}
                style={metric === key ? { background: "#2D6B5E" } : undefined}>
                {label}
              </button>
            ))}
          </div>
          {growthQ.isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-5 w-5 rounded-full border-2 border-line border-t-teal animate-spin" />
            </div>
          ) : (
            <GrowthChart growthData={growthData} metric={metric} patientName={patient.full_name}
              sex={patient.sex_at_birth === "F" ? "F" : "M"} />
          )}
        </div>
      )}

      {/* ARCHIVOS */}
      {activeTab === "archivos" && (
        <div className="bg-surface border border-line rounded-[14px] shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-line/70">
            <div>
              <h3 className="text-[15px] font-bold text-ink">Archivos y documentos</h3>
              <p className="text-[11.5px] text-ink3 mt-0.5">{filesFullQ.data?.results?.length ?? fileCount} archivos</p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadFile.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] bg-teal/15 text-teal-dark text-[12px] font-semibold hover:bg-teal/25 transition focus-ring disabled:opacity-50"
            >
              <Plus size={13} /> {uploadFile.isPending ? "Subiendo..." : "Subir archivo"}
            </button>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
          </div>
          {filesFullQ.isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-5 w-5 rounded-full border-2 border-line border-t-teal animate-spin" />
            </div>
          ) : !filesFullQ.data?.results?.length ? (
            <div className="px-5 py-16 text-center">
              <Paperclip size={32} className="mx-auto opacity-30 text-ink3 mb-3" />
              <p className="text-[14px] text-ink3">Sin archivos cargados</p>
            </div>
          ) : (
            <ul className="divide-y divide-line/70">
              {filesFullQ.data.results.map((file) => {
                const fi = getFileIcon(file.file_type);
                return (
                  <li key={file.id} className="flex items-center gap-3 px-5 py-3 hover:bg-bg transition group">
                    <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: fi.bg, color: fi.color }}>
                      <fi.Icon size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-ink truncate">{file.original_filename}</div>
                      <div className="text-[11px] text-ink3">{formatDate(file.created_at)} &middot; {formatFileSize(file.file_size)}</div>
                    </div>
                    <a href={file.file} target="_blank" rel="noreferrer"
                      className="w-8 h-8 rounded-[8px] flex items-center justify-center text-ink3 hover:text-teal-dark hover:bg-teal/10 transition opacity-0 group-hover:opacity-100 focus-ring" title="Descargar">
                      <Download size={15} />
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* VACUNAS */}
      {activeTab === "vacunas" && (
        <div className="bg-surface border border-line rounded-[14px] shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-line/70">
            <div>
              <h3 className="text-[15px] font-bold text-ink">Carne de vacunas (PNI)</h3>
              <p className="text-[11.5px] text-ink3 mt-0.5">
                {vacunas.filter((v) => v.estado === "aplicada").length} aplicadas &middot; {vacunas.filter((v) => v.estado === "pendiente").length} pendientes
              </p>
            </div>
            <button onClick={() => { setVacunaNueva(true); setVacunaSel({ id: "", nombre: "", edad: "", fecha: "", estado: "pendiente" }); }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] bg-teal/15 text-teal-dark text-[12px] font-semibold hover:bg-teal/25 transition focus-ring">
              <Plus size={13} /> Registrar
            </button>
          </div>
          <ul className="divide-y divide-line/70">
            {vacunas.map((v) => {
              const aplicada = v.estado === "aplicada";
              return (
                <li key={v.id}>
                  <button onClick={() => { setVacunaNueva(false); setVacunaSel(v); }}
                    className="w-full text-left flex items-center gap-3 px-5 py-3 hover:bg-bg transition focus-ring">
                    <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                      style={{ background: aplicada ? "rgba(168,213,181,0.30)" : "rgba(245,212,160,0.45)", color: aplicada ? "#3F8358" : "#9C7423" }}>
                      {aplicada ? <Check size={15} /> : <Clock size={15} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-ink">{v.nombre}</div>
                      <div className="text-[11px] text-ink3">{v.edad}{aplicada && v.lote ? ` \u00b7 Lote ${v.lote}` : ""}</div>
                    </div>
                    <div className="text-right shrink-0">
                      {aplicada ? (
                        <>
                          <div className="text-[11px] font-semibold text-[#3F8358]">Aplicada</div>
                          <div className="text-[11px] text-ink3">{v.fecha}</div>
                        </>
                      ) : (
                        <span className="px-2.5 py-1 rounded-[8px] bg-warn/40 text-[#9C7423] text-[11px] font-semibold">Registrar</span>
                      )}
                    </div>
                    <ChevronRight size={15} className="text-ink3 shrink-0" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* ── Drawers ── */}

      {vacunaSel && (
        <VacunaPanel vacuna={vacunaSel} isNew={vacunaNueva} patientName={patient.full_name}
          onClose={() => { setVacunaSel(null); setVacunaNueva(false); }} onRegistrar={registrarVacuna} />
      )}

      {consultaOpen && (
        <NuevaConsulta patientName={patient.full_name} patientAge={ageStr} patientRut={patient.rut}
          onClose={() => setConsultaOpen(false)} onSave={handleSaveConsulta} saving={savingConsulta} />
      )}

      {detalleConsulta && (
        <ConsultaDetalle encounter={detalleConsulta} patientName={patient.full_name}
          onClose={() => setDetalleConsulta(null)} />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] px-4 py-3 rounded-[12px] bg-ink text-white text-[12.5px] font-semibold shadow-pop flex items-center gap-2">
          <Check size={14} className="text-teal" />{toast}
        </div>
      )}
    </div>
  );
}
