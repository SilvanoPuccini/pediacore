import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HoldCountdown from "../components/HoldCountdown";
import { useBookingStore } from "../store/bookingStore";

vi.mock("../store/bookingStore", () => ({
  useBookingStore: vi.fn(),
}));

const mockReset = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  (useBookingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockReset);
  Object.defineProperty(window, "location", {
    value: { href: "" },
    writable: true,
  });
});

function futureDate(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function pastDate(): string {
  return new Date(Date.now() - 1000).toISOString();
}

describe("HoldCountdown", () => {
  it("renders countdown with correct seconds", () => {
    render(
      <HoldCountdown holdExpiresAt={futureDate(30)} checkoutUrl="https://pay.example.com" />
    );
    expect(screen.getByText(/30/)).toBeInTheDocument();
  });

  it("renders heading 'Reserva registrada'", () => {
    render(
      <HoldCountdown holdExpiresAt={futureDate(30)} checkoutUrl="https://pay.example.com" />
    );
    expect(screen.getByRole("heading", { name: /Reserva registrada/i })).toBeInTheDocument();
  });

  it("shows 'Ir al pago ahora' link pointing to checkoutUrl", () => {
    const url = "https://pay.example.com/checkout";
    render(<HoldCountdown holdExpiresAt={futureDate(30)} checkoutUrl={url} />);
    const link = screen.getByRole("link", { name: /Ir al pago ahora/i });
    expect(link).toHaveAttribute("href", url);
  });

  it("redirects to checkoutUrl when holdExpiresAt is in the past", () => {
    render(
      <HoldCountdown holdExpiresAt={pastDate()} checkoutUrl="https://pay.example.com/expired" />
    );
    expect(window.location.href).toBe("https://pay.example.com/expired");
    expect(mockReset).toHaveBeenCalledOnce();
  });
});
