import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Calendar } from "lucide-react";
import MetricCard from "../MetricCard";

describe("MetricCard", () => {
  const defaultProps = {
    icon: Calendar,
    iconBg: "rgba(125, 211, 192, 0.20)",
    iconColor: "#3E8E7C",
    value: 42,
    label: "Turnos hoy",
  };

  it("renders value and label", () => {
    render(<MetricCard {...defaultProps} />);
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Turnos hoy")).toBeInTheDocument();
  });

  it("renders the icon container div (colored box before the button)", () => {
    const { container } = render(<MetricCard {...defaultProps} />);
    // The icon container is a div with an inline style background — it contains an SVG (the Calendar icon).
    // We verify it exists by finding the wrapping div that holds the icon SVG.
    // The icon is inside a div with rounded-[10px] class
    const iconBox = container.querySelector("div[style]");
    expect(iconBox).not.toBeNull();
    // It should have the iconBg color set via style (browser may normalize trailing zeros)
    const style = (iconBox as HTMLElement).style.background;
    expect(style).toMatch(/rgba\(125,\s*211,\s*192,\s*0\.2\)/);
  });

  it("renders MoreHorizontal button", () => {
    render(<MetricCard {...defaultProps} />);
    // The button wraps the MoreHorizontal icon — it's a button element
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });

  it("shows trend row when trend prop is provided (positive)", () => {
    render(<MetricCard {...defaultProps} trend={12} trendLabel="vs semana pasada" />);
    expect(screen.getByText("+12%")).toBeInTheDocument();
    expect(screen.getByText("vs semana pasada")).toBeInTheDocument();
  });

  it("shows trend row when trend prop is provided (negative)", () => {
    render(<MetricCard {...defaultProps} trend={-5} />);
    expect(screen.getByText("-5%")).toBeInTheDocument();
  });

  it("shows trend row when trend is zero", () => {
    render(<MetricCard {...defaultProps} trend={0} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("hides trend row when trend prop is not provided", () => {
    render(<MetricCard {...defaultProps} />);
    expect(screen.queryByText("vs semana pasada")).not.toBeInTheDocument();
  });

  it("renders loading skeleton state instead of content", () => {
    const { container } = render(<MetricCard {...defaultProps} loading />);
    // In skeleton mode, value and label are NOT rendered as text
    expect(screen.queryByText("42")).not.toBeInTheDocument();
    expect(screen.queryByText("Turnos hoy")).not.toBeInTheDocument();
    // Skeleton divs use animate-pulse class
    const skeletonBoxes = container.querySelectorAll(".animate-pulse");
    expect(skeletonBoxes.length).toBeGreaterThan(0);
  });

  it("renders string value", () => {
    render(<MetricCard {...defaultProps} value="$1.200.000" label="Ingresos del mes" />);
    expect(screen.getByText("$1.200.000")).toBeInTheDocument();
    expect(screen.getByText("Ingresos del mes")).toBeInTheDocument();
  });
});
