import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Droplets, AlertCircle, FileText, TrendingUp,
  Paperclip, Syringe, ClipboardList, Download, Baby, Users,
  Scale, Ruler, CircleUser, Activity, ChevronRight,
  X, Pencil, Plus, Check, Stethoscope, Thermometer,
  Calendar, CalendarDays, Phone, Mail, MapPin, Pill, Trash2, Clock, User,
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
  VaccineScheduleEntry, Vaccination, VaccinationStatus,
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

const SEX_OPTIONS = [
  { value: "M", label: "Masculino" },
  { value: "F", label: "Femenino" },
  { value: "NO_ESPECIFICA", label: "No especifica" },
];

const BLOOD_TYPE_OPTIONS = [
  { value: "", label: "No registrado" },
  { value: "O+", label: "O+" }, { value: "O-", label: "O-" },
  { value: "A+", label: "A+" }, { value: "A-", label: "A-" },
  { value: "B+", label: "B+" }, { value: "B-", label: "B-" },
  { value: "AB+", label: "AB+" }, { value: "AB-", label: "AB-" },
];

const INSURANCE_OPTIONS = [
  { value: "", label: "Sin previsión" },
  { value: "FONASA_A", label: "Fonasa A" },
  { value: "FONASA_B", label: "Fonasa B" },
  { value: "FONASA_C", label: "Fonasa C" },
  { value: "FONASA_D", label: "Fonasa D" },
  { value: "ISAPRE_BANMEDICA", label: "Isapre Banmédica" },
  { value: "ISAPRE_COLMENA", label: "Isapre Colmena" },
  { value: "ISAPRE_CONSALUD", label: "Isapre Consalud" },
  { value: "ISAPRE_CRUZ_BLANCA", label: "Isapre Cruz Blanca" },
  { value: "ISAPRE_MASVIDA", label: "Isapre MásVida" },
  { value: "ISAPRE_NUEVA_MASVIDA", label: "Isapre Nueva MásVida" },
  { value: "ISAPRE_ESENCIAL", label: "Isapre Esencial" },
  { value: "ISAPRE_VIDATRES", label: "Isapre Vida Tres" },
  { value: "ISAPRE_BUPA", label: "Isapre Bupa" },
  { value: "ISAPRE_LIFESECURITY", label: "Isapre Lifesecurity" },
  { value: "ISAPRE_ALEMANA_SALUD", label: "Isapre Alemana Salud" },
  { value: "FFAA_CAPREDENA", label: "FFAA Capredena" },
  { value: "FFAA_DIPRECA", label: "FFAA Dipreca" },
  { value: "PARTICULAR", label: "Particular" },
  { value: "SIN_PREVISION", label: "Sin previsión" },
  { value: "OTRO", label: "Otro" },
];

const BIRTH_TYPE_OPTIONS = [
  { value: "", label: "—" },
  { value: "VAGINAL", label: "Natural" },
  { value: "CESAREAN", label: "Cesárea" },
  { value: "FORCEPS", label: "Fórceps" },
  { value: "VACUUM", label: "Vacuum" },
];

const FEEDING_TYPE_OPTIONS = [
  { value: "", label: "—" },
  { value: "EXCLUSIVE_BREASTFEEDING", label: "Lactancia materna exclusiva" },
  { value: "MIXED", label: "Mixta" },
  { value: "FORMULA", label: "Fórmula" },
  { value: "COMPLEMENTARY", label: "Alimentación complementaria" },
  { value: "SOLID", label: "Sólidos" },
];

function choiceLabel(options: { value: string; label: string }[], value: string | null | undefined, fallback = "No registrado"): string {
  if (!value) return fallback;
  return options.find((o) => o.value === value)?.label ?? value;
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
  CONSULTATION: "Consulta", WELL_CHILD_VISIT: "Control sano",
  FOLLOW_UP: "Control", EMERGENCY: "Urgencia",
  VACCINATION: "Vacunacion", OTHER: "Otra",
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
  WELL_CHILD_VISIT: { bg: "rgba(125,211,192,0.20)", text: "#3E8E7C" },
  FOLLOW_UP:        { bg: "rgba(125,211,192,0.20)", text: "#3E8E7C" },
  CONSULTATION:     { bg: "rgba(199,184,232,0.30)", text: "#6B569E" },
  EMERGENCY:        { bg: "rgba(244,168,154,0.25)", text: "#B5604F" },
  VACCINATION:      { bg: "rgba(168,213,181,0.25)", text: "#3F8358" },
  OTHER:            { bg: "rgba(107,107,107,0.12)", text: "#4A4A4A" },
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
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; half?: boolean;
}) {
  return (
    <div className={half ? "" : "col-span-2"}>
      <div className="text-[11px] text-ink3 font-medium mb-1">{label}</div>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-[9px] bg-bg border border-line text-[13px] text-ink focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
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
  const TypeIcon = encounter.encounter_type === "WELL_CHILD_VISIT" || encounter.encounter_type === "FOLLOW_UP"
    ? Stethoscope : encounter.encounter_type === "EMERGENCY" ? AlertCircle
    : encounter.encounter_type === "VACCINATION" ? Syringe : ClipboardList;

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
              {soap!.objective && (() => {
                const parts = soap!.objective.split(/\s*\|\s*/);
                const vitals = parts.filter((p) => !p.startsWith("\n") && !p.startsWith("Examen"));
                const examRaw = parts.find((p) => p.includes("Examen físico:"));
                const examLines = examRaw
                  ? examRaw.replace(/^[\s\S]*?Examen físico:\s*/, "").split("\n").filter(Boolean)
                  : [];
                return (
                  <section>
                    <h4 className="text-[11px] uppercase tracking-[0.12em] font-bold text-ink3 flex items-center gap-1.5">
                      <Stethoscope size={13} />O &mdash; Objetivo
                    </h4>
                    {vitals.length > 0 && (
                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
                        {vitals.map((v, i) => {
                          const [label, ...rest] = v.split(":");
                          const val = rest.join(":").trim();
                          return val ? (
                            <div key={i} className="text-[13px]">
                              <span className="text-ink3">{label.trim()}:</span>{" "}
                              <span className="text-ink font-medium">{val}</span>
                            </div>
                          ) : (
                            <div key={i} className="text-[13px] text-ink2">{v}</div>
                          );
                        })}
                      </div>
                    )}
                    {examLines.length > 0 && (
                      <div className="mt-3">
                        <div className="text-[11.5px] font-semibold text-ink3 mb-1.5">Examen fisico</div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          {examLines.map((line, i) => {
                            const isAltered = line.toLowerCase().includes("alterado");
                            return (
                              <div key={i} className={`text-[12.5px] ${isAltered ? "text-[#B5604F] font-semibold" : "text-ink2"}`}>
                                {line.trim()}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </section>
                );
              })()}
              {soap!.assessment && (
                <section>
                  <h4 className="text-[11px] uppercase tracking-[0.12em] font-bold text-ink3 flex items-center gap-1.5">
                    <ClipboardList size={13} />A &mdash; Evaluacion
                  </h4>
                  <p className="mt-2 text-[13px] text-ink2 leading-relaxed">{soap!.assessment}</p>
                </section>
              )}
              {soap!.plan && (() => {
                const planText = soap!.plan;
                const recetaMatch = planText.match(/\nReceta:\n([\s\S]*?)(?=\nPróximo|\n*$)/);
                const proxMatch = planText.match(/\nPróximo control:\s*(.+)/);
                const mainPlan = planText.replace(/\nReceta:\n[\s\S]*$/, "").trim();
                const recetaLines = recetaMatch?.[1]?.split("\n").filter(Boolean) ?? [];
                const proxControl = proxMatch?.[1]?.trim();
                return (
                  <section>
                    <h4 className="text-[11px] uppercase tracking-[0.12em] font-bold text-ink3 flex items-center gap-1.5">
                      <FileText size={13} />P &mdash; Plan
                    </h4>
                    {mainPlan && <p className="mt-2 text-[13px] text-ink2 leading-relaxed">{mainPlan}</p>}
                    {recetaLines.length > 0 && (
                      <div className="mt-3 bg-bg rounded-[10px] border border-line p-3">
                        <div className="text-[11px] uppercase tracking-[0.1em] font-bold text-teal-dark mb-2 flex items-center gap-1.5">
                          <FileText size={11} />Receta
                        </div>
                        <ul className="space-y-1">
                          {recetaLines.map((med, i) => (
                            <li key={i} className="text-[12.5px] text-ink flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-teal mt-1.5 shrink-0" />{med}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {proxControl && (
                      <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-lavender/15 text-[12px] font-semibold text-[#6B569E]">
                        <CalendarDays size={12} />Proximo control: {proxControl}
                      </div>
                    )}
                  </section>
                );
              })()}
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

type VacunaPanelMode =
  | { mode: "register-pending"; entry: VaccineScheduleEntry }
  | { mode: "register-new" }
  | { mode: "view-applied"; entry: VaccineScheduleEntry; record: Vaccination };

function VacunaPanel({ panelState, patientId, patientName, onClose, onRegistrar, isPending }: {
  panelState: VacunaPanelMode;
  patientId: number;
  patientName: string;
  onClose: () => void;
  onRegistrar: (payload: {
    patient: number;
    vaccine_schedule: number | null;
    vaccine_name: string;
    dose_label: string;
    administered_at: string;
    lot_number: string;
    site: string;
    notes: string;
  }) => void;
  isPending?: boolean;
}) {
  const isView = panelState.mode === "view-applied";
  const isRegisterPending = panelState.mode === "register-pending";
  const isRegisterNew = panelState.mode === "register-new";

  const defaultVaccineName = isRegisterPending ? panelState.entry.name
    : isRegisterNew ? ""
    : panelState.entry.name;
  const defaultDoseLabel = isRegisterPending ? panelState.entry.dose_label
    : isRegisterNew ? ""
    : panelState.entry.dose_label;
  const defaultRoute = isRegisterPending ? panelState.entry.route
    : isRegisterNew ? "Intramuscular"
    : "";

  const todayIso = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    vaccine_name: defaultVaccineName,
    dose_label: defaultDoseLabel,
    administered_at: todayIso,
    lot_number: "",
    site: "Muslo izquierdo",
    notes: "",
    via: defaultRoute,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const setField = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const canSave = form.vaccine_name.trim() && form.administered_at.trim() && form.dose_label.trim();

  const SITIOS = ["Muslo izquierdo", "Muslo derecho", "Brazo izquierdo", "Brazo derecho"];
  const VIAS = ["Intramuscular", "Subcutanea", "Intradermica", "Oral"];

  const DetailRow = ({ label, val, ic }: { label: string; val: string; ic: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-[12px] text-ink2 inline-flex items-center gap-2">{ic}{label}</span>
      <span className="text-[12.5px] font-semibold text-ink text-right">{val}</span>
    </div>
  );

  const headerLabel = isView ? "Vacuna aplicada"
    : isRegisterPending ? "Registrar aplicacion"
    : "Registrar vacuna";

  const headerTitle = isRegisterNew ? "Nueva vacuna"
    : isView ? panelState.entry.name
    : panelState.entry.name;

  const headerSub = isRegisterNew ? patientName
    : `${patientName} \u00b7 ${isView ? panelState.entry.age_label : panelState.entry.age_label}`;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-ink/25 backdrop-blur-sm" onClick={onClose}
        style={{ animation: "consultaFade 180ms ease-out" }} />
      <div className="relative h-full w-full max-w-[460px] bg-bg shadow-pop flex flex-col"
        style={{ animation: "consultaIn 280ms cubic-bezier(0.22,1,0.36,1)" }}>

        {/* Header */}
        <div className="shrink-0 bg-surface border-b border-line px-6 py-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.12em] font-bold text-teal-dark">{headerLabel}</div>
            <h3 className="text-[17px] font-bold text-ink leading-tight mt-1 truncate">{headerTitle}</h3>
            <div className="text-[11.5px] text-ink3 mt-0.5">{headerSub}</div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-[10px] bg-bg border border-line flex items-center justify-center text-ink2 hover:bg-line/50 transition shrink-0 focus-ring">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isView ? (
            <>
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-[12px] bg-ok/20 border border-ok/40 mb-5">
                <div className="w-8 h-8 rounded-full bg-ok/50 flex items-center justify-center text-[#3F8358]"><Check size={16} /></div>
                <div>
                  <div className="text-[12.5px] font-bold text-ink">
                    Aplicada el {new Date(panelState.record.administered_at).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" })}
                  </div>
                  <div className="text-[11px] text-ink3">Registrada en el carne PNI</div>
                </div>
              </div>
              <div className="bg-surface border border-line rounded-[12px] px-4 divide-y divide-line/70">
                <DetailRow label="Vacuna" val={panelState.record.vaccine_name} ic={<Syringe size={13} className="text-teal-dark" />} />
                <DetailRow label="Dosis" val={panelState.record.dose_label || "\u2014"} ic={<Baby size={13} className="text-teal-dark" />} />
                <DetailRow label="Fecha" val={new Date(panelState.record.administered_at).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" })} ic={<Calendar size={13} className="text-teal-dark" />} />
                <DetailRow label="Lote" val={panelState.record.lot_number || "\u2014"} ic={<ClipboardList size={13} className="text-teal-dark" />} />
                <DetailRow label="Sitio" val={panelState.record.site || "\u2014"} ic={<MapPin size={13} className="text-teal-dark" />} />
                {panelState.record.notes && (
                  <DetailRow label="Notas" val={panelState.record.notes} ic={<FileText size={13} className="text-teal-dark" />} />
                )}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {isRegisterNew && (
                <div>
                  <label className="text-[11.5px] font-semibold text-ink2">Nombre de la vacuna</label>
                  <input
                    value={form.vaccine_name}
                    onChange={(e) => setField("vaccine_name", e.target.value)}
                    placeholder="Ej: Influenza"
                    className={"mt-1.5 " + consultaInput}
                  />
                </div>
              )}
              {isRegisterNew && (
                <div>
                  <label className="text-[11.5px] font-semibold text-ink2">Dosis</label>
                  <input
                    value={form.dose_label}
                    onChange={(e) => setField("dose_label", e.target.value)}
                    placeholder="Ej: 1a dosis"
                    className={"mt-1.5 " + consultaInput}
                  />
                </div>
              )}
              {isRegisterPending && (
                <div className="px-4 py-3 rounded-[12px] bg-teal/10 border border-teal/25">
                  <div className="text-[11px] font-semibold text-teal-dark uppercase tracking-wide mb-1">Vacuna del esquema PNI</div>
                  <div className="text-[13px] font-bold text-ink">{panelState.entry.name} &mdash; {panelState.entry.dose_label}</div>
                  <div className="text-[11px] text-ink3 mt-0.5">{panelState.entry.age_label} &middot; {panelState.entry.disease}</div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11.5px] font-semibold text-ink2">Fecha de aplicacion</label>
                  <input
                    type="date"
                    value={form.administered_at}
                    onChange={(e) => setField("administered_at", e.target.value)}
                    className={"mt-1.5 " + consultaInput}
                  />
                </div>
                <div>
                  <label className="text-[11.5px] font-semibold text-ink2">Lote</label>
                  <input
                    value={form.lot_number}
                    onChange={(e) => setField("lot_number", e.target.value)}
                    placeholder="Ej: HEX-1180"
                    className={"mt-1.5 " + consultaInput}
                  />
                </div>
              </div>
              <div>
                <label className="text-[11.5px] font-semibold text-ink2">Via de administracion</label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {VIAS.map((v) => (
                    <button key={v} onClick={() => setField("via", v)}
                      className={cn("px-3 py-1.5 rounded-full text-[11.5px] font-semibold border transition",
                        form.via === v ? "bg-teal-dark text-white border-teal-dark" : "bg-surface text-ink2 border-line hover:bg-bg")}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11.5px] font-semibold text-ink2">Sitio de puncion</label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {SITIOS.map((s) => (
                    <button key={s} onClick={() => setField("site", s)}
                      className={cn("px-3 py-1.5 rounded-full text-[11.5px] font-semibold border transition",
                        form.site === s ? "bg-teal/20 border-teal/40 text-teal-dark" : "bg-surface text-ink2 border-line hover:bg-bg")}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11.5px] font-semibold text-ink2">Notas (opcional)</label>
                <input
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  placeholder="Observaciones adicionales"
                  className={"mt-1.5 " + consultaInput}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 bg-surface border-t border-line px-6 py-3.5 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2.5 rounded-[10px] text-[12.5px] font-semibold text-ink2 hover:bg-bg transition focus-ring">
            {isView ? "Cerrar" : "Cancelar"}
          </button>
          {isView ? (
            <button onClick={onClose} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[10px] bg-surface border border-line text-[12.5px] font-semibold text-ink2 hover:bg-bg transition focus-ring">
              <Download size={14} /> Carne PDF
            </button>
          ) : (
            <button
              disabled={!canSave || isPending}
              onClick={() => onRegistrar({
                patient: patientId,
                vaccine_schedule: isRegisterPending ? panelState.entry.id : null,
                vaccine_name: form.vaccine_name,
                dose_label: form.dose_label,
                administered_at: form.administered_at,
                lot_number: form.lot_number,
                site: form.site,
                notes: form.notes,
              })}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-[10px] bg-teal-dark text-white text-[12.5px] font-semibold hover:opacity-90 transition shadow-soft focus-ring disabled:opacity-40 disabled:cursor-not-allowed">
              <Check size={15} /> {isPending ? "Registrando…" : "Registrar aplicacion"}
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
  const [activeTab, setActiveTab] = useState<TabKey>("datos");
  const [metric, setMetric] = useState<MetricKey>("weight");
  const [consultaOpen, setConsultaOpen] = useState(false);
  const [savingConsulta, setSavingConsulta] = useState(false);
  const [detalleConsulta, setDetalleConsulta] = useState<Encounter | null>(null);
  const [vacunaPanel, setVacunaPanel] = useState<VacunaPanelMode | null>(null);
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

  const vaccineStatusQ = useQuery<VaccinationStatus>({
    queryKey: ["vaccine-status", id],
    queryFn: async () => {
      const { data } = await api.get<VaccinationStatus>(`/vaccinations/patient-status/?patient_id=${id}`);
      return data;
    },
    enabled: !!id && activeTab === "vacunas",
  });

  const vaccinationsQ = useQuery<PaginatedResponse<Vaccination>>({
    queryKey: ["vaccinations", id],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Vaccination>>(`/vaccinations/?patient_id=${id}&page_size=200`);
      return data;
    },
    enabled: !!id && activeTab === "vacunas",
  });

  const registerVaccineMutation = useMutation({
    mutationFn: async (payload: {
      patient: number;
      vaccine_schedule: number | null;
      vaccine_name: string;
      dose_label: string;
      administered_at: string;
      lot_number: string;
      site: string;
      notes: string;
    }) => {
      const { data } = await api.post<Vaccination>("/vaccinations/", payload);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["vaccine-status", id] });
      void qc.invalidateQueries({ queryKey: ["vaccinations", id] });
      setVacunaPanel(null);
      flash("Vacuna registrada");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Error al registrar vacuna";
      flash(msg);
    },
  });

  const patient = patientQ.data;
  const encounterCount = encountersQ.data?.count ?? 0;
  const fileCount = filesQ.data?.count ?? 0;
  const growthData = growthQ.data ?? [];

  // ── Editable state (initialized after patient loads) ──

  type DatosForm = { sexo: string; sangre: string; prevision: string; nacionalidad: string };
  const defaultDatos: DatosForm = {
    sexo: patient?.sex_at_birth ?? "NO_ESPECIFICA",
    sangre: patient?.blood_type ?? "",
    prevision: patient?.insurance ?? "",
    nacionalidad: patient?.country ?? "Chile",
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

  const handleSaveDatos = useCallback(() => {
    if (!patient) return;
    patchPatient.mutate({
      sex_at_birth: datosDraft.sexo,
      blood_type: datosDraft.sangre,
      insurance: datosDraft.prevision,
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

  const handleRegisterVaccine = (payload: {
    patient: number;
    vaccine_schedule: number | null;
    vaccine_name: string;
    dose_label: string;
    administered_at: string;
    lot_number: string;
    site: string;
    notes: string;
  }) => {
    registerVaccineMutation.mutate(payload);
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
                <EditField label="Sexo" value={datosDraft.sexo} onChange={(v) => setDatosDraft((d) => ({ ...d, sexo: v }))} options={SEX_OPTIONS} half />
                <EditField label="Grupo sanguineo" value={datosDraft.sangre} onChange={(v) => setDatosDraft((d) => ({ ...d, sangre: v }))} options={BLOOD_TYPE_OPTIONS} half />
                <EditField label="Prevision" value={datosDraft.prevision} onChange={(v) => setDatosDraft((d) => ({ ...d, prevision: v }))} options={INSURANCE_OPTIONS} half />
                <EditRow label="Nacionalidad" value={datosDraft.nacionalidad} onChange={(v) => setDatosDraft((d) => ({ ...d, nacionalidad: v }))} half />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <DataRow label="Nombre completo" value={patient.full_name} />
                <DataRow label="RUT" value={patient.rut} half />
                <DataRow label="Fecha de nacimiento" value={new Date(patient.date_of_birth + "T00:00:00").toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" })} half />
                <DataRow label="Edad" value={ageStr} half />
                <DataRow label="Sexo" value={sexLabel(patient.sex_at_birth)} half />
                <DataRow label="Grupo sanguineo" value={choiceLabel(BLOOD_TYPE_OPTIONS, patient.blood_type)} half />
                <DataRow label="Prevision" value={choiceLabel(INSURANCE_OPTIONS, patient.insurance, "No registrada")} half />
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
                  <EditField label="Tipo de parto" value={antDraft.tipoParto} onChange={(v) => setAntDraft((a) => ({ ...a, tipoParto: v }))} options={BIRTH_TYPE_OPTIONS} half />
                  <EditRow label="Apgar 1 min" value={antDraft.apgar1} onChange={(v) => setAntDraft((a) => ({ ...a, apgar1: v }))} half placeholder="8" />
                  <EditRow label="Apgar 5 min" value={antDraft.apgar5} onChange={(v) => setAntDraft((a) => ({ ...a, apgar5: v }))} half placeholder="9" />
                  <EditField label="Alimentacion" value={antDraft.alimentacion} onChange={(v) => setAntDraft((a) => ({ ...a, alimentacion: v }))} options={FEEDING_TYPE_OPTIONS} half />
                </div>
              ) : (
                <div className="mt-4 divide-y divide-line/70">
                  {[
                    ["Peso al nacer", patient.birth_weight_grams ? `${(patient.birth_weight_grams / 1000).toFixed(2)} kg` : "No registrado"],
                    ["Talla al nacer", patient.birth_length_cm ? `${patient.birth_length_cm} cm` : "No registrada"],
                    ["Semanas gestacionales", patient.gestational_weeks ? `${patient.gestational_weeks} sem` : "No registradas"],
                    ["Tipo de parto", choiceLabel(BIRTH_TYPE_OPTIONS, patient.birth_type)],
                    ["Apgar 1 min", patient.apgar_1min?.toString() ?? "\u2014"],
                    ["Apgar 5 min", patient.apgar_5min?.toString() ?? "\u2014"],
                    ["Alimentacion", choiceLabel(FEEDING_TYPE_OPTIONS, patient.feeding_type, "No registrada")],
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
      {activeTab === "vacunas" && (() => {
        const status = vaccineStatusQ.data;
        const records = vaccinationsQ.data?.results ?? [];
        const isLoading = vaccineStatusQ.isLoading || vaccinationsQ.isLoading;

        // Build a lookup: vaccine_schedule id → Vaccination record
        const recordByScheduleId = new Map<number, Vaccination>();
        for (const r of records) {
          if (r.vaccine_schedule != null) recordByScheduleId.set(r.vaccine_schedule, r);
        }

        const appliedCount = status?.applied.length ?? 0;
        const pendingCount = status?.pending.length ?? 0;
        const upcomingCount = status?.upcoming.length ?? 0;

        return (
          <div className="bg-surface border border-line rounded-[14px] shadow-card overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-line/70">
              <div>
                <h3 className="text-[15px] font-bold text-ink">Carne de vacunas (PNI)</h3>
                <p className="text-[11.5px] text-ink3 mt-0.5">
                  {appliedCount} aplicadas &middot; {pendingCount} pendientes &middot; {upcomingCount} proximas
                </p>
              </div>
              <button
                onClick={() => setVacunaPanel({ mode: "register-new" })}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] bg-teal/15 text-teal-dark text-[12px] font-semibold hover:bg-teal/25 transition focus-ring">
                <Plus size={13} /> Registrar
              </button>
            </div>

            {isLoading && (
              <div className="flex items-center justify-center py-10">
                <div className="h-5 w-5 rounded-full border-2 border-line border-t-teal animate-spin" />
              </div>
            )}

            {vaccineStatusQ.isError && (
              <div className="flex items-center gap-2 px-5 py-4 text-[12.5px] text-[#B5604F]">
                <AlertCircle size={15} />No se pudieron cargar las vacunas
              </div>
            )}

            {!isLoading && status && (
              <>
                {/* Applied group */}
                {status.applied.length > 0 && (
                  <div>
                    <div className="px-5 py-2.5 bg-ok/10 border-b border-line/50">
                      <span className="text-[10.5px] font-bold text-[#3F8358] uppercase tracking-wide flex items-center gap-1.5">
                        <Check size={11} />Aplicadas ({status.applied.length})
                      </span>
                    </div>
                    <ul className="divide-y divide-line/70">
                      {status.applied.map((entry) => {
                        const rec = recordByScheduleId.get(entry.id);
                        const dateStr = rec
                          ? new Date(rec.administered_at).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" })
                          : "\u2014";
                        return (
                          <li key={entry.id}>
                            <button
                              onClick={() => {
                                if (rec) setVacunaPanel({ mode: "view-applied", entry, record: rec });
                              }}
                              className="w-full text-left flex items-center gap-3 px-5 py-3 hover:bg-bg transition focus-ring">
                              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                                style={{ background: "rgba(168,213,181,0.30)", color: "#3F8358" }}>
                                <Check size={15} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[13px] font-semibold text-ink">{entry.name}</div>
                                <div className="text-[11px] text-ink3">
                                  {entry.dose_label}{entry.age_label ? ` \u00b7 ${entry.age_label}` : ""}
                                  {rec?.lot_number ? ` \u00b7 Lote ${rec.lot_number}` : ""}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-[11px] font-semibold text-[#3F8358]">Aplicada</div>
                                <div className="text-[11px] text-ink3">{dateStr}</div>
                              </div>
                              <ChevronRight size={15} className="text-ink3 shrink-0" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {/* Pending group */}
                {status.pending.length > 0 && (
                  <div>
                    <div className="px-5 py-2.5 bg-warn/10 border-b border-line/50 border-t border-line/70">
                      <span className="text-[10.5px] font-bold text-[#9C7423] uppercase tracking-wide flex items-center gap-1.5">
                        <Clock size={11} />Pendientes ({status.pending.length})
                      </span>
                    </div>
                    <ul className="divide-y divide-line/70">
                      {status.pending.map((entry) => (
                        <li key={entry.id}>
                          <button
                            onClick={() => setVacunaPanel({ mode: "register-pending", entry })}
                            className="w-full text-left flex items-center gap-3 px-5 py-3 hover:bg-bg transition focus-ring">
                            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                              style={{ background: "rgba(245,212,160,0.45)", color: "#9C7423" }}>
                              <Clock size={15} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] font-semibold text-ink">{entry.name}</div>
                              <div className="text-[11px] text-ink3">
                                {entry.dose_label}{entry.age_label ? ` \u00b7 ${entry.age_label}` : ""}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="px-2.5 py-1 rounded-[8px] bg-warn/40 text-[#9C7423] text-[11px] font-semibold">Registrar</span>
                            </div>
                            <ChevronRight size={15} className="text-ink3 shrink-0" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Upcoming group */}
                {status.upcoming.length > 0 && (
                  <div>
                    <div className="px-5 py-2.5 bg-line/30 border-b border-line/50 border-t border-line/70">
                      <span className="text-[10.5px] font-bold text-ink3 uppercase tracking-wide flex items-center gap-1.5">
                        <CalendarDays size={11} />Proximas ({status.upcoming.length})
                      </span>
                    </div>
                    <ul className="divide-y divide-line/70">
                      {status.upcoming.map((entry) => (
                        <li key={entry.id}>
                          <div className="flex items-center gap-3 px-5 py-3">
                            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                              style={{ background: "rgba(107,107,107,0.10)", color: "#6B6B6B" }}>
                              <CalendarDays size={15} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] font-semibold text-ink2">{entry.name}</div>
                              <div className="text-[11px] text-ink3">
                                {entry.dose_label}{entry.age_label ? ` \u00b7 ${entry.age_label}` : ""}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-[11px] text-ink3">Proxima</span>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {appliedCount === 0 && pendingCount === 0 && upcomingCount === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-ink3">
                    <Syringe size={28} className="opacity-30" />
                    <p className="text-[13px]">Sin datos del esquema PNI</p>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })()}

      {/* ── Drawers ── */}

      {vacunaPanel && (
        <VacunaPanel
          panelState={vacunaPanel}
          patientId={patient.id}
          patientName={patient.full_name}
          onClose={() => setVacunaPanel(null)}
          onRegistrar={handleRegisterVaccine}
          isPending={registerVaccineMutation.isPending}
        />
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
