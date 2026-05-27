import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-bg text-ink overflow-x-hidden">
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}
