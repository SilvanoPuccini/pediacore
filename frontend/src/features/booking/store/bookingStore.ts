import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AvailableSlot, BookingResponse } from "@/types/api";

// ─── State shape ──────────────────────────────────────────────────────────────

interface BookingState {
  // Step 1
  locationId: number | "online" | null;
  serviceId: number | null;
  // Step 2
  selectedDate: string | null;       // "YYYY-MM-DD"
  selectedSlot: AvailableSlot | null;
  // Step 3
  patientId: number | null;
  notes: string;
  // Post-submit
  checkoutUrl: string | null;
  holdExpiresAt: string | null;      // ISO UTC string from backend
  appointmentId: number | null;
  // Wizard
  step: 1 | 2 | 3;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

interface BookingActions {
  setStep: (step: 1 | 2 | 3) => void;
  setLocation: (id: number | "online") => void;
  setService: (id: number) => void;
  setDate: (date: string) => void;
  setSlot: (slot: AvailableSlot) => void;
  setPatient: (id: number) => void;
  setNotes: (notes: string) => void;
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
        set({ locationId: id, serviceId: null }),

      setService: (id) => set({ serviceId: id }),

      setDate: (date) => set({ selectedDate: date, selectedSlot: null }),

      setSlot: (slot) => set({ selectedSlot: slot }),

      setPatient: (id) => set({ patientId: id }),

      setNotes: (notes) => set({ notes }),

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
      // Only persist what's needed to survive an auth redirect
      partialize: (state) => ({
        locationId: state.locationId,
        serviceId: state.serviceId,
        step: state.step,
      }),
    }
  )
);
