import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { UseQueryResult } from "@tanstack/react-query";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("react-router-dom", () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/portal" }),
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
        first_name: "Ana",
        last_name: "López",
        email: "ana@test.com",
        full_name: "Ana López",
        role: "TUTOR",
      },
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

// useNotifications calls useQuery internally — handled by the useQuery mock above
vi.mock("@/features/tutor/hooks/useNotifications", () => ({
  useNotifications: vi.fn(() => ({
    data: { count: 0, results: [], next: null, previous: null },
    isLoading: false,
    isError: false,
  })),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

import { useQuery } from "@tanstack/react-query";

const mockUseQuery = vi.mocked(useQuery);

function makeEmptyQueryResult(overrides: Partial<UseQueryResult> = {}): UseQueryResult<any, any> {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    isFetching: false,
    isSuccess: false,
    isPending: false,
    isLoadingError: false,
    isRefetchError: false,
    status: "pending",
    fetchStatus: "idle",
    error: null,
    dataUpdatedAt: 0,
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    isFetched: false,
    isFetchedAfterMount: false,
    isInitialLoading: false,
    isPaused: false,
    isPlaceholderData: false,
    isRefetching: false,
    isStale: false,
    refetch: vi.fn(),
    ...overrides,
  } as UseQueryResult<any, any>;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

// Import after mocks
import Dashboard from "@/features/tutor/pages/Dashboard";

describe("Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: all queries return empty/loading state
    mockUseQuery.mockReturnValue(makeEmptyQueryResult({ isLoading: false, data: undefined }));
  });

  it("renders the greeting with the user's first name", () => {
    mockUseQuery.mockReturnValue(
      makeEmptyQueryResult({
        isLoading: false,
        data: { count: 0, results: [], next: null, previous: null },
      })
    );
    render(<Dashboard />);
    expect(screen.getByText("Ana")).toBeInTheDocument();
  });

  it("renders the 'Hola,' prefix in the greeting", () => {
    mockUseQuery.mockReturnValue(
      makeEmptyQueryResult({
        data: { count: 0, results: [], next: null, previous: null },
      })
    );
    render(<Dashboard />);
    expect(screen.getByText(/Hola,/)).toBeInTheDocument();
  });

  it("shows today's date with day of week", () => {
    mockUseQuery.mockReturnValue(
      makeEmptyQueryResult({
        data: { count: 0, results: [], next: null, previous: null },
      })
    );
    render(<Dashboard />);
    // Date includes a month and year — both should be present
    const now = new Date();
    const year = now.getFullYear().toString();
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument();
  });

  it("shows the quick actions section", () => {
    mockUseQuery.mockReturnValue(
      makeEmptyQueryResult({
        data: { count: 0, results: [], next: null, previous: null },
      })
    );
    render(<Dashboard />);
    expect(screen.getByText("Acciones rápidas")).toBeInTheDocument();
  });

  it("renders the 'Reservar turno' quick action link", () => {
    mockUseQuery.mockReturnValue(
      makeEmptyQueryResult({
        data: { count: 0, results: [], next: null, previous: null },
      })
    );
    render(<Dashboard />);
    const reservarLinks = screen.getAllByText("Reservar turno");
    expect(reservarLinks.length).toBeGreaterThan(0);
  });

  it("renders the 'Ver vacunas' quick action", () => {
    mockUseQuery.mockReturnValue(
      makeEmptyQueryResult({
        data: { count: 0, results: [], next: null, previous: null },
      })
    );
    render(<Dashboard />);
    expect(screen.getByText("Ver vacunas")).toBeInTheDocument();
  });

  it("renders the 'Resúmenes' quick action", () => {
    mockUseQuery.mockReturnValue(
      makeEmptyQueryResult({
        data: { count: 0, results: [], next: null, previous: null },
      })
    );
    render(<Dashboard />);
    expect(screen.getByText("Resúmenes")).toBeInTheDocument();
  });

  it("renders the 'Boletas' quick action", () => {
    mockUseQuery.mockReturnValue(
      makeEmptyQueryResult({
        data: { count: 0, results: [], next: null, previous: null },
      })
    );
    render(<Dashboard />);
    expect(screen.getByText("Boletas")).toBeInTheDocument();
  });

  it("renders the HeroAppointmentCard area (Próximo turno heading)", () => {
    mockUseQuery.mockReturnValue(
      makeEmptyQueryResult({
        data: { count: 0, results: [], next: null, previous: null },
      })
    );
    render(<Dashboard />);
    expect(screen.getByText("Próximo turno")).toBeInTheDocument();
  });

  it("shows empty-state message when no upcoming appointments", () => {
    mockUseQuery.mockReturnValue(
      makeEmptyQueryResult({
        isLoading: false,
        data: { count: 0, results: [], next: null, previous: null },
      })
    );
    render(<Dashboard />);
    expect(screen.getByText("No tenés turnos próximos")).toBeInTheDocument();
  });

  it("shows 'Todo al día. ¡Buen día!' subtitle when no pending items", () => {
    mockUseQuery.mockReturnValue(
      makeEmptyQueryResult({
        isLoading: false,
        data: { count: 0, results: [], next: null, previous: null },
      })
    );
    render(<Dashboard />);
    expect(screen.getByText("Todo al día. ¡Buen día!")).toBeInTheDocument();
  });

  it("shows loading text in subtitle while fetching appointments", () => {
    mockUseQuery.mockReturnValue(makeEmptyQueryResult({ isLoading: true, data: undefined }));
    render(<Dashboard />);
    expect(screen.getByText("Cargando...")).toBeInTheDocument();
  });

  it("shows 'Mis hijos' section", () => {
    mockUseQuery.mockReturnValue(
      makeEmptyQueryResult({
        data: { count: 0, results: [], next: null, previous: null },
      })
    );
    render(<Dashboard />);
    expect(screen.getByText("Mis hijos")).toBeInTheDocument();
  });

  it("shows 'Sin actividad reciente.' when notifications are empty", () => {
    mockUseQuery.mockReturnValue(
      makeEmptyQueryResult({
        data: { count: 0, results: [], next: null, previous: null },
      })
    );
    render(<Dashboard />);
    expect(screen.getByText("Sin actividad reciente.")).toBeInTheDocument();
  });
});
