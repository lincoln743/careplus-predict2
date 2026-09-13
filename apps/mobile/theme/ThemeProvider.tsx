/**
 * ThemeProvider: gerencia 3 temas — "escuro" | "claro" | "futurista".
 * Mantem isDark / setDark / toggleDark como derivados para nao quebrar
 * componentes existentes (toggle altera somente entre claro<->escuro).
 */
import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { darkColors, lightColors, futuristaColors, type ThemeColors } from "./tokens";

export type ThemeName = "escuro" | "claro" | "futurista";

interface ThemeContextValue {
  colors: ThemeColors;
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
  // compat com codigo existente:
  isDark: boolean;
  setDark: (v: boolean) => void;
  toggleDark: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const STORAGE_KEY = "@careplus/theme-v2";
const LEGACY_KEY  = "@careplus/dark-mode";

const ALL: Record<ThemeName, ThemeColors> = {
  escuro: darkColors,
  claro: lightColors,
  futurista: futuristaColors,
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>("escuro");

  // Carrega preferencia salva (com migracao do formato antigo)
  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved === "escuro" || saved === "claro" || saved === "futurista") {
        setThemeState(saved); return;
      }
      // migracao do booleano legado
      const legacy = await AsyncStorage.getItem(LEGACY_KEY);
      if (legacy === "0") setThemeState("claro");
      else if (legacy === "1") setThemeState("escuro");
    })();
  }, []);

  function setTheme(t: ThemeName) {
    setThemeState(t);
    AsyncStorage.setItem(STORAGE_KEY, t);
  }

  // Compat: isDark e true para "escuro" e "futurista"
  const isDark = theme !== "claro";

  function setDark(v: boolean) {
    setTheme(v ? "escuro" : "claro");
  }

  function toggleDark() {
    // ignora futurista — so alterna claro <-> escuro
    setDark(!(theme !== "claro"));
  }

  const colors = ALL[theme];

  return (
    <ThemeContext.Provider value={{ colors, theme, setTheme, isDark, setDark, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme deve estar dentro de ThemeProvider");
  return ctx;
}
