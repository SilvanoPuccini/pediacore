import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Location, Service, AvailableSlot, Patient, PaginatedResponse } from "@/types/api";

const PRACTICE_SLUG = "dra-estefi";

// ─── Locations ─────────────────────────────────────────────────────────────────

export function useLocations() {
  return useQuery<PaginatedResponse<Location>>({
    queryKey: ["locations", PRACTICE_SLUG],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Location>>(
        `/practices/${PRACTICE_SLUG}/locations/`
      );
      return data;
    },
  });
}

// ─── Online schedule ────────────────────────────────────────────────────────────

export function useOnlineSchedule() {
  return useQuery<{ display_hours: string }>({
    queryKey: ["online-schedule", PRACTICE_SLUG],
    queryFn: async () => {
      const { data } = await api.get<{ display_hours: string }>(
        `/practices/${PRACTICE_SLUG}/online-hours/`
      );
      return data;
    },
  });
}

// ─── Working hours (for calendar day filtering) ─────────────────────────────────

interface WorkingHoursEntry {
  day_of_week: number;
}

export function useAvailableDays(locationId: number | "online" | null) {
  const isOnline = locationId === "online";

  return useQuery<number[]>({
    queryKey: ["available-days", locationId],
    queryFn: async () => {
      let url: string;
      if (isOnline) {
        // Get online working hours from online-hours endpoint days
        const { data } = await api.get<{ results: WorkingHoursEntry[] }>(
          `/practices/${PRACTICE_SLUG}/working-hours/online/`
        );
        return [...new Set(data.results.map((wh) => wh.day_of_week))];
      } else {
        url = `/locations/${locationId}/working-hours/`;
        const { data } = await api.get<{ results: WorkingHoursEntry[] }>(url);
        return [...new Set(data.results.map((wh) => wh.day_of_week))];
      }
    },
    enabled: locationId !== null,
  });
}

// ─── Services ──────────────────────────────────────────────────────────────────

export function useServices() {
  return useQuery<PaginatedResponse<Service>>({
    queryKey: ["services", PRACTICE_SLUG],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Service>>(
        `/practices/${PRACTICE_SLUG}/services/`
      );
      return data;
    },
  });
}

// ─── Available slots ───────────────────────────────────────────────────────────

interface UseSlotsParams {
  locationId: number | "online" | null;
  serviceId: number | null;
  date: string | null;
}

export function useSlots({ locationId, serviceId, date }: UseSlotsParams) {
  return useQuery<AvailableSlot[]>({
    queryKey: ["slots", locationId, serviceId, date],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        service: serviceId!,
        date: date!,
      };
      if (locationId !== "online") {
        params.location = locationId!;
      }
      const { data } = await api.get<AvailableSlot[]>("/available-slots/", { params });
      return data;
    },
    enabled: date !== null && serviceId !== null && locationId !== null,
  });
}

// ─── Patients (current user's children) ───────────────────────────────────────

interface UseMyPatientsOptions {
  enabled?: boolean;
}

export function useMyPatients({ enabled = true }: UseMyPatientsOptions = {}) {
  return useQuery<Patient[]>({
    queryKey: ["my-patients"],
    queryFn: async () => {
      const { data } = await api.get<Patient[]>("/patients/");
      return data;
    },
    enabled,
  });
}
