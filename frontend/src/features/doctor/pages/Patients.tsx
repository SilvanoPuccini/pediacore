import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, ChevronRight } from "lucide-react";
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

// ─── Age bucket filter ───────────────────────────────────────────────────────

type AgeBucket = "all" | "lactante" | "preescolar" | "escolar" | "adolescente";

const AGE_BUCKETS: { key: AgeBucket; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "lactante", label: "Lactantes (0-2)" },
  { key: "preescolar", label: "Preescolar (2-6)" },
  { key: "escolar", label: "Escolar (6-12)" },
  { key: "adolescente", label: "Adolescente (12-18)" },
];

function getAgeMonths(patient: Patient): number {
  return patient.age.years * 12 + patient.age.months;
}

function matchesBucket(patient: Patient, bucket: AgeBucket): boolean {
  if (bucket === "all") return true;
  const m = getAgeMonths(patient);
  if (bucket === "lactante") return m < 24;
  if (bucket === "preescolar") return m >= 24 && m < 72;
  if (bucket === "escolar") return m >= 72 && m < 144;
  if (bucket === "adolescente") return m >= 144;
  return true;
}

// ─── AgeBadge ────────────────────────────────────────────────────────────────

function AgeBadge({ patient }: { patient: Patient }) {
  const m = getAgeMonths(patient);
  let color: string;
  let label: string;

  if (m < 24) {
    color = "#7DD3C0";
    label = "Lactante";
  } else if (m < 72) {
    color = "#C7B8E8";
    label = "Preescolar";
  } else if (m < 144) {
    color = "#A8D5B5";
    label = "Escolar";
  } else {
    color = "#F4A89A";
    label = "Adolescente";
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
      <span className="text-[11.5px] text-ink2">{label}</span>
    </span>
  );
}

// ─── Patient avatar ──────────────────────────────────────────────────────────

function PatientAvatar({ name }: { name: string }) {
  const [border, bg] = getPalette(name);
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0"
      style={{ background: bg, color: border, border: `1.5px solid ${border}` }}
    >
      {initials}
    </div>
  );
}

// ─── Format age ──────────────────────────────────────────────────────────────

function formatAge(patient: Patient): string {
  const { years, months } = patient.age;
  if (years === 0) return `${months} m`;
  if (months === 0) return `${years} a`;
  return `${years} a ${months} m`;
}

// ─── Patients page ───────────────────────────────────────────────────────────

export default function Patients() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [bucket, setBucket] = useState<AgeBucket>("all");

  const { data, isLoading } = useQuery<PaginatedResponse<Patient>>({
    queryKey: ["patients", "all"],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Patient>>(
        "/patients/?page_size=500"
      );
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const all = data?.results ?? [];

  const filtered = all.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.full_name.toLowerCase().includes(q) ||
      p.rut.replace(/\./g, "").replace(/-/g, "").includes(q.replace(/\./g, "").replace(/-/g, ""));
    return matchSearch && matchesBucket(p, bucket);
  });

  const primaryTutor = (p: Patient) =>
    p.tutors.find((t) => t.is_primary) ?? p.tutors[0];

  return (
    <div className="space-y-5 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-ink">Pacientes</h1>
          {!isLoading && (
            <p className="text-[12.5px] text-ink3 mt-0.5">
              {filtered.length} paciente{filtered.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar paciente por nombre o RUT"
            className={cn(
              "w-full pl-9 pr-3 py-2.5 text-[13px] rounded-[10px]",
              "bg-surface border border-line",
              "text-ink placeholder:text-ink3",
              "focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal",
              "transition-colors"
            )}
          />
        </div>

        {/* Age bucket chips */}
        <div className="flex flex-wrap gap-2">
          {AGE_BUCKETS.map((b) => (
            <button
              key={b.key}
              onClick={() => setBucket(b.key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-[11.5px] font-medium transition-colors",
                bucket === b.key
                  ? "bg-teal text-white"
                  : "bg-surface border border-line text-ink2 hover:bg-bg"
              )}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-line rounded-[14px] shadow-[var(--shadow-card)] overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-5 w-5 rounded-full border-2 border-line border-t-teal animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-ink3">
            <Search size={36} className="opacity-30" />
            <div className="text-center">
              <p className="text-[14px] font-semibold">Sin resultados</p>
              <p className="text-[12.5px] mt-1">Probá con otro nombre o RUT</p>
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-line">
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-ink3 uppercase tracking-wider">
                  Paciente
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-ink3 uppercase tracking-wider hidden sm:table-cell">
                  Edad
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-ink3 uppercase tracking-wider hidden md:table-cell">
                  Tutor principal
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-ink3 uppercase tracking-wider hidden lg:table-cell">
                  Última consulta
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-ink3 uppercase tracking-wider hidden lg:table-cell">
                  Próximo control
                </th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((patient, i) => {
                const tutor = primaryTutor(patient);
                return (
                  <tr
                    key={patient.id}
                    onClick={() => navigate(`/dashboard/pacientes/${patient.id}`)}
                    className={cn(
                      "cursor-pointer hover:bg-bg transition-colors",
                      i < filtered.length - 1 && "border-b border-line/60"
                    )}
                  >
                    {/* Patient name + avatar */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <PatientAvatar name={patient.full_name} />
                        <div className="min-w-0">
                          <div className="text-[13.5px] font-semibold text-ink truncate">
                            {patient.full_name}
                          </div>
                          <div className="text-[11.5px] text-ink3 mt-0.5">{patient.rut}</div>
                        </div>
                      </div>
                    </td>

                    {/* Age */}
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <div className="flex flex-col gap-1">
                        <span className="text-[13px] text-ink">{formatAge(patient)}</span>
                        <AgeBadge patient={patient} />
                      </div>
                    </td>

                    {/* Tutor */}
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      {tutor ? (
                        <div>
                          <div className="text-[13px] text-ink">{tutor.tutor_full_name}</div>
                          <div className="text-[11.5px] text-ink3 mt-0.5">{tutor.relationship}</div>
                        </div>
                      ) : (
                        <span className="text-[13px] text-ink3">—</span>
                      )}
                    </td>

                    {/* Last visit */}
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <span className="text-[13px] text-ink3">—</span>
                    </td>

                    {/* Next visit */}
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <span className="text-[13px] text-ink3">—</span>
                    </td>

                    {/* Arrow */}
                    <td className="px-3 py-3.5">
                      <ChevronRight size={16} className="text-ink3" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
