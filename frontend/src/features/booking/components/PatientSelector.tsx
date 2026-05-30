import type { Patient } from "@/types/api";
import Skeleton from "./Skeleton";
import InlinePatientForm from "./InlinePatientForm";

interface PatientSelectorProps {
  patients: Patient[] | undefined;
  isLoading: boolean;
  selectedPatientId: number | null;
  onSelect: (id: number) => void;
}

export default function PatientSelector({
  patients,
  isLoading,
  selectedPatientId,
  onSelect,
}: PatientSelectorProps) {
  if (isLoading) {
    return <Skeleton className="h-[48px]" />;
  }

  // Zero-patient case: show inline creation form
  if (!patients || patients.length === 0) {
    return <InlinePatientForm />;
  }

  return (
    <select
      value={selectedPatientId ?? ""}
      onChange={(e) => onSelect(Number(e.target.value))}
      className="w-full px-4 py-3 rounded-[12px] border border-line bg-bg text-ink text-[14px] focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
    >
      <option value="">Seleccioná el paciente</option>
      {patients.map((p) => (
        <option key={p.id} value={p.id}>
          {p.full_name}
        </option>
      ))}
    </select>
  );
}
