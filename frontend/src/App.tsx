import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import SEOHead from "@/components/seo/SEOHead";
import PublicLayout from "@/layouts/PublicLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

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

import { useAuthStore } from "@/stores/auth";

const LoginPage = lazy(() => import("@/components/auth/LoginPage"));
const RegisterPage = lazy(() => import("@/components/auth/RegisterPage"));
const BookingCalendar = lazy(() => import("@/components/booking/BookingCalendar"));
const BookingConfirmed = lazy(() => import("@/features/booking/BookingConfirmed"));
const TermsPage = lazy(() => import("@/pages/TermsPage"));
const PrivacyPage = lazy(() => import("@/pages/PrivacyPage"));
const AdminLayout = lazy(() => import("@/layouts/AdminLayout"));
const AdminDashboard = lazy(() => import("@/components/admin/AdminDashboard"));
const TutorLayout = lazy(() => import("@/layouts/TutorLayout"));
const TutorDashboard = lazy(() => import("@/features/tutor/pages/Dashboard"));
const MyAppointments = lazy(() => import("@/features/tutor/pages/MyAppointments"));
const AppointmentDetail = lazy(() => import("@/features/tutor/pages/AppointmentDetail"));
const MyChildren = lazy(() => import("@/features/tutor/pages/MyChildren"));
const ChildDetail = lazy(() => import("@/features/tutor/pages/ChildDetail"));
const MyProfile = lazy(() => import("@/features/tutor/pages/MyProfile"));
const BillingHistory = lazy(() => import("@/features/tutor/pages/BillingHistory"));
const TokenAction = lazy(() => import("@/features/tutor/pages/TokenAction"));
const RescheduleFromToken = lazy(() => import("@/features/tutor/pages/RescheduleFromToken"));

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
      <SEOHead url="https://estefipediatra.com/" />
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
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-bg">
          <div className="w-8 h-8 border-3 border-teal/30 border-t-teal rounded-full animate-spin" />
        </div>
      }
    >
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
          path="/booking/confirmed"
          element={
            <PublicLayout>
              <BookingConfirmed />
            </PublicLayout>
          }
        />
        <Route
          path="/terms"
          element={
            <PublicLayout>
              <TermsPage />
            </PublicLayout>
          }
        />
        <Route
          path="/privacy"
          element={
            <PublicLayout>
              <PrivacyPage />
            </PublicLayout>
          }
        />
        <Route
          path="/portal"
          element={
            <ProtectedRoute role="TUTOR">
              <TutorLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<TutorDashboard />} />
          <Route path="turnos" element={<MyAppointments />} />
          <Route path="turnos/:id" element={<AppointmentDetail />} />
          <Route path="hijos" element={<MyChildren />} />
          <Route path="hijos/:id" element={<ChildDetail />} />
          <Route path="perfil" element={<MyProfile />} />
          <Route path="pagos" element={<BillingHistory />} />
        </Route>
        <Route path="/a/:token" element={<TokenAction />} />
        <Route path="/a/:token/reschedule" element={<RescheduleFromToken />} />
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
    </Suspense>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ScrollToTop />
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
