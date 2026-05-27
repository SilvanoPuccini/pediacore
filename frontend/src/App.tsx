import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import PublicLayout from "@/layouts/PublicLayout";
import AdminLayout from "@/layouts/AdminLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import LoginPage from "@/components/auth/LoginPage";
import RegisterPage from "@/components/auth/RegisterPage";

import HeroSection from "@/components/landing/HeroSection";
import TrustStrip from "@/components/landing/TrustStrip";
import ServicesSection from "@/components/landing/ServicesSection";
import StagesSection from "@/components/landing/StagesSection";
import ProcessSection from "@/components/landing/ProcessSection";
import AboutSection from "@/components/landing/AboutSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import BlogSection from "@/components/landing/BlogSection";
import LocationsSection from "@/components/landing/LocationsSection";
import FAQSection from "@/components/landing/FAQSection";
import CTASection from "@/components/landing/CTASection";

import AdminDashboard from "@/components/admin/AdminDashboard";
import BookingCalendar from "@/components/booking/BookingCalendar";
import { useAuthStore } from "@/stores/auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

function LandingPage() {
  return (
    <>
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
    </>
  );
}

function AppRoutes() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <PublicLayout>
            <LandingPage />
          </PublicLayout>
        }
      />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/booking"
        element={
          <PublicLayout>
            <BookingCalendar />
          </PublicLayout>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute role="DOCTOR">
            <AdminLayout>
              <AdminDashboard />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
