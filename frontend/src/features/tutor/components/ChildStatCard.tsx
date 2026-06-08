import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { Patient } from "@/types/api";

// ─── Color palette (cycles by index mod 4) ───────────────────────────────────

const CHILD_PALETTE = [
  {
    bg: "var(--child-0-bg)",
    text: "var(--child-0-text)",
    border: "var(--child-0-border)",
  },
  {
    bg: "var(--child-1-bg)",
    text: "var(--child-1-text)",
    border: "var(--child-1-border)",
  },
  {
    bg: "var(--child-2-bg)",
    text: "var(--child-2-text)",
    border: "var(--child-2-border)",
  },
  {
    bg: "var(--child-3-bg)",
    text: "var(--child-3-text)",
    border: "var(--child-3-border)",
  },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(firstName: string, lastName: string): string {
  const f = firstName.trim().charAt(0).toUpperCase();
  const l = lastName.trim().charAt(0).toUpperCase();
  return `${f}${l}`;
}

function calculateAge(dateOfBirth: string): string {
  const [y, m, d] = dateOfBirth.split("-").map(Number);
  const birth = new Date(y, m - 1, d);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();

  if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
    years--;
  }

  if (years < 1) {
    const totalMonths =
      (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
    return `${Math.max(0, totalMonths)} mes${totalMonths !== 1 ? "es" : ""}`;
  }

  return `${years} año${years !== 1 ? "s" : ""}`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ChildStatCardProps {
  patient: Patient;
  index: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChildStatCard({ patient, index }: ChildStatCardProps) {
  const palette = CHILD_PALETTE[index % 4];
  const initials = getInitials(patient.first_name, patient.last_name);
  const age = calculateAge(patient.date_of_birth);
  const completionPct = patient.profile_completion?.percentage ?? 0;

  return (
    <Link
      to={`/portal/hijos/${patient.id}`}
      className={cn(
        "group bg-surface rounded-[20px] border shadow-[var(--shadow-soft)]",
        "p-5 flex flex-col gap-4 hover:shadow-md transition-all"
      )}
      style={{ borderColor: palette.border + "66" }}
    >
      {/* Avatar + name */}
      <div className="flex items-center gap-3">
        <div
          className="h-11 w-11 rounded-full flex items-center justify-center shrink-0 text-[14px] font-bold"
          style={{ backgroundColor: palette.bg, color: palette.text }}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-ink truncate">{patient.full_name}</p>
          <p className="text-[12px] text-ink3">{age}</p>
        </div>
        <ArrowRight
          size={14}
          className="ml-auto shrink-0 text-ink3 group-hover:text-teal-dark transition-colors"
        />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Profile completion */}
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-semibold text-ink3 uppercase tracking-wide">Perfil</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-cream rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${completionPct}%`,
                  backgroundColor: palette.text,
                }}
              />
            </div>
            <span className="text-[11px] font-semibold text-ink2">{completionPct}%</span>
          </div>
        </div>

        {/* Sex indicator */}
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-semibold text-ink3 uppercase tracking-wide">Sexo</p>
          <p className="text-[12px] font-semibold text-ink2">
            {patient.sex_at_birth === "M"
              ? "Masculino"
              : patient.sex_at_birth === "F"
                ? "Femenino"
                : "No especificado"}
          </p>
        </div>
      </div>
    </Link>
  );
}
