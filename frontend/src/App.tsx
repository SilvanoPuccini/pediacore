import Navbar from "@/components/landing/Navbar"
import HeroSection from "@/components/landing/HeroSection"
import TrustStrip from "@/components/landing/TrustStrip"
import ServicesSection from "@/components/landing/ServicesSection"
import StagesSection from "@/components/landing/StagesSection"
import ProcessSection from "@/components/landing/ProcessSection"
import AboutSection from "@/components/landing/AboutSection"
import TestimonialsSection from "@/components/landing/TestimonialsSection"
import BlogSection from "@/components/landing/BlogSection"
import LocationsSection from "@/components/landing/LocationsSection"
import FAQSection from "@/components/landing/FAQSection"
import CTASection from "@/components/landing/CTASection"
import Footer from "@/components/landing/Footer"

function App() {
  return (
    <div className="min-h-screen bg-bg text-ink overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <TrustStrip />
      <ServicesSection />
      <StagesSection />
      <ProcessSection />
      <AboutSection />
      <TestimonialsSection />
      <BlogSection />
      <LocationsSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </div>
  )
}

export default App
