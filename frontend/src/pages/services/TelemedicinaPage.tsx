import { Video } from "lucide-react";
import ServiceDetailPage from "./ServiceDetailPage";

export default function TelemedicinaPage() {
  return (
    <ServiceDetailPage
      title="Telemedicina"
      description="Consultas por videollamada para familias en otras regiones o que prefieren la comodidad de su hogar."
      icon={Video}
      iconBg="bg-[var(--mustard)]/20"
      iconColor="text-[var(--mustard)]"
      accentVar="mustard"
      duration="30 minutos"
      modality="Online"
      includes={[
        "Confección de historia clínica completa en la primera consulta",
        "Evaluación detallada del motivo de consulta y antecedentes",
        "Solicitud de exámenes complementarios según necesidad",
        "Tratamiento combinando enfoque tradicional e integrativo",
        "Accesible desde cualquier lugar de Chile con conexión a internet",
      ]}
      idealFor="Familias que viven en ciudades alejadas, que tienen dificultades de movilidad o que simplemente prefieren la comodidad de consultar desde casa. También ideal para seguimientos y controles de resultados sin necesidad de desplazarse."
      slug="telemedicina"
    />
  );
}
