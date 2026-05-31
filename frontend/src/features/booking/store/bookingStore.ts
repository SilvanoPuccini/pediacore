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
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useBookingStore = create<BookingStore>()(
  persist(
    (set) => ({
      ...initialState,

      setStep: (step) => set({ step }),

      setLocation: (id) =>
        set({ locationId: id, serviceId: null, selectedDate: null, selectedSlot: null }),

      setService: (id) =>
        set({ serviceId: id, selectedDate: null, selectedSlot: null }),

      setDate: (date) => set({ selectedDate: date, selectedSlot: null }),

      setSlot: (slot) => set({ selectedSlot: slot }),

      setPatient: (id) => set({ patientId: id }),

      setNotes: (notes) => set({ notes }),

      setAcceptedPolicy: (v) => set({ acceptedPolicy: v }),

      setAcceptedTerms: (v) => set({ acceptedTerms: v }),

      setBookingResult: (result) =>
        set({
          checkoutUrl: result.checkout_url,
          holdExpiresAt: result.hold_expires_at,
          appointmentId: result.appointment_id,
        }),

      reset: () => set(initialState),
    }),
    {
      name: "booking-store",
      partialize: (state) => ({
        locationId: state.locationId,
        serviceId: state.serviceId,
        selectedDate: state.selectedDate,
        step: state.step,
      }),
    }
  )
);
