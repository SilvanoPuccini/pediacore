export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: "VISITOR" | "TUTOR" | "DOCTOR";
  full_name: string;
  is_email_verified: boolean;
  created_at: string;
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
  price: string;
  is_online_available: boolean;
  is_active: boolean;
  locations: number[];
}

export interface AvailableSlot {
  start_time: string;
  end_time: string;
  available: boolean;
}

export interface AppointmentCreate {
  practice: number;
  patient: number;
  service: number;
  location: number;
  doctor: number;
  scheduled_date: string;
  start_time: string;
  is_online: boolean;
  notes: string;
}

export interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  date_of_birth: string;
  gender: string;
  rut: string;
  created_at: string;
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
  notes: string;
  created_at: string;
  updated_at: string;
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
