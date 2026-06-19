import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("react-router-dom", () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/dashboard" }),
  useParams: () => ({}),
}));

vi.mock("@/stores/auth", () => ({
  useAuthStore: vi.fn((selector: any) => {
    const state = {
      user: {
        id: 1,
        first_name: "Estefanía",
        last_name: "Ortigosa",
        email: "estefi@test.com",
        full_name: "Estefanía Ortigosa",
        role: "DOCTOR",
      },
      logout: vi.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

vi.mock("@/features/doctor/stores/useSedeStore", () => ({
  useSedeStore: vi.fn((selector: any) => {
    const state = { sedeId: null, sedeName: "Todas", setSede: vi.fn(), clearSede: vi.fn() };
    return selector ? selector(state) : state;
  }),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

import Dashboard from "../Dashboard";

describe("Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders greeting with doctor first name", () => {
    render(<Dashboard />);
    expect(screen.getByText(/Estefanía/)).toBeInTheDocument();
  });

  it("renders the 4 pipeline stage cards", () => {
    render(<Dashboard />);
    expect(screen.getByText("Confirmados")).toBeInTheDocument();
    // "En sala" appears in stage card and in StateBadge — use getAllBy
    expect(screen.getAllByText("En sala").length).toBeGreaterThan(0);
    expect(screen.getAllByText("En consulta").length).toBeGreaterThan(0);
    expect(screen.getByText("Atendidos")).toBeInTheDocument();
  });

  it("shows Agenda de hoy section header", () => {
    render(<Dashboard />);
    expect(screen.getByText("Agenda de hoy")).toBeInTheDocument();
  });

  it("shows Bandeja clínica section header", () => {
    render(<Dashboard />);
    expect(screen.getByText("Bandeja clínica")).toBeInTheDocument();
  });

  it("shows Caja de hoy section", () => {
    render(<Dashboard />);
    expect(screen.getByText("Caja de hoy")).toBeInTheDocument();
    // "Cobrado" appears once in the caja card; "Por cobrar" also in AgendaRow badges
    expect(screen.getByText("Cobrado")).toBeInTheDocument();
    expect(screen.getAllByText("Por cobrar").length).toBeGreaterThan(0);
  });

  it("renders Nuevo turno button", () => {
    render(<Dashboard />);
    expect(screen.getByText("Nuevo turno")).toBeInTheDocument();
  });

  it("renders Ver agenda button", () => {
    render(<Dashboard />);
    expect(screen.getByText("Ver agenda")).toBeInTheDocument();
  });

  it("renders demo agenda items", () => {
    render(<Dashboard />);
    // Names appear in both the focus card and the agenda list
    expect(screen.getAllByText("Lucas Martínez").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tomás Silva").length).toBeGreaterThan(0);
  });

  it("renders clinical inbox tasks", () => {
    render(<Dashboard />);
    expect(screen.getByText("Hemograma por revisar")).toBeInTheDocument();
    expect(screen.getByText("Receta por firmar")).toBeInTheDocument();
  });

  it("shows focus card for current patient in consulta", () => {
    render(<Dashboard />);
    // Lucas is in consulta state — should appear in the focus card header
    expect(screen.getByText("● Ahora en consulta")).toBeInTheDocument();
  });

  it("filters agenda by clicking a stage card", () => {
    render(<Dashboard />);
    const confirmadosCard = screen.getByText("Confirmados").closest("button");
    expect(confirmadosCard).toBeTruthy();
    fireEvent.click(confirmadosCard!);
    // After filter: "Ver todos" link should appear
    expect(screen.getByText("Ver todos")).toBeInTheDocument();
  });

  it("resolving a task removes it from the inbox", () => {
    render(<Dashboard />);
    // First "Revisar" button corresponds to the hemograma task
    const resolveBtn = screen.getAllByText("Revisar")[0];
    expect(resolveBtn).toBeInTheDocument();
    fireEvent.click(resolveBtn);
    expect(screen.queryByText("Hemograma por revisar")).not.toBeInTheDocument();
  });
});
