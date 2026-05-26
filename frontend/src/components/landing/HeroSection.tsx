import { motion, type Variants } from "framer-motion";
import { ArrowRight, Star } from "lucide-react";
import { cn } from "@/lib/utils";

// Stagger entrance: translateY only, no opacity
const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const itemVariants: Variants = {
  hidden: { y: 32 },
  visible: {
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

const imageVariants: Variants = {
  hidden: { y: 40 },
  visible: {
    y: 0,
    transition: { duration: 0.8, ease: "easeOut", delay: 0.2 },
  },
};

// Fake avatar gradient configs
const AVATAR_GRADIENTS = [
  "from-[var(--teal)] to-[var(--teal-dark)]",
  "from-[var(--coral)] to-[var(--peach)]",
  "from-[var(--mustard)] to-[var(--sage)]",
  "from-[var(--sage)] to-[var(--teal)]",
];

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center pt-[104px] pb-16 overflow-hidden">
      {/* Decorative blobs */}
      <div
        aria-hidden="true"
        className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full
          bg-[var(--teal)]/20 blur-[120px] pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute top-1/2 -right-40 w-[400px] h-[400px] rounded-full
          bg-[var(--coral)]/18 blur-[100px] pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-1/3 w-[320px] h-[320px] rounded-full
          bg-[var(--mustard)]/14 blur-[90px] pointer-events-none"
      />

      <div className="max-w-[1280px] mx-auto px-6 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — copy */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-6"
          >
            {/* Badge */}
            <motion.div variants={itemVariants}>
              <span
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full
                  bg-[var(--teal)]/12 border border-[var(--teal)]/25
                  text-[11px] tracking-[0.18em] uppercase font-bold text-[var(--teal-dark)]"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[var(--teal-dark)]"
                  aria-hidden="true"
                />
                Pediatría · Pucón &amp; Villarrica
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={itemVariants}
              className="font-display text-[38px] lg:text-[52px] leading-[1.05] text-[var(--ink)] tracking-tight"
            >
              Una pediatra{" "}
              <em className="not-italic italic text-[var(--teal-dark)]">
                cercana
              </em>{" "}
              para acompañar el crecimiento de tu hijo
              <span className="text-[var(--coral)]">.</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={itemVariants}
              className="text-[15px] text-[var(--ink2)] leading-relaxed max-w-[480px]"
            >
              Atención presencial u online, desde recién nacidos hasta los
              18&nbsp;años. Con tiempo, calidez y seguimiento real para cada
              familia.
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={itemVariants}
              className="flex flex-wrap gap-3"
            >
              <a
                href="#reservar"
                className={cn(
                  "relative overflow-hidden flex items-center gap-2",
                  "px-6 py-3.5 rounded-[12px] text-[14px] font-semibold text-white",
                  "bg-[var(--teal-dark)] shadow-[var(--shadow-cta)]",
                  "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgba(74,133,144,0.38)]",
                  "group"
                )}
              >
                <span
                  className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700
                    bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]"
                  aria-hidden="true"
                />
                Reservar consulta
                <ArrowRight size={15} />
              </a>
              <a
                href="#servicios"
                className={cn(
                  "flex items-center gap-2 px-6 py-3.5 rounded-[12px] text-[14px] font-semibold",
                  "text-[var(--ink)] bg-[var(--surface)] border border-[var(--line)]",
                  "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]"
                )}
              >
                Conocer servicios
              </a>
            </motion.div>

            {/* Social proof */}
            <motion.div
              variants={itemVariants}
              className="flex items-center gap-4 pt-2"
            >
              {/* Avatar stack */}
              <div className="flex -space-x-2">
                {AVATAR_GRADIENTS.map((grad, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-9 h-9 rounded-full border-2 border-[var(--bg)] bg-gradient-to-br",
                      grad
                    )}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[13px] font-semibold text-[var(--ink)]">
                  +280 familias acompañadas
                </span>
                <span className="flex items-center gap-1 text-[12px] text-[var(--ink2)]">
                  <Star
                    size={12}
                    className="fill-[var(--mustard)] text-[var(--mustard)]"
                  />
                  4.9 · valoración promedio
                </span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right — image */}
          <motion.div
            variants={imageVariants}
            initial="hidden"
            animate="visible"
            className="relative flex justify-center lg:justify-end"
          >
            {/* Organic oval container */}
            <div
              className="relative w-[340px] h-[420px] lg:w-[420px] lg:h-[520px] overflow-hidden"
              style={{
                borderRadius: "44% 56% 60% 40% / 50% 45% 55% 50%",
                background:
                  "linear-gradient(135deg, var(--sage) 0%, var(--teal) 50%, #7ecfd0 100%)",
              }}
            >
              {/* Rainbow overlay top-left */}
              <img
                src="/rainbow.png"
                alt=""
                aria-hidden="true"
                className="absolute -top-4 -left-4 w-28 h-28 object-contain opacity-90 z-10"
              />

              {/* Doctor cutout bottom-right */}
              <img
                src="/estefi-cutout.png"
                alt="Dra. Estefi, pediatra"
                className="absolute bottom-0 right-0 h-[95%] object-contain object-bottom z-20"
              />
            </div>

            {/* Floating accent — top right */}
            <div
              aria-hidden="true"
              className="absolute top-4 right-0 w-16 h-16 rounded-full
                bg-[var(--mustard)]/30 blur-xl"
            />
            {/* Floating accent — bottom left */}
            <div
              aria-hidden="true"
              className="absolute bottom-8 -left-4 w-12 h-12 rounded-full
                bg-[var(--coral)]/30 blur-lg"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
