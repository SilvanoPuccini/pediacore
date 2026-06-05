import { Baby } from "lucide-react";
import ServiceDetailPage from "./ServiceDetailPage";

export default function ControlNinoSanoPage() {
  return (
    <ServiceDetailPage
      title="Control de niño sano"
      description="Seguimiento del crecimiento y desarrollo en cada etapa. Revisión de hitos, vacunas y nutrición adaptada a la edad."
      icon={Baby}
      iconBg="bg-[var(--teal)]/15"
      iconColor="text-[var(--teal-dark)]"
      accentVar="teal"
      duration="45 minutos"
      modality="Presencial"
      includes={[
        "Evaluación con enfoque integrativo y funcional",
        "Revisión de antecedentes y seguimiento del crecimiento y desarrollo",
        "Evaluación de hábitos, alimentación y sueño",
        "Revisión de hitos del desarrollo y calendario de vacunas",
        "Espacio para despejar todas las dudas de la familia",
      ]}
      idealFor="Familias que buscan un seguimiento cercano y personalizado desde el nacimiento hasta la adolescencia. Ideal para controles de salud periódicos donde se quiere ir más allá del peso y la talla, incorporando una mirada integral del niño."
      slug="control-nino-sano"
    />
  );
}
