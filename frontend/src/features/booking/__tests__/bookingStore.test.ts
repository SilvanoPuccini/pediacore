import { describe, it, expect, beforeEach } from "vitest";
import { useBookingStore } from "../store/bookingStore";
import type { AvailableSlot, BookingResponse } from "@/types/api";

const mockSlot: AvailableSlot = {
  start_time: "09:00:00",
  end_time: "09:30:00",
  available: true,
};

const mockBookingResponse: BookingResponse = {
  appointment_id: 42,
  checkout_url: "https://mp.com/checkout/123",
  hold_expires_at: "2026-05-30T10:00:00Z",
  payment_id: 99,
};

beforeEach(() => {
  useBookingStore.getState().reset();
});

describe("bookingStore", () => {
  it("has correct initial state", () => {
    const state = useBookingStore.getState();
    expect(state.locationId).toBeNull();
    expect(state.serviceId).toBeNull();
    expect(state.selectedDate).toBeNull();
    expect(state.selectedSlot).toBeNull();
    expect(state.patientId).toBeNull();
    expect(state.notes).toBe("");
    expect(state.acceptedPolicy).toBe(false);
    expect(state.acceptedTerms).toBe(false);
    expect(state.checkoutUrl).toBeNull();
    expect(state.holdExpiresAt).toBeNull();
    expect(state.appointmentId).toBeNull();
    expect(state.step).toBe(1);
  });

  it("setLocation sets locationId and clears downstream state", () => {
    useBookingStore.getState().setService(5);
    useBookingStore.getState().setDate("2026-06-01");
    useBookingStore.getState().setSlot(mockSlot);
    useBookingStore.getState().setLocation(1);
    const state = useBookingStore.getState();
    expect(state.locationId).toBe(1);
    expect(state.serviceId).toBeNull();
    expect(state.selectedDate).toBeNull();
    expect(state.selectedSlot).toBeNull();
  });

  it("setService sets serviceId and clears date/slot", () => {
    useBookingStore.getState().setDate("2026-06-01");
    useBookingStore.getState().setSlot(mockSlot);
    useBookingStore.getState().setService(3);
    const state = useBookingStore.getState();
    expect(state.serviceId).toBe(3);
    expect(state.selectedDate).toBeNull();
    expect(state.selectedSlot).toBeNull();
  });

  it("setDate sets selectedDate and clears selectedSlot", () => {
    useBookingStore.getState().setSlot(mockSlot);
    useBookingStore.getState().setDate("2026-06-01");
    const state = useBookingStore.getState();
    expect(state.selectedDate).toBe("2026-06-01");
    expect(state.selectedSlot).toBeNull();
  });

  it("setSlot sets the slot", () => {
    useBookingStore.getState().setSlot(mockSlot);
    expect(useBookingStore.getState().selectedSlot).toEqual(mockSlot);
  });

  it("setPatient sets patientId", () => {
    useBookingStore.getState().setPatient(7);
    expect(useBookingStore.getState().patientId).toBe(7);
  });

  it("setNotes sets notes", () => {
    useBookingStore.getState().setNotes("fiebre alta");
    expect(useBookingStore.getState().notes).toBe("fiebre alta");
  });

  it("setAcceptedPolicy and setAcceptedTerms work", () => {
    useBookingStore.getState().setAcceptedPolicy(true);
    useBookingStore.getState().setAcceptedTerms(true);
    const state = useBookingStore.getState();
    expect(state.acceptedPolicy).toBe(true);
    expect(state.acceptedTerms).toBe(true);
  });

  it("setBookingResult maps fields correctly", () => {
    useBookingStore.getState().setBookingResult(mockBookingResponse);
    const state = useBookingStore.getState();
    expect(state.appointmentId).toBe(42);
    expect(state.checkoutUrl).toBe("https://mp.com/checkout/123");
    expect(state.holdExpiresAt).toBe("2026-05-30T10:00:00Z");
  });

  it("reset returns to initial state", () => {
    useBookingStore.getState().setLocation(2);
    useBookingStore.getState().setService(4);
    useBookingStore.getState().setNotes("algo");
    useBookingStore.getState().setStep(5);
    useBookingStore.getState().setAcceptedPolicy(true);
    useBookingStore.getState().setAcceptedTerms(true);
    useBookingStore.getState().reset();
    const state = useBookingStore.getState();
    expect(state.locationId).toBeNull();
    expect(state.serviceId).toBeNull();
    expect(state.notes).toBe("");
    expect(state.step).toBe(1);
    expect(state.acceptedPolicy).toBe(false);
    expect(state.acceptedTerms).toBe(false);
  });

  it('setLocation with "online" works', () => {
    useBookingStore.getState().setLocation("online");
    expect(useBookingStore.getState().locationId).toBe("online");
  });

  it("changing location clears previously selected service", () => {
    useBookingStore.getState().setLocation(1);
    useBookingStore.getState().setService(10);
    expect(useBookingStore.getState().serviceId).toBe(10);
    useBookingStore.getState().setLocation(2);
    expect(useBookingStore.getState().serviceId).toBeNull();
    expect(useBookingStore.getState().locationId).toBe(2);
  });

  it("step can be set to any valid value (1-7)", () => {
    useBookingStore.getState().setStep(7);
    expect(useBookingStore.getState().step).toBe(7);
    useBookingStore.getState().setStep(4);
    expect(useBookingStore.getState().step).toBe(4);
  });
});
