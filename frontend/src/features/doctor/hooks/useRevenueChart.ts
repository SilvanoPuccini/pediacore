import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useSedeStore } from "../stores/useSedeStore";
import type { RevenuePoint } from "@/types/api";

export function useRevenueChart(days = 30) {
  const sedeId = useSedeStore((s) => s.sedeId);

  return useQuery({
    queryKey: ["revenue-chart", days, sedeId],
    queryFn: async () => {
      const params = new URLSearchParams({ days: String(days) });
      if (sedeId) params.set("location_id", String(sedeId));
      const { data } = await api.get<RevenuePoint[]>(
        `/dashboard/revenue-chart/?${params}`
      );
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
}
