export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  phone_prefix: string;
  phone_alt: string;
  rut: string;
  role: "VISITOR" | "TUTOR" | "DOCTOR";
  full_name: string;
  is_email_verified: boolean;
  created_at: string;
  profile_completion?: {
    percentage: number;
    missing: string[];
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  phone: string;
}

export interface TokenResponse {
  access: string;
  refresh: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string | null;
  author_name: string;
  published_at: string;
  tags: string;
  meta_description: string;
  created_at: string;
  updated_at: string;
}

export interface FAQ {
  id: number;
  question: string;
  answer: string;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: number;
  name: string;
  slug: string;
  address: string;
  city: string;
  region: string;
  phone: string;
  email: string;
  display_hours: string;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
}

export interface Service {
  id: number;
  name: string;
  description: string;
  duration_minutes: number;
  price_clp: number;
  modality: "PRESENCIAL" | "ONLINE" | "PRESENCIAL_Y_ONLINE";
  modality_display: string;
  requires_fonasa_validation: boolean;
  requires_manual_coordination: boolean;
  display_order: number;
  is_active: boolean;
  locations: number[];
}

export interface AvailableSlot {
  start_time: string;
  end_time: string;
  available: boolean;
}

// ─── Booking Phase 6 types ────────────────────────────────────────────────────

export interface BookingRequest {
  practice: number;
  patient: number;
  service: number;
  location: number | null;
  doctor: number;
  scheduled_date: string;  // "YYYY-MM-DD"
  start_time: string;      // "HH:MM:SS"
  is_online: boolean;
  call_platform?: "WHATSAPP" | "ZOOM" | "";
  notes: string;
}

export interface BookingResponse {
  checkout_url: string;
  hold_expires_at: string;   // ISO UTC datetime
  appointment_id: number;
  payment_id: number;
}

export interface PatientCreate {
  first_name: string;
  last_name: string;
  date_of_birth: string;                           // "YYYY-MM-DD"
  sex_at_birth: "M" | "F" | "NO_ESPECIFICA";
  document_type: "RUT" | "PASAPORTE" | "DNI_EXTRANJERO";
  rut?: string;
  insurance?: string;
  country: string;
  practice: number;
}

export interface TutorPatientLink {
  id: number;
  tutor: number;
  tutor_email: string;
  tutor_full_name: string;
  relationship: string;
  is_primary: boolean;
  created_at: string;
}

export interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  date_of_birth: string;
  sex_at_birth: "M" | "F" | "NO_ESPECIFICA";
  document_type: "RUT" | "PASAPORTE" | "DNI_EXTRANJERO";
  rut: string;
  insurance: string;
  country: string;
  region: string;
  comuna: string;
  address: string;
  phone: string;
  phone_prefix: string;
  created_at: string;
  tutors: TutorPatientLink[];
  profile_completion?: {
    percentage: number;
    missing: string[];
  };
}

export interface Appointment {
  id: number;
  patient: number;
  patient_name: string;
  service: number;
  service_name: string;
  location: number;
  location_name: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  status: string;
  status_display: string;
  is_online: boolean;
  call_platform: "WHATSAPP" | "ZOOM" | "";
  hold_expires_at: string | null;
  meeting_link: string;
  attendance_confirmed: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface AppointmentDetail extends Appointment {
  doctor_email: string;
  cancellation_reason: string;
  cancelled_at: string | null;
  confirmed_at: string | null;
  rescheduled_from: number | null;
  rescheduled_at: string | null;
  payment_id: number | null;
}

export interface Payment {
  id: number;
  appointment: number;
  amount: string;
  currency: string;
  status: string;
  provider: string;
  reference_id: string;
  created_at: string;
}

export interface PaymentListItem {
  id: number;
  appointment: number;
  patient_name: string;
  amount: string;
  currency: string;
  status: string;
  status_display: string;
  payment_method: string;
  payment_method_display: string;
  paid_at: string | null;
  created_at: string;
  service_name: string | null;
  scheduled_date: string | null;
  start_time: string | null;
  location_name: string | null;
  is_online: boolean;
}

export interface PaymentDetail extends PaymentListItem {
  paid_by: number | null;
  paid_by_email: string | null;
  paid_by_name: string | null;
  patient_rut: string;
  external_id: string;
  external_status: string;
  notes: string;
  has_invoice: boolean;
  invoice_id: number | null;
  invoice_number: string | null;
  duration_minutes: number | null;
}

export interface InvoiceListItem {
  id: number;
  payment: number;
  invoice_number: string;
  patient_name: string;
  service_description: string;
  total: string;
  issued_at: string;
  has_pdf: boolean;
}
