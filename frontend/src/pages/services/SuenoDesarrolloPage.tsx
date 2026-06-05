import { Moon } from "lucide-react";
import ServiceDetailPage from "./ServiceDetailPage";

export default function SuenoDesarrolloPage() {
  return (
    <ServiceDetailPage
      title="Sueño y desarrollo"
      description="Abordaje de trastornos del sueño, cólicos y hitos del desarrollo neuromotor con enfoque integral."
      icon={Moon}
      iconBg="bg-[var(--teal)]/15"
      iconColor="text-[var(--teal-dark)]"
      accentVar="teal"
      duration="45 minutos"
      modality="Presencial"
      includes={[
        "Evaluación integral de patrones y hábitos de sueño",
        "Abordaje de cólicos del lactante con enfoque integrativo",
        "Seguimiento de hitos del desarrollo neuromotor",
        "Orientación a la familia sobre rutinas y ambiente de sueño",
        "Evaluación adaptada a cada etapa del desarrollo",
      ]}
      idealFor="Familias agotadas por noches difíciles, bebés con cólicos, o padres que quieren asegurarse de que su hijo está cumpliendo los hitos del desarrollo. Ideal también como parte del control de niño sano cuando hay preguntas específicas sobre el sueño o el desarrollo motor."
      slug="sueno-desarrollo"
    />
  );
}
