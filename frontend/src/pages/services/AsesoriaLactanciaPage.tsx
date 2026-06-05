import { Milk } from "lucide-react";
import ServiceDetailPage from "./ServiceDetailPage";

export default function AsesoriaLactanciaPage() {
  return (
    <ServiceDetailPage
      title="Asesoría de lactancia"
      description="Acompañamiento individualizado en lactancia materna: acople, técnica, producción láctea y dudas frecuentes."
      icon={Milk}
      iconBg="bg-[var(--sage)]/25"
      iconColor="text-[var(--sage)]"
      accentVar="sage"
      duration="45 minutos"
      modality="Presencial"
      includes={[
        "Evaluación del acople y la técnica de amamantamiento",
        "Abordaje de dificultades: dolor, grietas y baja producción láctea",
        "Orientación sobre posiciones y frecuencia de tomas",
        "Resolución de dudas frecuentes sobre lactancia materna",
        "Acompañamiento respetuoso y adaptado a las necesidades de cada familia",
      ]}
      idealFor="Mamás en periodo de lactancia que enfrentan dificultades o simplemente quieren asegurarse de que todo vaya bien. Ideal para la primera semana posparto, ante dolor o grietas, baja producción, o cuando el bebé no gana peso como se espera."
      slug="asesoria-lactancia"
    />
  );
}
