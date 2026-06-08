import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useSedeStore } from "../stores/useSedeStore";
import type { DashboardMetrics } from "@/types/api";

export function useDashboardMetrics() {
  const sedeId = useSedeStore((s) => s.sedeId);

  return useQuery({
    queryKey: ["dashboard-metrics", sedeId],
    queryFn: async () => {
      const params = sedeId ? `?location_id=${sedeId}` : "";
      const { data } = await api.get<DashboardMetrics>(
        `/dashboard/metrics/${params}`
      );
      return data;
    },
    staleTime: 1000 * 60 * 2,
  });
}
