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
  last_login: string | null;
  avatar_url?: string | null;
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
  is_published: boolean;
  published_at: string;
  tags: string;
  post_number: number | null;
  meta_description: string;
  created_at: string;
  updated_at: string;
}

export interface VideoResource {
  id: number;
  title: string;
  slug: string;
  youtube_url: string;
  youtube_embed_url: string;
  description: string;
  category: string;
  duration_seconds: number;
  duration_formatted: string;
  chapters: { time_seconds: number; label: string }[];
  thumbnail: string | null;
  video_number: number | null;
  is_published: boolean;
  published_at: string;
  view_count: number;
  author_name: string;
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

export interface CoResponsibleInfo {
  id: number;
  name: string;
  relationship: string;
  relationship_display: string;
  rut: string;
  phone: string;
  email: string;
  can_book: boolean;
  can_pickup: boolean;
}

export interface TutorPatientLink {
  id: number;
  tutor: number;
  tutor_email: string;
  tutor_full_name: string;
  tutor_phone: string;
  tutor_avatar_url?: string | null;
  relationship: string;
  is_primary: boolean;
  co_responsibles: CoResponsibleInfo[];
  created_at: string;
}

export interface Patient {
  id: number;
  practice: number;
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
  last_encounter_date?: string | null;
  next_appointment_date?: string | null;
  school_name?: string;
  grade?: string;
  birth_weight_grams?: number;
  birth_length_cm?: number;
  gestational_weeks?: number;
  birth_type?: string;
  apgar_1min?: number;
  apgar_5min?: number;
  feeding_type?: string;
  preferred_location?: number | null;
  profile_completion?: {
    percentage: number;
    missing: string[];
  };
}

export interface Appointment {
  id: number;
  patient: number;
  patient_name: string;
  patient_age: { years: number; months: number };
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
  payment_id: number | null;
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
  nombre_destinatario: string | null;
  rut_destinatario: string | null;
  cuenta_destinatario: string | null;
  banco_destinatario: string | null;
}

export interface OcrMatches {
  monto?: boolean;
  fecha?: boolean;
  rut_remitente?: boolean;
  nombre_destinatario?: boolean;
  rut_destinatario?: boolean;
  cuenta_destinatario?: boolean;
  banco_destinatario?: boolean;
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
  metadata: Record<string, unknown> | null;
  notes: string;
  receipt_file: string | null;
  receipt_uploaded_at: string | null;
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
  email_blog_posts: boolean;
  created_at: string;
  updated_at: string;
}

export interface UnreadCountResponse {
  unread_count: number;
}

// ─── Dashboard Médico ────────────────────────────────────────────────────────

export interface DashboardTopService {
  name: string;
  revenue: string;
  count: number;
}

export interface DashboardPaymentMethodBreakdown {
  method: string;
  total: string;
  count: number;
}

export interface DashboardEncounterTypeBreakdown {
  type: string;
  count: number;
}

export interface DashboardAlert {
  type: string;
  message: string;
  count: number;
  severity: "warning" | "info";
}

export interface DashboardMetrics {
  // Core metrics
  today_count: number;
  week_count: number;
  month_revenue: string;
  no_show_rate: string;
  pending_count: number;
  // Financial metrics
  avg_per_appointment: string;
  collection_rate: number;
  top_services: DashboardTopService[];
  by_payment_method: DashboardPaymentMethodBreakdown[];
  // Clinical metrics
  patients_this_week: number;
  occupancy_rate: number;
  by_encounter_type: DashboardEncounterTypeBreakdown[];
  // Smart alerts
  alerts: DashboardAlert[];
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

export interface SOAPNote {
  id: number;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface Diagnosis {
  id: number;
  code: string;
  description: string;
  is_primary: boolean;
  notes: string;
}

export interface Anthropometry {
  id: number;
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
  soap_note?: SOAPNote | null;
  public_summary?: { reason: string; plan: string } | null;
  diagnoses?: Diagnosis[];
  anthropometry?: Anthropometry | null;
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

// ─── Waitlist ─────────────────────────────────────────────────────────────────

export interface WaitlistEntry {
  id: number;
  practice: number;
  patient: number;
  patient_name: string;
  service: number;
  service_name: string;
  location: number | null;
  location_name: string;
  preferred_date_start: string;
  preferred_date_end: string | null;
  preferred_time_start: string | null;
  preferred_time_end: string | null;
  priority: "HIGH" | "NORMAL" | "LOW";
  status: "WAITING" | "NOTIFIED" | "OFFERED" | "BOOKED" | "EXPIRED" | "CANCELLED";
  status_display: string;
  notified_at: string | null;
  offer_expires_at: string | null;
  offered_appointment: number | null;
  offered_payment_id: number | null;
  position: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

// ─── Working Hours ────────────────────────────────────────────────────────────

export interface WorkingHours {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  location: number | null;
  location_name?: string;
  is_online: boolean;
  is_active: boolean;
}

// ─── Blocked Slots ──────────────────────────────────────────────────────────

export interface BlockedSlot {
  id: number;
  practice: number;
  location: number | null;
  location_name: string | null;
  start_datetime: string;
  end_datetime: string;
  reason: string;
  created_at: string;
  updated_at: string;
}

// ─── Vaccinations ────────────────────────────────────────────────────────────

export interface VaccineScheduleEntry {
  id: number;
  name: string;
  disease: string;
  dose_label: string;
  age_months: number;
  age_label: string;
  route: string;
  display_order: number;
}

export interface Vaccination {
  id: number;
  patient: number;
  patient_name: string;
  vaccine_schedule: number | null;
  vaccine_name: string;
  dose_label: string;
  lot_number: string;
  administered_at: string;
  administered_by: number | null;
  site: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface VaccinationStatus {
  patient_id: number;
  patient_name: string;
  age_months: number;
  applied: VaccineScheduleEntry[];
  pending: VaccineScheduleEntry[];
  upcoming: VaccineScheduleEntry[];
}

// ─── PatientFile ──────────────────────────────────────────────────────────────

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
