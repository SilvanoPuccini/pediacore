import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Mock } from "vitest";
import type { Location, Appointment } from "@/types/api";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("react-router-dom", () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/dashboard/calendario" }),
  useParams: () => ({}),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@/lib/api", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

vi.mock("@/features/doctor/stores/useSedeStore", () => ({
  useSedeStore: vi.fn((selector: any) => {
    const state = { sedeId: null, sedeName: "Todas", setSede: vi.fn() };
    return selector ? selector(state) : state;
  }),
}));

// ─── Mock data ────────────────────────────────────────────────────────────────

const mockLocations: Location[] = [
  {
    id: 1,
    name: "Pucón",
    slug: "pucon",
    address: "Av. O'Higgins 123",
    city: "Pucón",
    region: "Araucanía",
    phone: "",
    email: "",
    display_hours: "Lun-Vie 9-18",
    latitude: null,
    longitude: null,
    is_active: true,
  },
  {
    id: 2,
    name: "Villarrica",
    slug: "villarrica",
    address: "Calle Principal 456",
    city: "Villarrica",
    region: "Araucanía",
    phone: "",
    email: "",
    display_hours: "Lun-Vie 9-18",
    latitude: null,
    longitude: null,
    is_active: true,
  },
];

const mockAppointment: Appointment = {
  id: 1,
  patient: 10,
  patient_name: "Sofía Torres",
  patient_age: { years: 4, months: 0 },
  service: 1,
  service_name: "Control sano",
  location: 1,
  location_name: "Pucón",
  scheduled_date: "2026-06-10",
  start_time: "10:00:00",
  end_time: "10:30:00",
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
};

// ─── Tests ────────────────────────────────────────────────────────────────────

import { useQuery } from "@tanstack/react-query";
import Calendar from "../Calendar";

function setupQueries({
  locations = [] as Location[],
  appointments = [] as Appointment[],
  loading = false,
}: {
  locations?: Location[];
  appointments?: Appointment[];
  loading?: boolean;
} = {}) {
  let callCount = 0;
  (useQuery as Mock).mockImplementation(() => {
    callCount++;
    switch (callCount) {
      case 1:
        // locationsQ
        return { data: locations, isLoading: false };
      case 2:
        // apptsQ
        return { data: appointments, isLoading: loading };
      default:
        return { data: undefined, isLoading: false };
    }
  });
}

describe("Calendar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the month/year header", () => {
    setupQueries();
    render(<Calendar />);
    // Month name should appear — Calendar shows e.g. "Junio 2026"
    // We just check there's a bold heading with month text
    const header = screen.getByText(/202[0-9]/);
    expect(header).toBeInTheDocument();
  });

  it("renders Nuevo turno button", () => {
    setupQueries();
    render(<Calendar />);
    expect(screen.getByText("Nuevo turno")).toBeInTheDocument();
  });

  it("renders navigation Hoy button", () => {
    setupQueries();
    render(<Calendar />);
    expect(screen.getByText("Hoy")).toBeInTheDocument();
  });

  it("renders day column headers (Lun, Mar, etc.)", () => {
    setupQueries();
    render(<Calendar />);
    // These abbreviations come from DAY_ABBREVS
    expect(screen.getByText("Lun")).toBeInTheDocument();
    expect(screen.getByText("Mar")).toBeInTheDocument();
    // At least one more
    expect(screen.getByText("Mié")).toBeInTheDocument();
  });

  it("renders hour labels (08:00, 09:00, etc.)", () => {
    setupQueries();
    render(<Calendar />);
    expect(screen.getByText("08:00")).toBeInTheDocument();
    expect(screen.getByText("09:00")).toBeInTheDocument();
    expect(screen.getByText("10:00")).toBeInTheDocument();
  });

  it("renders sede filter tabs when locations are present", () => {
    setupQueries({ locations: mockLocations });
    render(<Calendar />);
    expect(screen.getByText("Todas")).toBeInTheDocument();
    expect(screen.getByText("Pucón")).toBeInTheDocument();
    expect(screen.getByText("Villarrica")).toBeInTheDocument();
  });

  it("does not render sede tabs when no locations", () => {
    setupQueries({ locations: [] });
    render(<Calendar />);
    // "Todas" only appears inside the segmented control when locations exist
    expect(screen.queryByText("Todas")).not.toBeInTheDocument();
  });

  it("renders week number label", () => {
    setupQueries();
    render(<Calendar />);
    expect(screen.getByText(/Semana \d+/)).toBeInTheDocument();
  });

  it("renders legend items", () => {
    setupQueries();
    render(<Calendar />);
    expect(screen.getByText("Control sano")).toBeInTheDocument();
    expect(screen.getByText("Consulta")).toBeInTheDocument();
    expect(screen.getByText("Online")).toBeInTheDocument();
  });

  it("renders appointment block patient name when appointment exists", () => {
    setupQueries({ appointments: [mockAppointment] });
    render(<Calendar />);
    expect(screen.getByText("Sofía Torres")).toBeInTheDocument();
  });

  it("shows loading spinner while appointments are loading", () => {
    setupQueries({ loading: true });
    const { container } = render(<Calendar />);
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });
});
