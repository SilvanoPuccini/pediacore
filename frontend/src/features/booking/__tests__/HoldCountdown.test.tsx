import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import HoldCountdown from "../components/HoldCountdown";
import { useBookingStore } from "../store/bookingStore";

vi.mock("../store/bookingStore", () => ({
  useBookingStore: vi.fn(),
}));

const mockReset = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  (useBookingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockReset);
});

function futureDate(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function pastDate(): string {
  return new Date(Date.now() - 1000).toISOString();
}

describe("HoldCountdown", () => {
  it("renders countdown with correct time format", () => {
    render(<HoldCountdown holdExpiresAt={futureDate(30)} />);
    expect(screen.getByText(/0:30/)).toBeInTheDocument();
  });

  it("renders heading 'Reserva registrada'", () => {
    render(<HoldCountdown holdExpiresAt={futureDate(30)} />);
    expect(screen.getByRole("heading", { name: /Reserva registrada/i })).toBeInTheDocument();
  });

  it("calls reset when holdExpiresAt is in the past", () => {
    render(<HoldCountdown holdExpiresAt={pastDate()} />);
    expect(mockReset).toHaveBeenCalledOnce();
  });
});
