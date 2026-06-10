import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Mock } from "vitest";
import type { Patient, PaginatedResponse, Encounter, GrowthPoint } from "@/types/api";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("react-router-dom", () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/dashboard/pacientes/1" }),
  useParams: () => ({ id: "1" }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@/lib/api", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="chart-container">{children}</div>
  ),
  ComposedChart: ({ children }: any) => <div>{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

// ─── Mock data ────────────────────────────────────────────────────────────────

const mockPatient: Patient = {
  id: 1,
  first_name: "Mateo",
  last_name: "Ramírez",
  full_name: "Mateo Ramírez",
  date_of_birth: "2019-07-20",
  age: { years: 6, months: 10 },
  sex_at_birth: "M",
  document_type: "RUT",
  rut: "23.456.789-0",
  blood_type: "O+",
  allergies: "Penicilina",
  chronic_conditions: "",
  insurance: "FONASA",
  notes: "",
  photo: null,
  is_active: true,
  country: "CL",
  region: "Araucanía",
  comuna: "Pucón",
  address: "",
  phone: "",
  phone_prefix: "+56",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  tutors: [
    {
      id: 1,
      tutor: 200,
      tutor_email: "papa@test.com",
      tutor_full_name: "Carlos Ramírez",
      relationship: "Padre",
      is_primary: true,
      created_at: "2026-01-01T00:00:00Z",
    },
  ],
  last_encounter_date: "2026-05-01",
  next_appointment_date: "2026-07-01",
};

const emptyPaginated = <T,>(): PaginatedResponse<T> => ({
  count: 0,
  next: null,
  previous: null,
  results: [],
});

// ─── Tests ────────────────────────────────────────────────────────────────────

import { useQuery } from "@tanstack/react-query";
import PatientFicha from "../PatientFicha";

// useQuery is called multiple times in PatientFicha — we set up call-order responses
function setupQueries({
  patient = mockPatient,
  patientLoading = false,
}: {
  patient?: Patient | null;
  patientLoading?: boolean;
} = {}) {
  let callCount = 0;
  (useQuery as Mock).mockImplementation(() => {
    callCount++;
    switch (callCount) {
      case 1:
        // patient query
        return { data: patient, isLoading: patientLoading };
      case 2:
        // encounters query
        return { data: emptyPaginated<Encounter>(), isLoading: false };
      case 3:
        // growth query
        return { data: [] as GrowthPoint[], isLoading: false };
      case 4:
        // files count query
        return { data: { count: 0 }, isLoading: false };
      case 5:
        // files full query
        return { data: { count: 0, results: [] }, isLoading: false };
      default:
        return { data: undefined, isLoading: false };
    }
  });
}

describe("PatientFicha", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders patient full name", () => {
    setupQueries();
    render(<PatientFicha />);
    expect(screen.getByText("Mateo Ramírez")).toBeInTheDocument();
  });

  it("renders patient RUT", () => {
    setupQueries();
    render(<PatientFicha />);
    expect(screen.getByText(/23\.456\.789-0/)).toBeInTheDocument();
  });

  it("renders avatar with patient first initial", () => {
    setupQueries();
    render(<PatientFicha />);
    // The avatar shows the first letter of the full name
    const avatars = screen.getAllByText("M");
    expect(avatars.length).toBeGreaterThan(0);
  });

  it("renders age chip", () => {
    setupQueries();
    render(<PatientFicha />);
    // 6 years 10 months → "6 a 10 m"
    expect(screen.getByText("6 a 10 m")).toBeInTheDocument();
  });

  it("renders sex chip (Masculino)", () => {
    setupQueries();
    render(<PatientFicha />);
    expect(screen.getByText("Masculino")).toBeInTheDocument();
  });

  it("renders blood type chip", () => {
    setupQueries();
    render(<PatientFicha />);
    expect(screen.getByText("O+")).toBeInTheDocument();
  });

  it("renders tab buttons", () => {
    setupQueries();
    render(<PatientFicha />);
    expect(screen.getByText("Datos")).toBeInTheDocument();
    expect(screen.getByText("Antecedentes")).toBeInTheDocument();
    expect(screen.getByText("Consultas")).toBeInTheDocument();
    expect(screen.getByText("Crecimiento")).toBeInTheDocument();
    expect(screen.getByText("Archivos")).toBeInTheDocument();
    expect(screen.getByText("Vacunas")).toBeInTheDocument();
  });

  it("renders Volver button", () => {
    setupQueries();
    render(<PatientFicha />);
    expect(screen.getByText("Volver")).toBeInTheDocument();
  });

  it("renders Editar button", () => {
    setupQueries();
    render(<PatientFicha />);
    expect(screen.getByText("Editar")).toBeInTheDocument();
  });

  it("renders Nueva consulta button", () => {
    setupQueries();
    render(<PatientFicha />);
    expect(screen.getByText("Nueva consulta")).toBeInTheDocument();
  });

  it("shows loading spinner while patient data is loading", () => {
    setupQueries({ patientLoading: true, patient: undefined as any });
    const { container } = render(<PatientFicha />);
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("shows not found message when patient is null", () => {
    setupQueries({ patient: null });
    render(<PatientFicha />);
    expect(screen.getByText("Paciente no encontrado")).toBeInTheDocument();
  });
});
