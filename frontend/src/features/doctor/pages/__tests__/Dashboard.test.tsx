import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ─── Mock data ──────────────────────────────────────────────────────────────

const MOCK_APPOINTMENTS = {
  count: 3,
  results: [
    {
      id: 10,
      patient: 31,
      patient_name: "Mateo González",
      patient_age: { years: 3, months: 5 },
      service: 1,
      service_name: "Control sano",
      location: 1,
      location_name: "Pucón",
      scheduled_date: new Date().toISOString().slice(0, 10),
      start_time: "09:00:00",
      end_time: "09:30:00",
      status: "COMPLETED",
      status_display: "Completed",
      is_online: false,
      call_platform: "",
      hold_expires_at: null,
      meeting_link: "",
      attendance_confirmed: true,
      notes: "Control 41 meses",
      payment_id: 5,
      created_at: "2026-06-19T08:00:00Z",
      updated_at: "2026-06-19T09:30:00Z",
    },
    {
      id: 11,
      patient: 32,
      patient_name: "Lucas Martínez",
      patient_age: { years: 5, months: 0 },
      service: 2,
      service_name: "Consulta pediátrica",
      location: 1,
      location_name: "Pucón",
      scheduled_date: new Date().toISOString().slice(0, 10),
      start_time: "10:30:00",
      end_time: "11:00:00",
      status: "IN_PROGRESS",
      status_display: "In progress",
      is_online: false,
      call_platform: "",
      hold_expires_at: null,
      meeting_link: "",
      attendance_confirmed: true,
      notes: "Tos y fiebre 48h",
      payment_id: null,
      created_at: "2026-06-19T08:00:00Z",
      updated_at: "2026-06-19T10:30:00Z",
    },
    {
      id: 12,
      patient: 33,
      patient_name: "Tomás Silva",
      patient_age: { years: 8, months: 2 },
      service: 2,
      service_name: "Consulta pediátrica",
      location: 2,
      location_name: "Villarrica",
      scheduled_date: new Date().toISOString().slice(0, 10),
      start_time: "15:00:00",
      end_time: "15:30:00",
      status: "CONFIRMED",
      status_display: "Confirmed",
      is_online: false,
      call_platform: "",
      hold_expires_at: null,
      meeting_link: "",
      attendance_confirmed: false,
      notes: "Control asma",
      payment_id: 6,
      created_at: "2026-06-19T08:00:00Z",
      updated_at: "2026-06-19T08:00:00Z",
    },
  ],
};

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

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(() => ({
    data: MOCK_APPOINTMENTS,
    isLoading: false,
  })),
  useMutation: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
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

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
  },
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
    expect(screen.getAllByText("Confirmados").length).toBeGreaterThan(0);
    expect(screen.getAllByText("En sala").length).toBeGreaterThan(0);
    expect(screen.getAllByText("En consulta").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Atendidos").length).toBeGreaterThan(0);
  });

  it("shows Agenda de hoy section header", () => {
    render(<Dashboard />);
    expect(screen.getByText("Agenda de hoy")).toBeInTheDocument();
  });

  it("renders Nuevo turno button", () => {
    render(<Dashboard />);
    expect(screen.getByText("Nuevo turno")).toBeInTheDocument();
  });

  it("renders Ver agenda button", () => {
    render(<Dashboard />);
    expect(screen.getByText("Ver agenda")).toBeInTheDocument();
  });

  it("renders appointment patient names from API", () => {
    render(<Dashboard />);
    expect(screen.getAllByText("Lucas Martínez").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tomás Silva").length).toBeGreaterThan(0);
  });

  it("shows focus card for patient IN_PROGRESS", () => {
    render(<Dashboard />);
    expect(screen.getByText("● Ahora en consulta")).toBeInTheDocument();
  });

  it("filters agenda by clicking a stage card", () => {
    render(<Dashboard />);
    const confirmadosCard = screen.getByText("Confirmados").closest("button");
    expect(confirmadosCard).toBeTruthy();
    fireEvent.click(confirmadosCard!);
    expect(screen.getByText("Ver todos")).toBeInTheDocument();
  });
});
