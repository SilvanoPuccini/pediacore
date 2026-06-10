import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Mock } from "vitest";
import type { Patient } from "@/types/api";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("react-router-dom", () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/dashboard/pacientes" }),
  useParams: () => ({}),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@/lib/api", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

// ─── Mock data ────────────────────────────────────────────────────────────────

const mockPatient: Patient = {
  id: 1,
  first_name: "Valentina",
  last_name: "González",
  full_name: "Valentina González",
  date_of_birth: "2020-03-15",
  age: { years: 6, months: 3 },
  sex_at_birth: "F",
  document_type: "RUT",
  rut: "12.345.678-9",
  blood_type: "A+",
  allergies: "",
  chronic_conditions: "",
  insurance: "FONASA",
  notes: "",
  photo: null,
  is_active: true,
  country: "CL",
  region: "",
  comuna: "",
  address: "",
  phone: "",
  phone_prefix: "+56",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  tutors: [
    {
      id: 1,
      tutor: 100,
      tutor_email: "mama@test.com",
      tutor_full_name: "Claudia González",
      relationship: "Madre",
      is_primary: true,
      created_at: "2026-01-01T00:00:00Z",
    },
  ],
  last_encounter_date: null,
  next_appointment_date: null,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

import { useQuery } from "@tanstack/react-query";
import Patients from "../Patients";

describe("Patients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders search input with correct placeholder", () => {
    (useQuery as Mock).mockReturnValue({ data: undefined, isLoading: false });
    render(<Patients />);
    expect(
      screen.getByPlaceholderText("Buscar paciente por nombre o RUT")
    ).toBeInTheDocument();
  });

  it("shows Nuevo paciente button", () => {
    (useQuery as Mock).mockReturnValue({ data: undefined, isLoading: false });
    render(<Patients />);
    expect(screen.getByText("Nuevo paciente")).toBeInTheDocument();
  });

  it("shows Más filtros button", () => {
    (useQuery as Mock).mockReturnValue({ data: undefined, isLoading: false });
    render(<Patients />);
    expect(screen.getByText("Más filtros")).toBeInTheDocument();
  });

  it("renders table column headers when patients exist", () => {
    (useQuery as Mock).mockReturnValue({
      data: { count: 1, results: [mockPatient], next: null, previous: null },
      isLoading: false,
    });
    render(<Patients />);
    expect(screen.getByText("Paciente")).toBeInTheDocument();
    expect(screen.getByText("Edad")).toBeInTheDocument();
    expect(screen.getByText("Tutor principal")).toBeInTheDocument();
    expect(screen.getByText("Última consulta")).toBeInTheDocument();
    expect(screen.getByText("Próximo control")).toBeInTheDocument();
  });

  it("renders patient name from mock data", () => {
    (useQuery as Mock).mockReturnValue({
      data: { count: 1, results: [mockPatient], next: null, previous: null },
      isLoading: false,
    });
    render(<Patients />);
    expect(screen.getByText("Valentina González")).toBeInTheDocument();
  });

  it("renders patient RUT", () => {
    (useQuery as Mock).mockReturnValue({
      data: { count: 1, results: [mockPatient], next: null, previous: null },
      isLoading: false,
    });
    render(<Patients />);
    expect(screen.getByText("12.345.678-9")).toBeInTheDocument();
  });

  it("renders tutor name", () => {
    (useQuery as Mock).mockReturnValue({
      data: { count: 1, results: [mockPatient], next: null, previous: null },
      isLoading: false,
    });
    render(<Patients />);
    expect(screen.getByText("Claudia González")).toBeInTheDocument();
  });

  it("shows empty state when query returns no results", () => {
    (useQuery as Mock).mockReturnValue({
      data: { count: 0, results: [], next: null, previous: null },
      isLoading: false,
    });
    render(<Patients />);
    expect(screen.getByText("Sin resultados")).toBeInTheDocument();
  });

  it("renders age bucket filter chips", () => {
    (useQuery as Mock).mockReturnValue({ data: undefined, isLoading: false });
    render(<Patients />);
    expect(screen.getByText("Todos")).toBeInTheDocument();
    expect(screen.getByText("Lactantes (0-2)")).toBeInTheDocument();
  });
});
