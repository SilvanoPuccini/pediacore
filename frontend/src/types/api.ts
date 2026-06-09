export type DocumentType = "RUT" | "DNI" | "PASAPORTE" | "OTRO";

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  phone_prefix: string;
  phone_alt: string;
  document_type: DocumentType;
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
  document_type: DocumentType;
  rut: string;
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
  payment_method?: "MERCADOPAGO" | "TRANSFER";
}

export interface BankDetails {
  bank_name: string;
  account_type: string;
  account_number: string;
  account_holder: string;
  account_rut: string;
  account_email: string;
}

export interface BookingResponse {
  appointment_id: number;
  payment_id: number;
  checkout_url?: string;
  preference_id?: string;
  payment_method?: string;
  bank_details?: BankDetails;
  transfer_expires_at?: string;
  hold_expires_at?: string;
}

export interface PatientCreate {
  first_name: string;
  last_name: string;
  date_of_birth: string;                           // "YYYY-MM-DD"
  sex_at_birth: "M" | "F" | "NO_ESPECIFICA";
  document_type: DocumentType;
  rut: string;
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
  age: { years: number; months: number };
  sex_at_birth: "M" | "F" | "NO_ESPECIFICA";
  document_type: DocumentType;
  rut: string;
  blood_type: string;
  allergies: string;
  chronic_conditions: string;
  insurance: string;
  notes: string;
  photo: string | null;
  is_active: boolean;
  country: string;
  region: string;
  comuna: string;
  address: string;
  phone: string;
  phone_prefix: string;
  created_at: string;
  updated_at: string;
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

export interface OcrExtracted {
  monto: number | null;
  fecha: string | null;
  rut_remitente: string | null;
  banco_origen: string | null;
}

export interface OcrMatches {
  monto?: boolean;
  fecha?: boolean;
}

export interface OcrResult {
  extracted: OcrExtracted;
  matches: OcrMatches;
  confidence: number;
  analyzed_at: string;
  error?: string;
}

export interface PendingTransferPayment {
  id: number;
  appointment: number;
  patient_name: string;
  amount: string;
  currency: string;
  status: string;
  payment_method: string;
  receipt_file: string | null;
  receipt_uploaded_at: string | null;
  created_at: string;
  service_name: string | null;
  scheduled_date: string | null;
  metadata?: {
    ocr_result?: OcrResult;
    [key: string]: unknown;
  };
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

// ─── Notifications ────────────────────────────────────────────────────────────

export interface Notification {
  id: number;
  notification_type: string;
  notification_type_display: string;
  title: string;
  message: string;
  is_read: boolean;
  read_at: string | null;
  related_type: string;
  related_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreference {
  id: number;
  email_appointment_reminder: boolean;
  email_appointment_confirmed: boolean;
  email_appointment_cancelled: boolean;
  email_waitlist_available: boolean;
  email_payment_received: boolean;
  created_at: string;
  updated_at: string;
}

export interface UnreadCountResponse {
  unread_count: number;
}

// ─── Dashboard Médico ────────────────────────────────────────────────────────

export interface DashboardMetrics {
  turnos_hoy: number;
  turnos_semana: number;
  ingresos_mes: string;
  no_show_rate: string;
  pendientes: number;
}

export interface RevenuePoint {
  day: string;
  ingreso: string;
}

export interface DashboardReminder {
  type: "birthday";
  title: string;
  detail: string;
  patient_id: number;
}

// ─── Medical Records ─────────────────────────────────────────────────────────

export interface Encounter {
  id: number;
  patient: number;
  patient_name: string;
  doctor: number;
  doctor_name: string;
  encounter_type: string;
  encounter_type_display: string;
  status: string;
  status_display: string;
  scheduled_at: string;
  reason_for_visit: string;
  created_at: string;
}

export interface GrowthPoint {
  encounter_id: number;
  encounter_date: string;
  age_months: number | null;
  weight_kg: string;
  height_cm: string;
  head_circumference_cm: string | null;
  bmi: string | null;
  weight_for_age_z: number | null;
  height_for_age_z: number | null;
  head_circumference_for_age_z: number | null;
  bmi_for_age_z: number | null;
  weight_for_age_percentile: number | null;
  height_for_age_percentile: number | null;
  head_circumference_for_age_percentile: number | null;
  bmi_for_age_percentile: number | null;
}

export interface CoResponsible {
  id: number;
  name: string;
  relationship: string;
  relationship_display: string;
  rut: string;
  phone: string;
  email: string;
  can_book: boolean;
  can_pickup: boolean;
  created_at: string;
}

export interface PatientFile {
  id: number;
  patient: number;
  uploaded_by: number;
  uploaded_by_email: string;
  file: string;
  original_filename: string;
  file_type: "LAB_RESULT" | "IMAGE" | "PRESCRIPTION" | "CERTIFICATE" | "OTHER";
  description: string;
  file_size: number;
  created_at: string;
}
