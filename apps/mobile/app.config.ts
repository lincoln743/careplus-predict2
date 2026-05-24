import type { ExpoConfig } from "expo/config";

// A URL da API vem de variavel de ambiente (EXPO_PUBLIC_API_BASE_URL).
// Em dev, aponte para o IP da SUA MAQUINA na rede local (nao "localhost",
// que no celular se refere ao proprio telefone). Ex: http://192.168.0.10:3000
const config: ExpoConfig = {
  name: "CarePlus Predict",
  slug: "careplus-predict",
  version: "2.0.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic", // suporta claro/escuro do sistema
  splash: { resizeMode: "contain", backgroundColor: "#0E1518" },
  ios: { supportsTablet: true },
  android: {
    package: "com.careplus.predict",
    softwareKeyboardLayoutMode: "pan",
  },
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
  },
};

export default config;
