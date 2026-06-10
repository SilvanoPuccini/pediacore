import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar, Chip, childPalette } from "@/features/tutor/components/portal-ui";
import type { Patient } from "@/types/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calculateAge(dateOfBirth: string): string {
  const [y, m, d] = dateOfBirth.split("-").map(Number);
  const birth = new Date(y, m - 1, d);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();
  if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) years--;
  if (years < 1) {
    const totalMonths = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
    return `${Math.max(0, totalMonths)} mes${totalMonths !== 1 ? "es" : ""}`;
  }
  return `${years} año${years !== 1 ? "s" : ""}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  patient: Patient;
  index: number;
}

export default function ChildStatCard({ patient, index }: Props) {
  const age = calculateAge(patient.date_of_birth);

  return (
    <Link
      to={`/portal/hijos/${patient.id}`}
      className="group rounded-[14px] p-4 border border-line bg-surface shadow-card hover:shadow-soft transition-all flex items-center gap-3"
    >
      <Avatar name={patient.full_name} childIndex={index} size={44} />

      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-bold text-ink truncate">{patient.full_name}</p>
        <p className="text-[11.5px] text-ink3">{age}</p>

        {/* Vaccine status chip */}
        <div className="mt-1.5">
          <Chip color="sage" icon="Check">
            Al día
          </Chip>
        </div>

        {patient.next_appointment_date && (
          <p className="text-[11px] text-ink3 mt-1">
            Próx: {new Date(patient.next_appointment_date).toLocaleDateString("es-CL", {
              day: "numeric",
              month: "short",
            })}
          </p>
        )}
      </div>

      <ChevronRight
        size={16}
        className="shrink-0 text-ink3 group-hover:text-teal-dark transition-colors"
      />
    </Link>
  );
}
