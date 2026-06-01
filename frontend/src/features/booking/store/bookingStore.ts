import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AvailableSlot, BookingResponse } from "@/types/api";

// ─── Step definitions ────────────────────────────────────────────────────────

export type BookingStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

// 1 = Sede
// 2 = Servicio
// 3 = Fecha y hora
// 4 = Auth (auto-skip if authenticated, hidden from indicator)
// 5 = Paciente
// 6 = Datos del tutor (first time only, hidden from indicator)
// 7 = Resumen + política + términos + confirmar
// 8 = Hold countdown / redirect a pago

// ─── State shape ──────────────────────────────────────────────────────────────

interface BookingState {
  // Step 1
  locationId: number | "online" | null;
  // Step 2
  serviceId: number | null;
  // Step 3
  selectedDate: string | null;       // "YYYY-MM-DD"
  selectedSlot: AvailableSlot | null;
  // Step 5
  patientId: number | null;
  // Step 7
  notes: string;
  acceptedPolicy: boolean;
  acceptedTerms: boolean;
  // Post-submit (step 8)
  checkoutUrl: string | null;
  holdExpiresAt: string | null;      // ISO UTC string from backend
  appointmentId: number | null;
  // Wizard
  step: BookingStep;
  lastActivity: number | null;  // Date.now() — for expiry detection
}

// ─── Actions ──────────────────────────────────────────────────────────────────

interface BookingActions {
  setStep: (step: BookingStep) => void;
  setLocation: (id: number | "online") => void;
  setService: (id: number) => void;
  setDate: (date: string) => void;
  setSlot: (slot: AvailableSlot) => void;
  setPatient: (id: number) => void;
  setNotes: (notes: string) => void;
  setAcceptedPolicy: (v: boolean) => void;
  setAcceptedTerms: (v: boolean) => void;
  setBookingResult: (result: BookingResponse) => void;
  reset: () => void;
}

type BookingStore = BookingState & BookingActions;

// ─── Initial state ────────────────────────────────────────────────────────────

const initialState: BookingState = {
  locationId: null,
  serviceId: null,
  selectedDate: null,
  selectedSlot: null,
  patientId: null,
  notes: "",
  acceptedPolicy: false,
  acceptedTerms: false,
  checkoutUrl: null,
  holdExpiresAt: null,
  appointmentId: null,
  step: 1,
  lastActivity: null,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useBookingStore = create<BookingStore>()(
  persist(
    (set) => ({
      ...initialState,

      setStep: (step) => set({ step, lastActivity: Date.now() }),

      setLocation: (id) =>
        set({ locationId: id, serviceId: null, selectedDate: null, selectedSlot: null, lastActivity: Date.now() }),

      setService: (id) =>
        set({ serviceId: id, selectedDate: null, selectedSlot: null, lastActivity: Date.now() }),

      setDate: (date) => set({ selectedDate: date, selectedSlot: null, lastActivity: Date.now() }),

      setSlot: (slot) => set({ selectedSlot: slot, lastActivity: Date.now() }),

      setPatient: (id) => set({ patientId: id, lastActivity: Date.now() }),

      setNotes: (notes) => set({ notes, lastActivity: Date.now() }),

      setAcceptedPolicy: (v) => set({ acceptedPolicy: v, lastActivity: Date.now() }),

      setAcceptedTerms: (v) => set({ acceptedTerms: v, lastActivity: Date.now() }),

      setBookingResult: (result) =>
        set({
          checkoutUrl: result.checkout_url,
          holdExpiresAt: result.hold_expires_at,
          appointmentId: result.appointment_id,
          lastActivity: Date.now(),
        }),

      reset: () => set(initialState),
    }),
    {
      name: "booking-store",
      partialize: (state) => ({
        locationId: state.locationId,
        serviceId: state.serviceId,
        selectedDate: state.selectedDate,
        selectedSlot: state.selectedSlot,
        patientId: state.patientId,
        step: state.step,
        lastActivity: state.lastActivity,
      }),
    }
  )
);
