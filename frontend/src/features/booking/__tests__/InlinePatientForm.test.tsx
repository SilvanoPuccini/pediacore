import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InlinePatientForm from "../components/InlinePatientForm";
import { useBookingStore } from "../store/bookingStore";

const mockMutate = vi.fn();
let mockIsPending = false;

vi.mock("../hooks/useBookingMutations", () => ({
  useCreatePatient: () => ({
    mutate: mockMutate,
    get isPending() {
      return mockIsPending;
    },
    isError: false,
    error: null,
  }),
}));

vi.mock("../store/bookingStore", () => ({
  useBookingStore: vi.fn(),
}));

const mockSetPatient = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mockIsPending = false;
  (useBookingStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    setPatient: mockSetPatient,
  });
});

describe("InlinePatientForm", () => {
  it("renders form with nombre, apellido and fecha fields", () => {
    render(<InlinePatientForm />);
    expect(screen.getByPlaceholderText(/Valentina/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/González/i)).toBeInTheDocument();
    expect(screen.getByText(/Fecha de nacimiento/i)).toBeInTheDocument();
  });

  it("shows validation errors when submitting empty form", async () => {
    const user = userEvent.setup();
    render(<InlinePatientForm />);
    await user.click(screen.getByRole("button", { name: /Agregar paciente/i }));
    expect(await screen.findByText("El nombre es requerido.")).toBeInTheDocument();
    expect(screen.getByText("El apellido es requerido.")).toBeInTheDocument();
    expect(screen.getByText("La fecha de nacimiento es requerida.")).toBeInTheDocument();
  });

  it("shows validation error for future date of birth", async () => {
    const user = userEvent.setup();
    const { container } = render(<InlinePatientForm />);

    await user.type(screen.getByPlaceholderText(/Valentina/i), "Ana");
    await user.type(screen.getByPlaceholderText(/González/i), "López");

    const futureDate = new Date(Date.now() + 86400 * 1000).toISOString().split("T")[0];
    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
    await user.clear(dateInput);
    await user.type(dateInput, futureDate);

    await user.click(screen.getByRole("button", { name: /Agregar paciente/i }));
    expect(await screen.findByText("La fecha no puede ser futura.")).toBeInTheDocument();
  });

  it("calls mutate with correct payload when form is valid", async () => {
    const user = userEvent.setup();
    const { container } = render(<InlinePatientForm />);

    await user.type(screen.getByPlaceholderText(/Valentina/i), "Valentina");
    await user.type(screen.getByPlaceholderText(/González/i), "Pérez");

    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
    await user.clear(dateInput);
    await user.type(dateInput, "2020-06-15");

    await user.click(screen.getByRole("button", { name: /Agregar paciente/i }));

    expect(mockMutate).toHaveBeenCalledOnce();
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        practice: 1,
        first_name: "Valentina",
        last_name: "Pérez",
        date_of_birth: "2020-06-15",
        document_type: "RUT",
        country: "Chile",
      }),
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      })
    );
  });

  it("shows 'Guardando…' and disables button when mutation is pending", () => {
    mockIsPending = true;
    render(<InlinePatientForm />);
    const button = screen.getByRole("button", { name: /Guardando…/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });
});
