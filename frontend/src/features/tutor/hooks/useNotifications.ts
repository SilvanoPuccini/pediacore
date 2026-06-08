import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Notification, PaginatedResponse, UnreadCountResponse } from "@/types/api";

const PAGE_SIZE = 5;

// ─── Query keys ───────────────────────────────────────────────────────────────

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (page: number) => ["notifications", "list", page] as const,
  unreadCount: ["notifications", "unread-count"] as const,
};

// ─── useUnreadCount ───────────────────────────────────────────────────────────

export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: async () => {
      const { data } = await api.get<UnreadCountResponse>(
        "/notifications/unread-count/"
      );
      return data.unread_count;
    },
    refetchInterval: 30_000,
    initialData: 0,
  });
}

// ─── useNotifications ─────────────────────────────────────────────────────────

export function useNotifications(page = 1) {
  return useQuery({
    queryKey: notificationKeys.list(page),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Notification>>(
        "/notifications/",
        { params: { page, page_size: PAGE_SIZE } }
      );
      return data;
    },
  });
}

// ─── useMarkRead ──────────────────────────────────────────────────────────────

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<Notification>(
        `/notifications/${id}/read/`
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

// ─── useMarkAllRead ───────────────────────────────────────────────────────────

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ marked_read: number }>(
        "/notifications/read-all/"
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
