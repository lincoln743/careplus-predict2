/**
 * ThemeProvider: gerencia o tema com APENAS dois estados — claro e escuro.
 * (Sem "seguir o sistema".) Padrao inicial: escuro (dark-first, identidade V1).
 * A preferencia e salva localmente e restaurada ao abrir.
 */
import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { darkColors, lightColors, type ThemeColors } from "./tokens";

interface ThemeContextValue {
  colors: ThemeColors;
  isDark: boolean;
  setDark: (v: boolean) => void;
  toggleDark: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const STORAGE_KEY = "@careplus/dark-mode";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Padrao: escuro. Restaura a preferencia salva ao abrir.
  const [isDark, setIsDark] = useState<boolean>(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === "0") setIsDark(false);
      else if (saved === "1") setIsDark(true);
    });
  }, []);

  function setDark(v: boolean) {
    setIsDark(v);
    AsyncStorage.setItem(STORAGE_KEY, v ? "1" : "0");
  }

  function toggleDark() {
    setDark(!isDark);
  }

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ colors, isDark, setDark, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme deve estar dentro de ThemeProvider");
  return ctx;
}
