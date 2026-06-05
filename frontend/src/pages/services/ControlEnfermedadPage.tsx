import { Stethoscope } from "lucide-react";
import ServiceDetailPage from "./ServiceDetailPage";

export default function ControlEnfermedadPage() {
  return (
    <ServiceDetailPage
      title="Control por enfermedad"
      description="Atención de enfermedades agudas y crónicas, con diagnóstico detallado y acompañamiento familiar real."
      icon={Stethoscope}
      iconBg="bg-[var(--coral)]/15"
      iconColor="text-[var(--coral)]"
      accentVar="coral"
      duration="45 minutos"
      modality="Presencial"
      includes={[
        "Evaluación de enfermedades agudas frecuentes en la infancia y adolescencia",
        "Abordaje de patologías crónicas desde una mirada integrativa y funcional",
        "Solicitud de exámenes complementarios según evaluación individualizada",
        "Diagnóstico detallado con explicación clara para la familia",
        "Plan de tratamiento personalizado y seguimiento del caso",
      ]}
      idealFor="Familias que necesitan atención ante una enfermedad aguda o el seguimiento de una condición crónica. Ideal cuando se busca un diagnóstico profundo y un acompañamiento real, no una consulta apresurada."
      slug="control-enfermedad"
    />
  );
}
