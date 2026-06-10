import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ChildStatCard from "@/features/tutor/components/ChildStatCard";
import type { Patient } from "@/types/api";

vi.mock("react-router-dom", () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 1,
    first_name: "Sofía",
    last_name: "Ramírez",
    full_name: "Sofía Ramírez",
    date_of_birth: "2020-03-15",
    age: { years: 4, months: 3 },
    sex_at_birth: "F",
    document_type: "RUT",
    rut: "11111111-1",
    blood_type: "",
    allergies: "",
    chronic_conditions: "",
    insurance: "",
    notes: "",
    photo: null,
    is_active: true,
    country: "CL",
    region: "",
    comuna: "",
    address: "",
    phone: "",
    phone_prefix: "+56",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    tutors: [],
    next_appointment_date: null,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ChildStatCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the patient full name", () => {
    render(<ChildStatCard patient={makePatient()} index={0} />);
    expect(screen.getByText("Sofía Ramírez")).toBeInTheDocument();
  });

  it("links to the correct patient detail URL", () => {
    render(<ChildStatCard patient={makePatient({ id: 42 })} index={0} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/portal/hijos/42");
  });

  it("renders the vaccine status chip with 'Al día'", () => {
    render(<ChildStatCard patient={makePatient()} index={0} />);
    expect(screen.getByText("Al día")).toBeInTheDocument();
  });

  it("renders Avatar with the patient name initial", () => {
    render(<ChildStatCard patient={makePatient()} index={0} />);
    // Avatar renders the first uppercase character of full_name
    expect(screen.getByText("S")).toBeInTheDocument();
  });

  it("shows the next appointment date when present", () => {
    const patient = makePatient({ next_appointment_date: "2026-07-20" });
    render(<ChildStatCard patient={patient} index={0} />);
    // Should show a "Próx:" prefix with the formatted date
    const proximoEl = screen.getByText(/Próx:/);
    expect(proximoEl).toBeInTheDocument();
  });

  it("does not show next appointment line when absent", () => {
    render(<ChildStatCard patient={makePatient({ next_appointment_date: null })} index={0} />);
    expect(screen.queryByText(/Próx:/)).not.toBeInTheDocument();
  });

  it("renders patient age in years for a child over 1 year old", () => {
    // DOB 4+ years ago relative to today's date in tests
    // date_of_birth chosen so calculateAge returns "> 1 year"
    render(<ChildStatCard patient={makePatient({ date_of_birth: "2020-01-01" })} index={0} />);
    const ageEl = screen.getByText(/año/);
    expect(ageEl).toBeInTheDocument();
  });

  it("renders patient age in months for a child under 1 year old", () => {
    const recent = new Date();
    recent.setMonth(recent.getMonth() - 3);
    const dob = recent.toISOString().split("T")[0];
    render(<ChildStatCard patient={makePatient({ date_of_birth: dob })} index={0} />);
    const ageEl = screen.getByText(/mes/);
    expect(ageEl).toBeInTheDocument();
  });

  it("uses the correct child index to derive palette (no crash for any index)", () => {
    // Just ensure different palette indices render without errors
    const { unmount } = render(<ChildStatCard patient={makePatient()} index={1} />);
    expect(screen.getByText("Sofía Ramírez")).toBeInTheDocument();
    unmount();
    render(<ChildStatCard patient={makePatient()} index={3} />);
    expect(screen.getByText("Sofía Ramírez")).toBeInTheDocument();
  });
});
