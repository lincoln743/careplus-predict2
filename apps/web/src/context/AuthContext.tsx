import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { login as apiLogin, setAccessToken, carregarTokenSalvo, type Usuario } from "../api/client";

interface AuthCtx {
  user: Usuario | null;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => void;
}

const Ctx = createContext<AuthCtx>(null!);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    // Restaura sessao: se houver token salvo, mantem o usuario salvo tambem.
    const token = carregarTokenSalvo();
    const salvo = localStorage.getItem("cp_user");
    if (token && salvo) setUser(JSON.parse(salvo));
    setCarregando(false);
  }, []);

  async function entrar(email: string, senha: string) {
    const r = await apiLogin(email, senha);
    setAccessToken(r.accessToken);
    localStorage.setItem("cp_user", JSON.stringify(r.user));
    setUser(r.user);
  }

  function sair() {
    setAccessToken(null);
    localStorage.removeItem("cp_user");
    setUser(null);
  }

  return <Ctx.Provider value={{ user, carregando, entrar, sair }}>{children}</Ctx.Provider>;
}
