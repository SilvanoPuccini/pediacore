import { motion } from "framer-motion";
import { GraduationCap, Award, Users, Languages } from "lucide-react";

// --- Eyebrow helper ---
function Eyebrow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="w-6 h-[1.5px] bg-teal-dark inline-block" />
      <span className="text-[11px] tracking-[0.18em] uppercase font-bold text-teal-dark">
        {label}
      </span>
    </div>
  );
}

// --- Credential grid item ---
interface CredentialItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function CredentialItem({ icon, label, value }: CredentialItemProps) {
  return (
    <div className="bg-bg rounded-[16px] p-4 flex flex-col gap-1.5">
      <div className="text-teal-dark">{icon}</div>
      <p className="text-[11px] text-ink3 uppercase tracking-wider font-semibold">
        {label}
      </p>
      <p className="text-[13.5px] text-ink font-medium leading-snug">{value}</p>
    </div>
  );
}

// --- Stat item ---
interface StatItemProps {
  value: string;
  label: string;
  colorClass: string;
}

function StatItem({ value, label, colorClass }: StatItemProps) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`font-display text-[32px] font-bold leading-none ${colorClass}`}>
        {value}
      </span>
      <span className="text-[12px] text-ink3 font-medium">{label}</span>
    </div>
  );
}

// --- Main section ---
export default function AboutSection() {
  return (
    <section id="dra-estefi" className="bg-surface border-y border-line relative overflow-hidden py-24 lg:py-32">
      {/* Decorative mustard blob top-right */}
      <div
        className="pointer-events-none absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full opacity-[0.07]"
        style={{ background: "var(--mustard)" }}
      />

      <div className="max-w-[1280px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* ── Left: photo + floating credential card ── */}
          <div className="relative flex justify-center lg:justify-start">
            {/* Gradient border frame */}
            <div
              className="rounded-[32px] p-[3px]"
              style={{
                background:
                  "linear-gradient(135deg, var(--teal) 0%, var(--peach) 50%, var(--mustard) 100%)",
              }}
            >
              <div className="rounded-[30px] overflow-hidden w-full max-w-[420px] aspect-[4/5]">
                <img
                  src="/images/dra-estefi-consultorio.jpg"
                  alt="Dra. Estefi en su consultorio"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Floating credential card */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-6 -right-4 lg:-right-10 bg-surface rounded-[16px] shadow-[var(--shadow-pop)] px-5 py-4 max-w-[240px] border border-line"
            >
              <p className="text-[11px] text-ink3 uppercase tracking-wider font-semibold mb-1">
                Registro Médico
              </p>
              <p className="text-[13.5px] text-ink font-semibold leading-snug">
                REX Nº 355
              </p>
              <p className="text-[11px] text-ink2 mt-0.5">
                Min. Educación Chile
              </p>
              <span className="inline-block mt-2 bg-teal/15 text-teal-dark text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                Verificado
              </span>
            </motion.div>
          </div>

          {/* ── Right: bio + credentials ── */}
          <div className="flex flex-col gap-6">
            <div>
              <Eyebrow label="Sobre mí" />
              <h2 className="font-display text-[36px] lg:text-[48px] leading-[1.05] text-ink tracking-tight mb-5">
                Hola, soy{" "}
                <em className="not-italic italic text-teal-dark">Estefi.</em>
              </h2>
              <div className="flex flex-col gap-4 text-[15px] text-ink2 leading-relaxed">
                <p>
                  Médica Pediatra formada en Argentina, actualmente ejerciendo en
                  práctica privada en el sur de Chile. Combino la medicina basada
                  en evidencia con una visión integrativa centrada en el paciente
                  y su entorno familiar, con enfoque en medicina funcional e
                  integrativa.
                </p>
              </div>
            </div>

            {/* 2x2 credentials grid */}
            <div className="grid grid-cols-2 gap-3">
              <CredentialItem
                icon={<GraduationCap size={18} />}
                label="Formación"
                value="U.N.C.P.B.A., Argentina, 2018"
              />
              <CredentialItem
                icon={<Award size={18} />}
                label="Especialización"
                value="Pediatría · Hosp. D. B. Villegas, 2022"
              />
              <CredentialItem
                icon={<Users size={18} />}
                label="Experiencia"
                value="8+ años de experiencia"
              />
              <CredentialItem
                icon={<Languages size={18} />}
                label="Idiomas"
                value="Español · Inglés"
              />
            </div>

            {/* Stats row */}
            <div className="flex items-center justify-between bg-bg rounded-[20px] px-6 py-5 mt-2">
              <StatItem value="8+" label="años de experiencia" colorClass="text-teal-dark" />
              <div className="w-px h-10 bg-line" />
              <StatItem value="280" label="familias atendidas" colorClass="text-coral" />
              <div className="w-px h-10 bg-line" />
              <StatItem value="4.9 ★" label="valoración promedio" colorClass="text-mustard" />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
