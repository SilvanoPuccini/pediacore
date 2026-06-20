import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import HeroAppointmentCard from "@/features/tutor/components/HeroAppointmentCard";
import type { Appointment } from "@/types/api";

vi.mock("react-router-dom", () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useMutation: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

// ─── Fixture ──────────────────────────────────────────────────────────────────

function makeAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 10,
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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("HeroAppointmentCard", () => {
  describe("loading state", () => {
    it("shows an animated skeleton when loading=true", () => {
      const { container } = render(
        <HeroAppointmentCard appointment={undefined} loading={true} />
      );
      const skeleton = container.querySelector(".animate-pulse");
      expect(skeleton).toBeInTheDocument();
    });

    it("does not render patient name during loading", () => {
      render(<HeroAppointmentCard appointment={undefined} loading={true} />);
      expect(screen.queryByText("Sofía Ramírez")).not.toBeInTheDocument();
    });
  });

  describe("empty state (no appointment)", () => {
    it("shows 'No tenés turnos próximos' when appointment is null", () => {
      render(<HeroAppointmentCard appointment={null} loading={false} />);
      expect(
        screen.getByText("No tenés turnos próximos")
      ).toBeInTheDocument();
    });

    it("shows a 'Reservar turno' link pointing to /booking", () => {
      render(<HeroAppointmentCard appointment={null} loading={false} />);
      const link = screen.getByRole("link", { name: /Reservar turno/i });
      expect(link).toHaveAttribute("href", "/booking");
    });

    it("shows 'Reservá un turno para comenzar.' subtitle", () => {
      render(<HeroAppointmentCard appointment={null} loading={false} />);
      expect(
        screen.getByText("Reservá un turno para comenzar.")
      ).toBeInTheDocument();
    });
  });

  describe("with an appointment", () => {
    it("renders the patient name", () => {
      render(<HeroAppointmentCard appointment={makeAppointment()} loading={false} />);
      expect(screen.getByText("Sofía Ramírez")).toBeInTheDocument();
    });

    it("renders the service name", () => {
      render(<HeroAppointmentCard appointment={makeAppointment()} loading={false} />);
      expect(screen.getByText("Control de niño sano")).toBeInTheDocument();
    });

    it("renders the start time (HH:MM)", () => {
      render(<HeroAppointmentCard appointment={makeAppointment()} loading={false} />);
      expect(screen.getByText("10:30")).toBeInTheDocument();
    });

    it("renders the location name for a presential appointment", () => {
      render(<HeroAppointmentCard appointment={makeAppointment()} loading={false} />);
      expect(screen.getByText("Pucón")).toBeInTheDocument();
    });

    it("shows a StatusBadge with 'Confirmado' label", () => {
      render(<HeroAppointmentCard appointment={makeAppointment()} loading={false} />);
      expect(screen.getByText("Confirmado")).toBeInTheDocument();
    });

    it("renders the day number from the scheduled date", () => {
      render(
        <HeroAppointmentCard
          appointment={makeAppointment({ scheduled_date: "2026-08-10" })}
          loading={false}
        />
      );
      expect(screen.getByText("10")).toBeInTheDocument();
    });

    it("shows 'Online' and a join button for a confirmed online appointment", () => {
      render(
        <HeroAppointmentCard
          appointment={makeAppointment({
            is_online: true,
            status: "CONFIRMED",
            meeting_link: "https://meet.example.com/abc",
          })}
          loading={false}
        />
      );
      expect(screen.getByText("Online")).toBeInTheDocument();
      expect(screen.getByText("Unirme online")).toBeInTheDocument();
    });

    it("does not show the join button when appointment is not confirmed", () => {
      render(
        <HeroAppointmentCard
          appointment={makeAppointment({
            is_online: true,
            status: "HOLD",
            meeting_link: "https://meet.example.com/abc",
          })}
          loading={false}
        />
      );
      expect(screen.queryByText("Unirme online")).not.toBeInTheDocument();
    });

    it("does not show the join button when meeting_link is empty", () => {
      render(
        <HeroAppointmentCard
          appointment={makeAppointment({
            is_online: true,
            status: "CONFIRMED",
            meeting_link: "",
          })}
          loading={false}
        />
      );
      expect(screen.queryByText("Unirme online")).not.toBeInTheDocument();
    });

    it("shows 'Pendiente de pago' status badge for HOLD status", () => {
      render(
        <HeroAppointmentCard
          appointment={makeAppointment({ status: "HOLD" })}
          loading={false}
        />
      );
      expect(screen.getByText("Pendiente de pago")).toBeInTheDocument();
    });

    it("shows 'Pagar' button for unpaid appointments (HOLD/PENDING)", () => {
      render(
        <HeroAppointmentCard
          appointment={makeAppointment({ status: "HOLD" })}
          loading={false}
        />
      );
      expect(screen.getByText("Pagar")).toBeInTheDocument();
    });

    it("does not show 'Pagar' for a confirmed paid appointment", () => {
      render(
        <HeroAppointmentCard
          appointment={makeAppointment({ status: "CONFIRMED" })}
          loading={false}
        />
      );
      expect(screen.queryByText("Pagar")).not.toBeInTheDocument();
    });

    it("shows 'Próximo turno' label", () => {
      render(<HeroAppointmentCard appointment={makeAppointment()} loading={false} />);
      expect(screen.getByText("Próximo turno")).toBeInTheDocument();
    });
  });
});
