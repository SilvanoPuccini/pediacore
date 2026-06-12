import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { CoResponsible, PaginatedResponse } from "@/types/api";

type CoResponsiblePayload = Omit<
  CoResponsible,
  "id" | "relationship_display" | "created_at"
>;

export function useCoResponsibles() {
  return useQuery({
    queryKey: ["co-responsibles"],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<CoResponsible>>("/co-responsibles/");
      return data.results;
    },
  });
}

export function useCreateCoResponsible() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CoResponsiblePayload) => {
      const { data } = await api.post<CoResponsible>("/co-responsibles/", payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["co-responsibles"] }),
  });
}

export function useDeleteCoResponsible() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/co-responsibles/${id}/`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["co-responsibles"] }),
  });
}
