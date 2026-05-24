/**
 * Indicador "ao vivo" — chip que simula a aquisicao de dados do smartwatch.
 * Aparece SO quando o Modo Simulado esta ligado (representa estado real da
 * simulacao, nao e enfeite). Mostra ponto piscando + hora atualizando a cada 1s.
 * Nao e botao — e puramente informativo.
 */
import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeProvider";
import { spacing, radius, font } from "../theme/tokens";
import { useSimulation } from "../store/simulation";

export function LiveIndicator() {
  const { colors } = useTheme();
  const { ativo } = useSimulation();
  const [hora, setHora] = useState(() => new Date());
  const blink = useRef(new Animated.Value(1)).current;

  // Atualiza a hora a cada segundo (so quando ativo).
  useEffect(() => {
    if (!ativo) return;
    const t = setInterval(() => setHora(new Date()), 1000);
    return () => clearInterval(t);
  }, [ativo]);

  // Ponto piscando (loop suave).
  useEffect(() => {
    if (!ativo) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 0.2, duration: 700, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [ativo]);

  if (!ativo) return null;

  const hh = String(hora.getHours()).padStart(2, "0");
  const mm = String(hora.getMinutes()).padStart(2, "0");
  const ss = String(hora.getSeconds()).padStart(2, "0");

  return (
    <View style={[styles.chip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
      <Animated.View style={[styles.ponto, { backgroundColor: colors.success, opacity: blink }]} />
      <Ionicons name="watch-outline" size={14} color={colors.primary} />
      <Text style={[styles.texto, { color: colors.textMuted }]}>
        Smartwatch · sincronizando · {hh}:{mm}:{ss}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row", alignItems: "center", gap: spacing.xs,
    alignSelf: "flex-start", borderWidth: 1, borderRadius: radius.pill,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginBottom: spacing.md,
  },
  ponto: { width: 8, height: 8, borderRadius: 4 },
  texto: { fontSize: font.size.xs, fontWeight: font.weight.medium },
});
