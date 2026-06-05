import { UtensilsCrossed } from "lucide-react";
import ServiceDetailPage from "./ServiceDetailPage";

export default function AlimentacionInfantilPage() {
  return (
    <ServiceDetailPage
      title="Alimentación infantil"
      description="Orientación para alimentación complementaria y hábitos saludables desde los primeros meses."
      icon={UtensilsCrossed}
      iconBg="bg-[var(--peach)]/30"
      iconColor="text-[var(--coral)]"
      accentVar="peach"
      duration="45 minutos"
      modality="Presencial"
      includes={[
        "Evaluación de hábitos alimentarios actuales del niño",
        "Orientación para el inicio de alimentación complementaria",
        "Guía de texturas, alimentos y progresión según la edad",
        "Abordaje de selectividad alimentaria y neofobia",
        "Enfoque integrativo centrado en el niño y su entorno familiar",
      ]}
      idealFor="Familias que están comenzando la alimentación complementaria (a partir de los 6 meses), o que tienen dudas sobre la alimentación de su hijo en cualquier etapa. Especialmente útil ante selectividad alimentaria, bajo peso o cuando el niño rechaza ciertos alimentos."
      slug="alimentacion-infantil"
    />
  );
}
