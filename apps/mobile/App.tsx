/**
 * Raiz do app. Fluxo: splash (5s) -> SEMPRE login (sem login automatico).
 * SafeAreaProvider envolve tudo (notch + area de botoes).
 */
import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "./theme/ThemeProvider";
import { useAuth } from "./store/auth";
import { SplashScreen } from "./screens/SplashScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { AppNavigator } from "./navigation";

function Root() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [mostrarSplash, setMostrarSplash] = useState(true);

  useEffect(() => {
    // Splash fixa de 5s. NAO restaura sessao automaticamente —
    // o usuario sempre passa pela tela de login ao abrir.
    const t = setTimeout(() => setMostrarSplash(false), 5000);
    return () => clearTimeout(t);
  }, []);

  if (mostrarSplash) {
    return (
      <>
        <StatusBar style={isDark ? "light" : "dark"} />
        <SplashScreen />
      </>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      {user ? <AppNavigator /> : <LoginScreen />}
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Root />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
