/**
 * Store de autenticacao (Zustand). Guarda a sessao e expoe login/logout.
 * O access token vai para o cliente de API; persistimos so o minimo.
 */
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest, setAccessToken } from "../api/client";

export type Perfil = "paciente" | "medico";
export type Role = "PATIENT" | "DOCTOR" | "ADMIN";

interface User {
  id: string;
  email: string;
  role: Role;
  nome: string;
}

interface LoginResponse {
  accessToken: string;
  user: User;
}

interface AuthState {
  user: User | null;
  carregando: boolean;
  erro: string | null;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
  restaurar: () => Promise<void>;
}

const TOKEN_KEY = "@careplus/access-token";
const USER_KEY = "@careplus/user";

export const useAuth = create<AuthState>((set) => ({
  user: null,
  carregando: false,
  erro: null,

  login: async (email, senha) => {
    set({ carregando: true, erro: null });
    try {
      const resp = await apiRequest<LoginResponse>("/auth/login", {
        method: "POST",
        body: { email, senha },
      });
      setAccessToken(resp.accessToken);
      await AsyncStorage.setItem(TOKEN_KEY, resp.accessToken);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(resp.user));
      set({ user: resp.user, carregando: false });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha no login";
      set({ erro: msg, carregando: false });
      throw e;
    }
  },

  logout: async () => {
    setAccessToken(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    set({ user: null });
  },

  restaurar: async () => {
    const [token, userStr] = await Promise.all([
      AsyncStorage.getItem(TOKEN_KEY),
      AsyncStorage.getItem(USER_KEY),
    ]);
    if (token && userStr) {
      setAccessToken(token);
      set({ user: JSON.parse(userStr) });
    }
  },
}));
