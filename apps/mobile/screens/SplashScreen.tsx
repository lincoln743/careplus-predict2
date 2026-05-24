/**
 * Splash screen inicial: logo CarePlus + slogan, exibida no boot antes do login.
 * Fiel ao app anterior. Some apos ~2s (controlado pelo App.tsx).
 */
import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { spacing } from "../theme/tokens";

export function SplashScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.logoWrap}>
        <Image
          source={require("../assets/careplus-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <Text style={[styles.slogan, { color: colors.primary }]}>
        Cuidar da saúde é prever o futuro
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  logoWrap: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  logo: { width: 160, height: 158 },
  slogan: { fontSize: 18, fontWeight: "600", textAlign: "center", fontStyle: "italic" },
});
