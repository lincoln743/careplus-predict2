/**
 * GlassCard: card com efeito de vidro quando o tema futurista esta ativo.
 * Nos temas escuro/claro vira um Card simples (degrada bem).
 */
import React from "react";
import { View, StyleSheet, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "../theme/ThemeProvider";
import { radius } from "../theme/tokens";

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  alt?: boolean;
}

export function GlassCard({ children, style, alt }: Props) {
  const { colors } = useTheme();
  if (colors.fx) {
    return (
      <BlurView
        intensity={colors.blurIntensity ?? 40}
        tint={colors.blurTint ?? "dark"}
        style={[
          styles.base,
          {
            borderColor: colors.cardBorder ?? colors.border,
            shadowColor: colors.glowColor ?? "#000",
            shadowOpacity: 0.5,
            shadowRadius: colors.glowRadius ?? 12,
            shadowOffset: { width: 0, height: 0 },
            elevation: 8,
            backgroundColor: alt ? colors.surfaceAlt : colors.surface,
          },
          style,
        ]}
      >
        {children}
      </BlurView>
    );
  }
  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: alt ? colors.surfaceAlt : colors.surface,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
});
