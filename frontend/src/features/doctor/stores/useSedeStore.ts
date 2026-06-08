import { create } from "zustand";

interface SedeState {
  sedeId: number | null;
  sedeName: string;
  setSede: (id: number | null, name: string) => void;
  clearSede: () => void;
}

export const useSedeStore = create<SedeState>((set) => ({
  sedeId: null,
  sedeName: "Todas",
  setSede: (id, name) => set({ sedeId: id, sedeName: name }),
  clearSede: () => set({ sedeId: null, sedeName: "Todas" }),
}));
