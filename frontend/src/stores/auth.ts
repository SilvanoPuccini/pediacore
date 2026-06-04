import { create } from "zustand";
import api from "@/lib/api";
import type { User, LoginRequest, RegisterRequest } from "@/types/api";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  initialize: () => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    const loginRequest: LoginRequest = { email, password };
    const { data } = await api.post<{ access: string; refresh: string }>(
      "/token/",
      loginRequest
    );
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);

    const profileRes = await api.get<User>("/profile/");
    set({ user: profileRes.data, isAuthenticated: true });
  },

  register: async (data: RegisterRequest) => {
    await api.post("/register/", data);
    // Auto-login after registration
    const tokenRes = await api.post<{ access: string; refresh: string }>(
      "/token/",
      { email: data.email, password: data.password }
    );
    localStorage.setItem("access_token", tokenRes.data.access);
    localStorage.setItem("refresh_token", tokenRes.data.refresh);

    const profileRes = await api.get<User>("/profile/");
    set({ user: profileRes.data, isAuthenticated: true });
  },

  logout: async () => {
    const refresh = localStorage.getItem("refresh_token");
    if (refresh) {
      try {
        await api.post("/token/blacklist/", { refresh });
      } catch {
        // Ignore blacklist errors — we still clear local state
      }
    }
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    set({ user: null, isAuthenticated: false });

    // Clear booking state so next user doesn't inherit a stale payment flow
    const { useBookingStore } = await import("@/features/booking/store/bookingStore");
    useBookingStore.getState().reset();
  },

  fetchProfile: async () => {
    const { data } = await api.get<User>("/profile/");
    set({ user: data, isAuthenticated: true });
  },

  initialize: async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      set({ isLoading: false });
      return;
    }
    try {
      const { data } = await api.get<User>("/profile/");
      set({ user: data, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
