import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  apiKey: string;
  isAuthenticated: boolean;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      apiKey: "",
      isAuthenticated: false,
      setApiKey: (key: string) => set({ apiKey: key, isAuthenticated: !!key }),
      clearApiKey: () => set({ apiKey: "", isAuthenticated: false }),
    }),
    { name: "vault-bot-auth" }
  )
);
