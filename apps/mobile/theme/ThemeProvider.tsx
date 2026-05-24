/**
 * ThemeProvider: gerencia o tema (system/light/dark) com persistencia.
 * O modo "system" segue o esquema do aparelho. A preferencia e salva localmente.
 */
import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { darkColors, lightColors, type ThemeColors, type ThemeMode } from "./tokens";

interface ThemeContextValue {
  mode: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  setMode: (m: ThemeMode) => void;
  toggleDark: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const STORAGE_KEY = "@careplus/theme-mode";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme(); // 'light' | 'dark' | null
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === "light" || saved === "dark" || saved === "system") {
        setModeState(saved);
      }
    });
  }, []);

  function setMode(m: ThemeMode) {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m);
  }

  function toggleDark() {
    // Toggle direto: alterna entre claro e escuro explicitos.
    setMode(isDark ? "light" : "dark");
  }

  const effective = mode === "system" ? (system ?? "dark") : mode;
  const isDark = effective === "dark";
  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ mode, colors, isDark, setMode, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme deve estar dentro de ThemeProvider");
  return ctx;
}
