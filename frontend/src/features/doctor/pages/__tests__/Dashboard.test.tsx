import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Mock } from "vitest";

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
  useQuery: vi.fn(),
  useMutation: vi.fn(() => ({
    mutate: vi.fn(),
    isError: false,
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

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock("@/features/doctor/stores/useSedeStore", () => ({
  useSedeStore: vi.fn((selector: any) => {
    const state = { sedeId: null, sedeName: "Todas", setSede: vi.fn() };
    return selector ? selector(state) : state;
  }),
}));

vi.mock("@/features/doctor/hooks/useDashboardMetrics", () => ({
  useDashboardMetrics: vi.fn(),
}));

vi.mock("@/features/doctor/hooks/useRevenueChart", () => ({
  useRevenueChart: vi.fn(),
}));

vi.mock("@/features/doctor/hooks/useReminders", () => ({
  useReminders: vi.fn(),
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="chart-container">{children}</div>
  ),
  ComposedChart: ({ children }: any) => <div>{children}</div>,
  AreaChart: ({ children }: any) => <div>{children}</div>,
  Line: () => null,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

// Mock child components that have their own complex queries
vi.mock("@/features/doctor/components/PendingTransfersSection", () => ({
  default: () => null,
}));

vi.mock("@/features/doctor/components/RevenueChart", () => ({
  default: () => <div data-testid="revenue-chart" />,
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

import { useQuery } from "@tanstack/react-query";
import { useDashboardMetrics } from "@/features/doctor/hooks/useDashboardMetrics";
import { useRevenueChart } from "@/features/doctor/hooks/useRevenueChart";
import { useReminders } from "@/features/doctor/hooks/useReminders";

function setupHooks({
  metricsData = null,
  metricsLoading = false,
  agendaResults = [],
  agendaLoading = false,
}: {
  metricsData?: any;
  metricsLoading?: boolean;
  agendaResults?: any[];
  agendaLoading?: boolean;
} = {}) {
  (useDashboardMetrics as Mock).mockReturnValue({
    data: metricsData,
    isLoading: metricsLoading,
  });

  (useRevenueChart as Mock).mockReturnValue({
    data: [],
    isLoading: false,
  });

  (useReminders as Mock).mockReturnValue({
    data: [],
    isLoading: false,
  });

  // useQuery is used for the agenda (today's appointments)
  (useQuery as Mock).mockReturnValue({
    data: { count: agendaResults.length, results: agendaResults, next: null, previous: null },
    isLoading: agendaLoading,
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

import Dashboard from "../Dashboard";

describe("Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders greeting with doctor first name", () => {
    setupHooks();
    render(<Dashboard />);
    // greeting includes the first name
    expect(screen.getByText(/Estefanía/)).toBeInTheDocument();
  });

  it("renders the 4 metric cards section", () => {
    setupHooks();
    render(<Dashboard />);
    expect(screen.getByText("Turnos hoy")).toBeInTheDocument();
    expect(screen.getByText("Esta semana")).toBeInTheDocument();
    expect(screen.getByText("Ingresos del mes")).toBeInTheDocument();
    expect(screen.getByText("Tasa de no-show")).toBeInTheDocument();
  });

  it("shows Agenda de hoy section header", () => {
    setupHooks();
    render(<Dashboard />);
    expect(screen.getByText("Agenda de hoy")).toBeInTheDocument();
  });

  it("shows revenue chart area header", () => {
    setupHooks();
    render(<Dashboard />);
    expect(screen.getByText(/Ingresos · 30 dias/)).toBeInTheDocument();
  });

  it("shows Recordatorios section header", () => {
    setupHooks();
    render(<Dashboard />);
    expect(screen.getByText("Recordatorios")).toBeInTheDocument();
  });

  it("renders Exportar button", () => {
    setupHooks();
    render(<Dashboard />);
    expect(screen.getByText("Exportar")).toBeInTheDocument();
  });

  it("renders Nuevo turno link/button", () => {
    setupHooks();
    render(<Dashboard />);
    expect(screen.getByText("Nuevo turno")).toBeInTheDocument();
  });

  it("shows Sin turnos hoy when agenda is empty", () => {
    setupHooks({ agendaResults: [] });
    render(<Dashboard />);
    expect(screen.getByText("Sin turnos hoy")).toBeInTheDocument();
  });

  it("renders agenda appointment names when present", () => {
    setupHooks({
      agendaResults: [
        {
          id: 1,
          patient: 10,
          patient_name: "Lucas Pérez",
          service: 1,
          service_name: "Control sano",
          location: 1,
          location_name: "Pucón",
          scheduled_date: "2026-06-10",
          start_time: "09:00:00",
          end_time: "09:30:00",
          status: "CONFIRMED",
          status_display: "Confirmado",
          is_online: false,
          call_platform: "",
          hold_expires_at: null,
          meeting_link: "",
          attendance_confirmed: false,
          notes: "",
          created_at: "2026-06-01T00:00:00Z",
          updated_at: "2026-06-01T00:00:00Z",
        },
      ],
    });
    render(<Dashboard />);
    expect(screen.getByText("Lucas Pérez")).toBeInTheDocument();
  });
});
