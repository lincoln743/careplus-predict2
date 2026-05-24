import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type Tema = "light" | "dark";
interface ThemeCtx { tema: Tema; alternar: () => void; }
const Ctx = createContext<ThemeCtx>(null!);
export const useTema = () => useContext(Ctx);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(() => {
    return (localStorage.getItem("cp_tema") as Tema) || "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", tema);
    localStorage.setItem("cp_tema", tema);
  }, [tema]);

  return <Ctx.Provider value={{ tema, alternar: () => setTema((t) => (t === "light" ? "dark" : "light")) }}>{children}</Ctx.Provider>;
}
