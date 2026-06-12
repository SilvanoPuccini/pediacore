import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { NotificationPreference } from "@/types/api";

const QUERY_KEY = ["notification-preferences"] as const;

const DEFAULT_PREFERENCES: Omit<NotificationPreference, "id" | "created_at" | "updated_at"> = {
  email_appointment_reminder: true,
  email_appointment_confirmed: true,
  email_appointment_cancelled: true,
  email_waitlist_available: true,
  email_payment_received: true,
  email_blog_posts: true,
};

// ─── useNotificationPreferences ───────────────────────────────────────────────

export function useNotificationPreferences() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data } = await api.get<NotificationPreference>(
        "/notification-preferences/"
      );
      return data;
    },
    // Graceful 404 — return defaults so the UI never crashes on a new tutor
    retry: (failureCount, error: unknown) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404) return false;
      return failureCount < 1;
    },
  });
}

// ─── useUpdateNotificationPreferences ─────────────────────────────────────────

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      updates: Partial<Omit<NotificationPreference, "id" | "created_at" | "updated_at">>
    ) => {
      const { data } = await api.patch<NotificationPreference>(
        "/notification-preferences/",
        updates
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEY, data);
    },
  });
}

export { DEFAULT_PREFERENCES };
