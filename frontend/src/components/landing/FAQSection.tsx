import { ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { FAQ, PaginatedResponse } from "@/types/api";

// --- Eyebrow helper ---
function Eyebrow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-4">
      <span className="w-6 h-[1.5px] bg-teal-dark inline-block" />
      <span className="text-[11px] tracking-[0.18em] uppercase font-bold text-teal-dark">
        {label}
      </span>
    </div>
  );
}

// --- Fallback data ---
interface FallbackFAQ {
  question: string;
  answer: string;
}

const FALLBACK_FAQS: FallbackFAQ[] = [
  {
    question: "¿Atienden a recién nacidos?",
    answer:
      "Sí, atendemos desde los primeros días de vida. El control del recién nacido es uno de los momentos más importantes y nos preparamos especialmente para acompañar a las familias en esa etapa. Podés reservar el primer control antes del parto para asegurarte el turno.",
  },
  {
    question: "¿Trabajan con isapres o sólo particular?",
    answer:
      "Por ahora trabajamos únicamente en modalidad particular. Al finalizar la consulta podés solicitar el bono de atención para presentarlo a tu isapre y tramitar el reembolso según tu plan. La mayoría de las isapres cubren entre el 50 % y el 90 % del arancel.",
  },
  {
    question: "¿Cuánto dura una consulta?",
    answer:
      "Las consultas de control tienen una duración de 40 minutos. Las consultas por enfermedad tienen un bloque de 30 minutos. Siempre reservamos tiempo suficiente para responder todas las preguntas sin apuros.",
  },
  {
    question: "¿Cómo es la consulta online?",
    answer:
      "La consulta online se realiza por videollamada a través de Google Meet. Antes de la cita recibís el enlace por email. Es ideal para controles de seguimiento, dudas sobre alimentación, sueño o desarrollo, y para familias que viven fuera de Pucón y Villarrica.",
  },
  {
    question: "¿Puedo cancelar o cambiar el turno?",
    answer:
      "Podés cancelar o reprogramar sin costo hasta 24 horas antes de la consulta. Cancelaciones con menos de 24 horas tienen un cargo del 30 % del valor de la consulta. En caso de urgencia o enfermedad, escribinos y lo evaluamos caso a caso.",
  },
  {
    question: "¿Atienden urgencias?",
    answer:
      "Tenemos turnos de urgencia disponibles los días hábiles para niños con fiebre alta, dificultad respiratoria, rash o cualquier situación que no pueda esperar. Para urgencias fuera del horario de atención, te recomendamos dirigirte al servicio de urgencia del Hospital Regional de Villarrica o la CESFAM más cercana.",
  },
];

// --- FAQ Accordion Item ---
function FAQAccordionItem({
  question,
  answer,
  defaultOpen,
}: {
  question: string;
  answer: string;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="group border-b border-line last:border-b-0"
      open={defaultOpen}
    >
      <summary className="flex items-center justify-between gap-4 py-5 cursor-pointer list-none select-none hover:text-teal-dark transition-colors duration-200">
        <span className="text-[15px] font-semibold text-ink group-open:text-teal-dark transition-colors duration-200">
          {question}
        </span>
        <ChevronDown
          size={18}
          className="shrink-0 text-ink3 group-open:rotate-180 group-open:text-teal-dark transition-all duration-300"
        />
      </summary>
      <div className="pb-5">
        <p className="text-[14px] text-ink2 leading-relaxed">{answer}</p>
      </div>
    </details>
  );
}

// --- Loading skeleton ---
function FAQSkeleton() {
  return (
    <div className="bg-bg rounded-[20px] border border-line px-6 lg:px-8 animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="border-b border-line last:border-b-0 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="h-4 bg-line rounded-full w-3/4" />
            <div className="h-4 w-4 bg-line rounded-full shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Main section ---
export default function FAQSection() {
  const { data, isLoading, isError } = useQuery<PaginatedResponse<FAQ>>({
    queryKey: ["faqs"],
    queryFn: () => api.get<PaginatedResponse<FAQ>>("/content/faqs/").then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });

  const apiFaqs = data?.results ?? [];
  const useFallback = !isLoading && (isError || apiFaqs.length === 0);

  return (
    <section id="faq" className="bg-surface border-y border-line py-24 lg:py-32">
      <div className="max-w-[920px] mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <Eyebrow label="Preguntas frecuentes" />
          <h2 className="font-display text-[36px] lg:text-[48px] leading-[1.05] text-ink tracking-tight">
            ¿Dudas antes de reservar?
          </h2>
        </div>

        {/* Accordion */}
        {isLoading ? (
          <FAQSkeleton />
        ) : (
          <div className="bg-bg rounded-[20px] border border-line px-6 lg:px-8">
            {useFallback
              ? FALLBACK_FAQS.map((item, i) => (
                  <FAQAccordionItem
                    key={item.question}
                    question={item.question}
                    answer={item.answer}
                    defaultOpen={i === 0}
                  />
                ))
              : apiFaqs.map((item, i) => (
                  <FAQAccordionItem
                    key={item.id}
                    question={item.question}
                    answer={item.answer}
                    defaultOpen={i === 0}
                  />
                ))}
          </div>
        )}

        {/* Bottom CTA */}
        <p className="text-center text-[14px] text-ink2 mt-8">
          ¿Otra duda?{" "}
          <a
            href="https://wa.me/56958455537"
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-dark font-semibold hover:underline"
          >
            Escribinos.
          </a>
        </p>
      </div>
    </section>
  );
}
