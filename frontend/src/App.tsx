import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
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
const ForgotPasswordPage = lazy(() => import("@/components/auth/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/components/auth/ResetPasswordPage"));
const BookingCalendar = lazy(() => import("@/components/booking/BookingCalendar"));
const BookingConfirmed = lazy(() => import("@/features/booking/BookingConfirmed"));
const TermsPage = lazy(() => import("@/pages/TermsPage"));
const PrivacyPage = lazy(() => import("@/pages/PrivacyPage"));
const DoctorDashboard = lazy(() => import("@/features/doctor/pages/Dashboard"));
const DoctorLayout = lazy(() => import("@/layouts/DoctorLayout"));
const DoctorPatients = lazy(() => import("@/features/doctor/pages/Patients"));
const DoctorPatientFicha = lazy(() => import("@/features/doctor/pages/PatientFicha"));
const DoctorCalendar = lazy(() => import("@/features/doctor/pages/Calendar"));
const TutorLayout = lazy(() => import("@/layouts/TutorLayout"));
const TutorDashboard = lazy(() => import("@/features/tutor/pages/Dashboard"));
const MyAppointments = lazy(() => import("@/features/tutor/pages/MyAppointments"));
const AppointmentDetail = lazy(() => import("@/features/tutor/pages/AppointmentDetail"));
const MyChildren = lazy(() => import("@/features/tutor/pages/MyChildren"));
const ChildDetail = lazy(() => import("@/features/tutor/pages/ChildDetail"));
const MyProfile = lazy(() => import("@/features/tutor/pages/MyProfile"));
const BillingHistory = lazy(() => import("@/features/tutor/pages/BillingHistory"));
const PaymentReceipt = lazy(() => import("@/features/tutor/pages/PaymentReceipt"));
const TokenAction = lazy(() => import("@/features/tutor/pages/TokenAction"));
const RescheduleFromToken = lazy(() => import("@/features/tutor/pages/RescheduleFromToken"));
const NotificationsPage = lazy(() => import("@/features/tutor/pages/Notifications"));
const ControlNinoSanoPage = lazy(() => import("@/pages/services/ControlNinoSanoPage"));
const ControlEnfermedadPage = lazy(() => import("@/pages/services/ControlEnfermedadPage"));
const TelemedicinaPage = lazy(() => import("@/pages/services/TelemedicinaPage"));
const AsesoriaLactanciaPage = lazy(() => import("@/pages/services/AsesoriaLactanciaPage"));
const AlimentacionInfantilPage = lazy(() => import("@/pages/services/AlimentacionInfantilPage"));
const SuenoDesarrolloPage = lazy(() => import("@/pages/services/SuenoDesarrolloPage"));

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
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:uid/:token" element={<ResetPasswordPage />} />
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
          path="/servicios/control-nino-sano"
          element={
            <PublicLayout>
              <ControlNinoSanoPage />
            </PublicLayout>
          }
        />
        <Route
          path="/servicios/control-enfermedad"
          element={
            <PublicLayout>
              <ControlEnfermedadPage />
            </PublicLayout>
          }
        />
        <Route
          path="/servicios/telemedicina"
          element={
            <PublicLayout>
              <TelemedicinaPage />
            </PublicLayout>
          }
        />
        <Route
          path="/servicios/asesoria-lactancia"
          element={
            <PublicLayout>
              <AsesoriaLactanciaPage />
            </PublicLayout>
          }
        />
        <Route
          path="/servicios/alimentacion-infantil"
          element={
            <PublicLayout>
              <AlimentacionInfantilPage />
            </PublicLayout>
          }
        />
        <Route
          path="/servicios/sueno-desarrollo"
          element={
            <PublicLayout>
              <SuenoDesarrolloPage />
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
          <Route path="pagos/:id" element={<PaymentReceipt />} />
          <Route path="notificaciones" element={<NotificationsPage />} />
        </Route>
        <Route path="/a/:token" element={<TokenAction />} />
        <Route path="/a/:token/reschedule" element={<RescheduleFromToken />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute role="DOCTOR">
              <DoctorLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DoctorDashboard />} />
          <Route path="pacientes" element={<DoctorPatients />} />
          <Route path="pacientes/:id" element={<DoctorPatientFicha />} />
          <Route path="calendario" element={<DoctorCalendar />} />
        </Route>
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
