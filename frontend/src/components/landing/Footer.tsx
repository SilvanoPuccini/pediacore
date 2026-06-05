import { Mail, Phone, MapPin } from "lucide-react";

// --- Inline social SVGs (lucide-react v1.x doesn't include brand icons) ---
function IconInstagram({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
  );
}

// --- Social icon button ---
interface SocialLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
}

function SocialLink({ href, icon, label }: SocialLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors duration-200"
    >
      {icon}
    </a>
  );
}

// --- Footer column ---
interface FooterColumnProps {
  title: string;
  children: React.ReactNode;
}

function FooterColumn({ title, children }: FooterColumnProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[11px] tracking-[0.16em] uppercase font-bold text-white/40">
        {title}
      </p>
      <div className="flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

// --- Footer link ---
function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="text-[13.5px] text-white/70 hover:text-white transition-colors duration-200"
    >
      {children}
    </a>
  );
}

// --- Main Footer ---
export default function Footer() {
  return (
    <footer id="contacto" className="bg-ink text-white/85">
      {/* Main grid */}
      <div className="max-w-[1280px] mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Brand column */}
          <div className="flex flex-col gap-5 lg:col-span-1">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-white">
                <img
                  src="/images/logo.svg"
                  alt="Dra. Estefi Pediatra"
                  className="w-full h-full object-contain [object-position:center_60%]"
                />
              </div>
              <div>
                <p className="font-display text-[15px] font-semibold text-white leading-tight">
                  Dra. Estefi
                </p>
                <p className="text-[11px] text-white/50">Pediatra · Sur de Chile</p>
              </div>
            </div>
            {/* Tagline */}
            <p className="text-[13.5px] text-white/60 leading-relaxed max-w-[220px]">
              Pediatría con tiempo, calidez y atención personalizada en Pucón y
              Villarrica.
            </p>
            {/* Social icons */}
            <div className="flex gap-2">
              <SocialLink
                href="https://www.instagram.com/estefiortigosa.pediatra/"
                icon={<span className="text-white/70"><IconInstagram size={15} /></span>}
                label="Instagram"
              />
            </div>
          </div>

          {/* Servicios */}
          <FooterColumn title="Servicios">
            <FooterLink href="/servicios/control-nino-sano">Control de niño sano</FooterLink>
            <FooterLink href="/servicios/control-enfermedad">Control por enfermedad</FooterLink>
            <FooterLink href="/servicios/telemedicina">Consulta online</FooterLink>
            <FooterLink href="/servicios/asesoria-lactancia">Asesoría de lactancia</FooterLink>
            <FooterLink href="/servicios/alimentacion-infantil">Alimentación infantil</FooterLink>
            <FooterLink href="/servicios/sueno-desarrollo">Sueño y desarrollo</FooterLink>
          </FooterColumn>

          {/* Conocer */}
          <FooterColumn title="Conocer">
            <FooterLink href="/#dra-estefi">Sobre Estefi</FooterLink>
            <FooterLink href="/#blog">Blog</FooterLink>
            <FooterLink href="/#sedes">Sedes</FooterLink>
            <FooterLink href="/#faq">Preguntas frecuentes</FooterLink>
            <FooterLink href="/#testimonios">Testimonios</FooterLink>
          </FooterColumn>

          {/* Contacto */}
          <FooterColumn title="Contacto">
            <a
              href="mailto:estefiortigosa.pediatra@gmail.com"
              className="flex items-center gap-2.5 text-[13.5px] text-white/70 hover:text-white transition-colors duration-200"
            >
              <Mail size={14} className="shrink-0 text-teal" />
              estefiortigosa.pediatra@gmail.com
            </a>
            <a
              href="tel:+56958455537"
              className="flex items-center gap-2.5 text-[13.5px] text-white/70 hover:text-white transition-colors duration-200"
            >
              <Phone size={14} className="shrink-0 text-teal" />
              +56 9 5845 5537
            </a>
            <div className="flex items-start gap-2.5 text-[13.5px] text-white/60">
              <MapPin size={14} className="shrink-0 text-teal mt-0.5" />
              <span>Pucón &amp; Villarrica<br />La Araucanía, Chile</span>
            </div>
          </FooterColumn>

        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="max-w-[1280px] mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[12px] text-white/40">
            © 2026 Dra. Estefi Pediatra · estefipediatra.com
          </p>
          <div className="flex items-center gap-5">
            <a href="/privacy" className="text-[12px] text-white/40 hover:text-white/70 transition-colors">
              Privacidad
            </a>
            <a href="/terms" className="text-[12px] text-white/40 hover:text-white/70 transition-colors">
              Términos
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
