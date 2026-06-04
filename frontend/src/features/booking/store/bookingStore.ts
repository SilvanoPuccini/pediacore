import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AvailableSlot, BankDetails, BookingResponse } from "@/types/api";

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
  // Call platform (online only)
  callPlatform: "WHATSAPP" | "ZOOM" | "";
  // Step 7
  notes: string;
  acceptedPolicy: boolean;
  acceptedTerms: boolean;
  // Step 7 — payment method selection
  paymentMethod: "MERCADOPAGO" | "TRANSFER";
  // Post-submit (step 8)
  checkoutUrl: string | null;
  holdExpiresAt: string | null;      // ISO UTC string from backend
  appointmentId: number | null;
  paymentId: number | null;
  preferenceId: string | null;       // MP preference ID for Wallet Brick
  bankDetails: BankDetails | null;   // Transfer bank account info
  transferExpiresAt: string | null;  // ISO UTC — 48h window for transfer
  receiptUploaded: boolean;           // Transfer: receipt was uploaded
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
  setCallPlatform: (platform: "WHATSAPP" | "ZOOM" | "") => void;
  setNotes: (notes: string) => void;
  setAcceptedPolicy: (v: boolean) => void;
  setAcceptedTerms: (v: boolean) => void;
  setPaymentMethod: (method: "MERCADOPAGO" | "TRANSFER") => void;
  setReceiptUploaded: (v: boolean) => void;
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
  callPlatform: "",
  notes: "",
  acceptedPolicy: false,
  acceptedTerms: true,
  paymentMethod: "MERCADOPAGO",
  checkoutUrl: null,
  holdExpiresAt: null,
  appointmentId: null,
  paymentId: null,
  preferenceId: null,
  bankDetails: null,
  transferExpiresAt: null,
  receiptUploaded: false,
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

      setCallPlatform: (platform) => set({ callPlatform: platform, lastActivity: Date.now() }),

      setNotes: (notes) => set({ notes, lastActivity: Date.now() }),

      setAcceptedPolicy: (v) => set({ acceptedPolicy: v, lastActivity: Date.now() }),

      setAcceptedTerms: (v) => set({ acceptedTerms: v, lastActivity: Date.now() }),

      setPaymentMethod: (method) => set({ paymentMethod: method, lastActivity: Date.now() }),

      setReceiptUploaded: (v) => set({ receiptUploaded: v, lastActivity: Date.now() }),

      setBookingResult: (result) =>
        set({
          checkoutUrl: result.checkout_url ?? null,
          holdExpiresAt: result.hold_expires_at ?? null,
          appointmentId: result.appointment_id,
          paymentId: result.payment_id,
          preferenceId: result.preference_id ?? null,
          bankDetails: result.bank_details ?? null,
          transferExpiresAt: result.transfer_expires_at ?? null,
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
        appointmentId: state.appointmentId,
        paymentId: state.paymentId,
        checkoutUrl: state.checkoutUrl,
        holdExpiresAt: state.holdExpiresAt,
        preferenceId: state.preferenceId,
        paymentMethod: state.paymentMethod,
        bankDetails: state.bankDetails,
        transferExpiresAt: state.transferExpiresAt,
        receiptUploaded: state.receiptUploaded,
        step: state.step,
        lastActivity: state.lastActivity,
      }),
    }
  )
);
