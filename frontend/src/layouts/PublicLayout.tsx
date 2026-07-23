import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

function AcademicBanner() {
  return (
    <div className="bg-amber-50 border-y-2 border-amber-400 px-4 py-3 text-center">
      <div className="max-w-4xl mx-auto">
        <p className="text-amber-900 font-semibold text-sm sm:text-base">
          Esta es una página web de prueba académica del Máster Full Stack de
          ConquerBlocks. No es un sitio para solicitar turnos.
        </p>
        <p className="text-amber-800 text-xs sm:text-sm mt-1">
          Si necesita contactar a la profesional, por favor utilice sus canales
          de contacto habituales.
        </p>
      </div>
    </div>
  );
}

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-bg text-ink overflow-x-hidden">
      <Navbar />
      <AcademicBanner />
      {children}
      <Footer />
    </div>
  );
}
