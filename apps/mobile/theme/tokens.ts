/**
 * Tokens de tema do CarePlus Predict.
 * Cor da marca: #0179CF (azul CarePlus/Bupa).
 * Tres temas: escuro (default), claro, futurista (neon ciano + vidro).
 */

export interface ThemeColors {
  primary: string;
  primaryMuted: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  textOnPrimary: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
  heart: string;
  // tokens de apresentacao (opcionais — so o futurista usa)
  fx?: boolean;
  cardBorder?: string;
  glowColor?: string;
  glowRadius?: number;
  blurIntensity?: number;
  blurTint?: "dark" | "light";
  meshFrom?: string;
  meshTo?: string;
}

const BRAND = "#0179CF";
const BRAND_BRIGHT = "#2E9BE6";

export const darkColors: ThemeColors = {
  primary: BRAND_BRIGHT, primaryMuted: "#1B5C8A",
  background: "#0D1217", surface: "#161D24", surfaceAlt: "#1E2730",
  text: "#EAF1F6", textMuted: "#8696A4", textOnPrimary: "#FFFFFF",
  border: "#233039",
  success: "#34C77B", warning: "#E0A82E", danger: "#E5484D", heart: "#FF6B81",
};

export const lightColors: ThemeColors = {
  primary: BRAND, primaryMuted: "#9FCDEC",
  background: "#F4F8FB", surface: "#FFFFFF", surfaceAlt: "#ECF3F8",
  text: "#13222E", textMuted: "#5E7281", textOnPrimary: "#FFFFFF",
  border: "#DCE6EE",
  success: "#149E5C", warning: "#B07D14", danger: "#C2282D", heart: "#E84860",
};

// Tema futurista — neon ciano sobre fundo "espacial" + vidro
export const futuristaColors: ThemeColors = {
  primary: "#2EE6F6", primaryMuted: "#15788A",
  background: "#04070E",
  surface: "rgba(16,30,50,0.55)",      // vidro — exige BlurView por baixo
  surfaceAlt: "rgba(24,42,66,0.45)",
  text: "#EAFBFF", textMuted: "#82A2B8", textOnPrimary: "#04121A",
  border: "rgba(46,230,246,0.36)",
  success: "#2BFFC2", warning: "#FFD45E", danger: "#FF5277", heart: "#FF5C95",
  fx: true,
  cardBorder: "rgba(46,230,246,0.36)",
  glowColor: "#2EE6F6", glowRadius: 24,
  blurIntensity: 40, blurTint: "dark",
  meshFrom: "rgba(46,230,246,0.16)",
  meshTo: "rgba(43,150,255,0.14)",
};

export const spacing = { xs: 4, sm: 8, md: 14, lg: 20, xl: 28 };
export const radius = { sm: 8, md: 12, lg: 18, pill: 999 };

export const font = {
  size: { xs: 11, sm: 13, md: 15, lg: 17, xl: 22, xxl: 30 },
  weight: { regular: "400", medium: "500", semibold: "600", bold: "700" } as const,
};
