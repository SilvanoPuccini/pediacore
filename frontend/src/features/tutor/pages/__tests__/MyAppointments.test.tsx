import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { UseQueryResult } from "@tanstack/react-query";
import type { Appointment, PaginatedResponse } from "@/types/api";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("react-router-dom", () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/portal/turnos" }),
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

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

import { useQuery } from "@tanstack/react-query";

const mockUseQuery = vi.mocked(useQuery);

function makeQueryResult<T>(
  data: T,
  overrides: Partial<UseQueryResult<T, any>> = {}
): UseQueryResult<T, any> {
  return {
    data,
    isLoading: false,
    isError: false,
    isFetching: false,
    isSuccess: true,
    isPending: false,
    isLoadingError: false,
    isRefetchError: false,
    status: "success",
    fetchStatus: "idle",
    error: null,
    dataUpdatedAt: Date.now(),
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    isFetched: true,
    isFetchedAfterMount: true,
    isInitialLoading: false,
    isPaused: false,
    isPlaceholderData: false,
    isRefetching: false,
    isStale: false,
    refetch: vi.fn(),
    ...overrides,
  } as UseQueryResult<T, any>;
}

function makeAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 1,
    patient: 1,
    patient_name: "Sofía Ramírez",
    patient_age: { years: 2, months: 3 },
    service: 2,
    service_name: "Control de niño sano",
    location: 3,
    location_name: "Pucón",
    scheduled_date: "2026-08-10",
    start_time: "10:30:00",
    end_time: "11:00:00",
    status: "CONFIRMED",
    status_display: "Confirmado",
    is_online: false,
    call_platform: "",
    hold_expires_at: null,
    meeting_link: "",
    attendance_confirmed: false,
    notes: "",
    payment_id: null,
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
    ...overrides,
  };
}

function makePaginatedResponse<T>(
  results: T[],
  count?: number
): PaginatedResponse<T> {
  return {
    count: count ?? results.length,
    next: null,
    previous: null,
    results,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

import MyAppointments from "@/features/tutor/pages/MyAppointments";

/**
 * MyAppointments calls useQuery TWICE:
 *   call 1 → main listing (returns PaginatedResponse<Appointment>)
 *   call 2 → upcoming count badge (returns number)
 *
 * We use mockReturnValueOnce for the first call and mockReturnValue for the
 * second (fallback) so every test gets the right shape for each call.
 */
function setupQueries(
  mainData: PaginatedResponse<Appointment> | undefined,
  mainOverrides: Partial<UseQueryResult<any, any>> = {}
) {
  // First call: main listing
  mockUseQuery.mockReturnValueOnce(
    makeQueryResult(mainData, mainOverrides)
  );
  // Second call: upcoming count (number)
  mockUseQuery.mockReturnValue(makeQueryResult(0));
}

describe("MyAppointments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("tab switcher", () => {
    it("renders the 'Próximos' tab button", () => {
      setupQueries(makePaginatedResponse([]));
      render(<MyAppointments />);
      expect(screen.getByRole("button", { name: /Próximos/i })).toBeInTheDocument();
    });

    it("renders the 'Anteriores' tab button", () => {
      setupQueries(makePaginatedResponse([]));
      render(<MyAppointments />);
      expect(screen.getByRole("button", { name: /Anteriores/i })).toBeInTheDocument();
    });

    it("switches to 'Anteriores' tab when clicked", () => {
      // Initial render: upcoming empty
      setupQueries(makePaginatedResponse([]));
      render(<MyAppointments />);
      // After click, useQuery re-runs — set up next call to return empty past list
      mockUseQuery.mockReturnValueOnce(makeQueryResult(makePaginatedResponse([])));
      mockUseQuery.mockReturnValue(makeQueryResult(0));
      const pastTab = screen.getByRole("button", { name: /Anteriores/i });
      fireEvent.click(pastTab);
      expect(screen.getByText("No hay turnos anteriores")).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("shows 'No tenés turnos próximos' when upcoming list is empty", () => {
      setupQueries(makePaginatedResponse([]));
      render(<MyAppointments />);
      expect(screen.getByText("No tenés turnos próximos")).toBeInTheDocument();
    });

    it("shows a 'Reservar turno' button in upcoming empty state", () => {
      setupQueries(makePaginatedResponse([]));
      render(<MyAppointments />);
      const buttons = screen.getAllByText("Reservar turno");
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe("loading state", () => {
    it("shows a spinner when isLoading is true", () => {
      // First call: main query loading
      mockUseQuery.mockReturnValueOnce(
        makeQueryResult(undefined as any, { isLoading: true, isSuccess: false, status: "pending" })
      );
      // Second call: count query
      mockUseQuery.mockReturnValue(makeQueryResult(0));
      const { container } = render(<MyAppointments />);
      const spinner = container.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("shows error message when query fails", () => {
      mockUseQuery.mockReturnValueOnce(
        makeQueryResult(undefined as any, {
          isError: true,
          isSuccess: false,
          status: "error",
          error: new Error("Network error"),
        })
      );
      mockUseQuery.mockReturnValue(makeQueryResult(0));
      render(<MyAppointments />);
      expect(screen.getByText("No se pudieron cargar los turnos")).toBeInTheDocument();
    });
  });

  describe("with appointments", () => {
    it("renders patient name in an appointment row", () => {
      const appt = makeAppointment({ patient_name: "Sofía Ramírez" });
      setupQueries(makePaginatedResponse([appt]));
      render(<MyAppointments />);
      expect(screen.getByText("Sofía Ramírez")).toBeInTheDocument();
    });

    it("renders service name in an appointment row", () => {
      const appt = makeAppointment({ service_name: "Control de niño sano" });
      setupQueries(makePaginatedResponse([appt]));
      render(<MyAppointments />);
      expect(screen.getByText("Control de niño sano")).toBeInTheDocument();
    });

    it("renders the start time formatted as HH:MM", () => {
      const appt = makeAppointment({ start_time: "14:30:00" });
      setupQueries(makePaginatedResponse([appt]));
      render(<MyAppointments />);
      expect(screen.getByText("14:30")).toBeInTheDocument();
    });

    it("renders 'Confirmado' status badge", () => {
      const appt = makeAppointment({ status: "CONFIRMED" });
      setupQueries(makePaginatedResponse([appt]));
      render(<MyAppointments />);
      expect(screen.getByText("Confirmado")).toBeInTheDocument();
    });

    it("renders location name for in-person appointment", () => {
      const appt = makeAppointment({ is_online: false, location_name: "Villarrica" });
      setupQueries(makePaginatedResponse([appt]));
      render(<MyAppointments />);
      expect(screen.getByText("Villarrica")).toBeInTheDocument();
    });

    it("renders 'Online' for online appointments", () => {
      const appt = makeAppointment({ is_online: true });
      setupQueries(makePaginatedResponse([appt]));
      render(<MyAppointments />);
      expect(screen.getByText("Online")).toBeInTheDocument();
    });

    it("renders cancel button for upcoming appointments", () => {
      const appt = makeAppointment({ status: "CONFIRMED" });
      setupQueries(makePaginatedResponse([appt]));
      render(<MyAppointments />);
      expect(screen.getByRole("button", { name: "Cancelar turno" })).toBeInTheDocument();
    });

    it("renders 'Reagendar' button for upcoming appointments", () => {
      const appt = makeAppointment({ status: "CONFIRMED" });
      setupQueries(makePaginatedResponse([appt]));
      render(<MyAppointments />);
      expect(screen.getByText("Reagendar")).toBeInTheDocument();
    });

    it("shows 'Pagar' button for unpaid (HOLD) appointments", () => {
      const appt = makeAppointment({ status: "HOLD" });
      setupQueries(makePaginatedResponse([appt]));
      render(<MyAppointments />);
      expect(screen.getByText("Pagar")).toBeInTheDocument();
    });

    it("renders multiple appointment rows", () => {
      const appts = [
        makeAppointment({ id: 1, patient_name: "Sofía Ramírez" }),
        makeAppointment({ id: 2, patient_name: "Luca Torres" }),
      ];
      setupQueries(makePaginatedResponse(appts, 2));
      render(<MyAppointments />);
      expect(screen.getByText("Sofía Ramírez")).toBeInTheDocument();
      expect(screen.getByText("Luca Torres")).toBeInTheDocument();
    });
  });

  describe("header actions", () => {
    it("renders the 'Ver calendario' button", () => {
      setupQueries(makePaginatedResponse([]));
      render(<MyAppointments />);
      expect(screen.getByText("Ver calendario")).toBeInTheDocument();
    });

    it("renders the 'Reservar turno' action in the header", () => {
      setupQueries(makePaginatedResponse([]));
      render(<MyAppointments />);
      const buttons = screen.getAllByText("Reservar turno");
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
