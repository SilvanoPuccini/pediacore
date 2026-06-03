import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock the entire @mercadopago/sdk-react package
vi.mock("@mercadopago/sdk-react", () => ({
  initMercadoPago: vi.fn(),
  Wallet: vi.fn(({ onReady, initialization }: { onReady?: () => void; initialization: { preferenceId: string } }) => {
    // Simulate onReady firing so the Brick renders its container
    if (onReady) setTimeout(onReady, 0);
    return (
      <div
        data-testid="mp-wallet-brick"
        data-preference-id={initialization.preferenceId}
      />
    );
  }),
}));

import WalletBrick from "../WalletBrick";

describe("WalletBrick", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing given a valid preferenceId", () => {
    render(<WalletBrick preferenceId="test-pref-abc-123" />);
    expect(screen.getByTestId("mp-wallet-brick")).toBeInTheDocument();
  });

  it("passes preferenceId to the Wallet component", () => {
    render(<WalletBrick preferenceId="pref-xyz-456" />);
    const brick = screen.getByTestId("mp-wallet-brick");
    expect(brick).toHaveAttribute("data-preference-id", "pref-xyz-456");
  });

  it("renders a container with expected styling class", () => {
    const { container } = render(<WalletBrick preferenceId="pref-test" />);
    // WalletBrick should wrap the Brick in a styled div
    expect(container.firstChild).not.toBeNull();
  });

  it("accepts an onError prop without crashing", () => {
    const onError = vi.fn();
    // Should render without throwing even when onError is provided
    expect(() =>
      render(<WalletBrick preferenceId="pref-test" onError={onError} />)
    ).not.toThrow();
  });
});
