import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useSedeStore } from "../stores/useSedeStore";
import type { DashboardReminder } from "@/types/api";

export function useReminders() {
  const sedeId = useSedeStore((s) => s.sedeId);

  return useQuery({
    queryKey: ["dashboard-reminders", sedeId],
    queryFn: async () => {
      const params = sedeId ? `?location_id=${sedeId}` : "";
      const { data } = await api.get<DashboardReminder[]>(
        `/dashboard/reminders/${params}`
      );
      return data;
    },
    staleTime: 1000 * 60 * 10,
  });
}
