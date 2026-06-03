import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock @mercadopago/sdk-react so no real SDK init happens
vi.mock("@mercadopago/sdk-react", () => ({
  initMercadoPago: vi.fn(),
  Wallet: vi.fn(({ initialization }: { initialization: { preferenceId: string } }) => (
    <div
      data-testid="mp-wallet-brick"
      data-preference-id={initialization.preferenceId}
    />
  )),
}));

// Mock react-router-dom
vi.mock("react-router-dom", () => ({
  useNavigate: vi.fn(() => vi.fn()),
}));

// Mock bookingStore
vi.mock("../../store/bookingStore", () => ({
  useBookingStore: vi.fn(),
}));

import StepPayment from "../StepPayment";
import { useBookingStore } from "../../store/bookingStore";

const mockReset = vi.fn();

type StoreState = {
  preferenceId: string | null;
  holdExpiresAt: string | null;
  checkoutUrl: string | null;
  reset: () => void;
};

function setupStore(overrides: Partial<Omit<StoreState, "reset">> = {}) {
  const futureDate = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const state: StoreState = {
    preferenceId: "preferenceId" in overrides ? overrides.preferenceId! : "test-pref-123",
    holdExpiresAt: overrides.holdExpiresAt ?? futureDate,
    checkoutUrl: overrides.checkoutUrl ?? "https://mp.example.com/checkout",
    reset: mockReset,
  };
  (useBookingStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    (selector: (s: StoreState) => unknown) => (selector ? selector(state) : state)
  );
}

describe("StepPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders WalletBrick when preferenceId is available", () => {
    setupStore({ preferenceId: "pref-abc-123" });
    render(<StepPayment />);
    expect(screen.getByTestId("mp-wallet-brick")).toBeInTheDocument();
  });

  it("passes preferenceId to WalletBrick", () => {
    setupStore({ preferenceId: "pref-xyz-789" });
    render(<StepPayment />);
    const brick = screen.getByTestId("mp-wallet-brick");
    expect(brick).toHaveAttribute("data-preference-id", "pref-xyz-789");
  });

  it("shows countdown timer above the Brick", () => {
    setupStore();
    render(<StepPayment />);
    // Timer should show remaining seconds/minutes
    expect(screen.getByTestId("mp-wallet-brick")).toBeInTheDocument();
    // Countdown container should be present
    expect(screen.getByTestId("hold-countdown")).toBeInTheDocument();
  });

  it("does NOT use window.location.href redirect", () => {
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      value: { href: "" },
      writable: true,
    });
    setupStore({ preferenceId: "pref-test" });
    render(<StepPayment />);
    // After render, href should NOT have been set to the checkout URL
    expect(window.location.href).toBe("");
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
    });
  });

  it("does not render WalletBrick when preferenceId is null", () => {
    const state: StoreState = {
      preferenceId: null,
      holdExpiresAt: new Date(Date.now() + 60_000).toISOString(),
      checkoutUrl: null,
      reset: mockReset,
    };
    (useBookingStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector: (s: StoreState) => unknown) => (selector ? selector(state) : state)
    );
    render(<StepPayment />);
    expect(screen.queryByTestId("mp-wallet-brick")).not.toBeInTheDocument();
  });
});
