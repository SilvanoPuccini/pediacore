import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

function AcademicBanner() {
  return (
    <div className="bg-amber-50 border-b-2 border-amber-400 px-4 py-3 text-center">
      <div className="max-w-4xl mx-auto">
        <p className="text-amber-900 font-semibold text-sm sm:text-base">
          Este sitio web es un proyecto académico del Máster Full Stack de
          ConquerBlocks y se encuentra en fase de evaluación y prueba.
        </p>
        <p className="text-amber-800 text-xs sm:text-sm mt-1">
          El sistema de turnos y registro no está operativo. Si necesita
          contactar a la profesional, por favor utilice sus canales de contacto
          habituales.
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
      <AcademicBanner />
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}
