import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import api from "@/lib/api";
import type { BookingRequest, BookingResponse, Patient, PatientCreate } from "@/types/api";

// ─── Book appointment (POST /api/v1/book/) ────────────────────────────────────

export function useBookAppointment() {
  return useMutation<BookingResponse, AxiosError, BookingRequest>({
    mutationFn: async (payload) => {
      const { data } = await api.post<BookingResponse>("/book/", payload);
      return data;
    },
  });
}

// ─── Create patient (POST /api/v1/patients/) ─────────────────────────────────

export function useCreatePatient() {
  const queryClient = useQueryClient();

  return useMutation<Patient, AxiosError, PatientCreate>({
    mutationFn: async (payload) => {
      const { data } = await api.post<Patient>("/patients/", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-patients"] });
    },
  });
}

// ─── Delete patient (DELETE /api/v1/patients/:id/) ───────────────────────────

export function useDeletePatient() {
  const queryClient = useQueryClient();

  return useMutation<void, AxiosError, number>({
    mutationFn: async (patientId) => {
      await api.delete(`/patients/${patientId}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-patients"] });
    },
  });
}
