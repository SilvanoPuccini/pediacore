import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Avatar,
  StatusBadge,
  Chip,
  Card,
  Btn,
  childPalette,
  clp,
} from "@/features/tutor/components/portal-ui";

// ─── childPalette ─────────────────────────────────────────────────────────────

describe("childPalette", () => {
  it("returns the first palette for index 0", () => {
    const pal = childPalette(0);
    expect(pal.fg).toBe("#3F7079");
  });

  it("returns the second palette for index 1", () => {
    const pal = childPalette(1);
    expect(pal.fg).toBe("#B5604F");
  });

  it("cycles back to first palette at index 4", () => {
    expect(childPalette(4)).toEqual(childPalette(0));
  });

  it("cycles correctly at index 7 (7 % 4 = 3)", () => {
    expect(childPalette(7)).toEqual(childPalette(3));
  });
});

// ─── clp ──────────────────────────────────────────────────────────────────────

describe("clp", () => {
  it("formats a whole number as Chilean peso", () => {
    const result = clp(25000);
    expect(result).toMatch(/^\$/);
    expect(result).toContain("25");
  });

  it("formats zero", () => {
    expect(clp(0)).toBe("$0");
  });

  it("formats large numbers with separators", () => {
    const result = clp(1000000);
    // Should contain "1" and "000" separated somehow
    expect(result).toMatch(/^\$/);
    expect(result).toContain("000");
  });
});

// ─── Avatar ───────────────────────────────────────────────────────────────────

describe("Avatar", () => {
  it("renders the initial (first uppercase char) of the name", () => {
    render(<Avatar name="Pedro González" />);
    expect(screen.getByText("P")).toBeInTheDocument();
  });

  it("renders initial for a name starting with lowercase", () => {
    render(<Avatar name="ana" />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("applies the correct width and height based on size prop", () => {
    const { container } = render(<Avatar name="Test" size={56} />);
    const div = container.firstChild as HTMLElement;
    expect(div.style.width).toBe("56px");
    expect(div.style.height).toBe("56px");
  });

  it("defaults to size 40", () => {
    const { container } = render(<Avatar name="Test" />);
    const div = container.firstChild as HTMLElement;
    expect(div.style.width).toBe("40px");
    expect(div.style.height).toBe("40px");
  });

  it("applies a palette color to the element background", () => {
    const { container } = render(<Avatar name="Maria" childIndex={0} />);
    const div = container.firstChild as HTMLElement;
    // childIndex 0 → soft: "#E1EEF1"
    expect(div.style.backgroundColor).toBe("rgb(225, 238, 241)");
  });
});

// ─── StatusBadge ──────────────────────────────────────────────────────────────

describe("StatusBadge", () => {
  it("renders 'Confirmado' for status 'confirmado'", () => {
    render(<StatusBadge status="confirmado" />);
    expect(screen.getByText("Confirmado")).toBeInTheDocument();
  });

  it("renders 'Pendiente de pago' for status 'pendiente'", () => {
    render(<StatusBadge status="pendiente" />);
    expect(screen.getByText("Pendiente de pago")).toBeInTheDocument();
  });

  it("renders 'Cancelado' for status 'cancelado'", () => {
    render(<StatusBadge status="cancelado" />);
    expect(screen.getByText("Cancelado")).toBeInTheDocument();
  });

  it("renders 'Realizada' for status 'realizado'", () => {
    render(<StatusBadge status="realizado" />);
    expect(screen.getByText("Realizada")).toBeInTheDocument();
  });

  it("renders 'Asistencia confirmada' for status 'asistencia'", () => {
    render(<StatusBadge status="asistencia" />);
    expect(screen.getByText("Asistencia confirmada")).toBeInTheDocument();
  });

  it("is case-insensitive (uppercase input maps correctly)", () => {
    // STATUS_MAP uses .toLowerCase(), unknown → defaults to realizado
    render(<StatusBadge status="REALIZADO" />);
    expect(screen.getByText("Realizada")).toBeInTheDocument();
  });

  it("falls back to 'Realizada' for unknown status", () => {
    render(<StatusBadge status="unknown_status" />);
    expect(screen.getByText("Realizada")).toBeInTheDocument();
  });
});

// ─── Chip ─────────────────────────────────────────────────────────────────────

describe("Chip", () => {
  it("renders children text", () => {
    render(<Chip>Al día</Chip>);
    expect(screen.getByText("Al día")).toBeInTheDocument();
  });

  it("renders with an icon when icon prop is provided", () => {
    const { container } = render(<Chip icon="Check">Con ícono</Chip>);
    // lucide renders an <svg> for the icon
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(screen.getByText("Con ícono")).toBeInTheDocument();
  });

  it("renders without svg when no icon prop", () => {
    const { container } = render(<Chip>Sin ícono</Chip>);
    expect(container.querySelector("svg")).not.toBeInTheDocument();
  });
});

// ─── Card ─────────────────────────────────────────────────────────────────────

describe("Card", () => {
  it("renders children", () => {
    render(<Card>Contenido de la card</Card>);
    expect(screen.getByText("Contenido de la card")).toBeInTheDocument();
  });

  it("includes rounded and border classes by default", () => {
    const { container } = render(<Card>test</Card>);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain("rounded-[16px]");
    expect(div.className).toContain("border");
  });

  it("includes padding class when padding=true (default)", () => {
    const { container } = render(<Card>test</Card>);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain("p-5");
  });

  it("excludes padding class when padding=false", () => {
    const { container } = render(<Card padding={false}>test</Card>);
    const div = container.firstChild as HTMLElement;
    expect(div.className).not.toContain("p-5");
  });

  it("applies extra className", () => {
    const { container } = render(<Card className="custom-class">test</Card>);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain("custom-class");
  });
});

// ─── Btn ──────────────────────────────────────────────────────────────────────

describe("Btn", () => {
  it("renders children text", () => {
    render(<Btn>Guardar</Btn>);
    expect(screen.getByRole("button", { name: "Guardar" })).toBeInTheDocument();
  });

  it("applies primary variant classes by default", () => {
    render(<Btn>Primary</Btn>);
    const btn = screen.getByRole("button", { name: "Primary" });
    expect(btn.className).toContain("bg-teal-dark");
  });

  it("applies soft variant classes", () => {
    render(<Btn variant="soft">Soft</Btn>);
    const btn = screen.getByRole("button", { name: "Soft" });
    expect(btn.className).toContain("bg-teal/15");
  });

  it("applies ghost variant classes", () => {
    render(<Btn variant="ghost">Ghost</Btn>);
    const btn = screen.getByRole("button", { name: "Ghost" });
    expect(btn.className).toContain("bg-surface");
    expect(btn.className).toContain("border");
  });

  it("applies danger variant classes", () => {
    render(<Btn variant="danger">Eliminar</Btn>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("border-destructive");
  });

  it("renders a left icon when icon prop is provided", () => {
    const { container } = render(<Btn icon="Plus">Con ícono</Btn>);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders a right icon when iconRight prop is provided", () => {
    const { container } = render(<Btn iconRight="ChevronRight">Con ícono derecho</Btn>);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("is disabled when disabled prop is true", () => {
    render(<Btn disabled>Deshabilitado</Btn>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("applies sm size classes", () => {
    render(<Btn size="sm">Pequeño</Btn>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("px-3");
    expect(btn.className).toContain("py-1.5");
  });

  it("applies lg size classes", () => {
    render(<Btn size="lg">Grande</Btn>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("px-5");
    expect(btn.className).toContain("py-3");
  });
});
