/**
 * Home do paciente, fiel a V1. Quando o Modo Simulado esta LIGADO, os dados
 * vem do motor (useSimulation) e pulsam a cada 5s. Desligado, usa valores do backend.
 */
import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { spacing, radius, font } from "../theme/tokens";
import { ScoreGauge } from "../components/ScoreGauge";
import { useSimulation } from "../store/simulation";
import { LiveIndicator } from "../components/LiveIndicator";
import { LiveValue } from "../components/LiveValue";

function MetricCard({ icon, titulo, valor, cor }: { icon: React.ReactNode; titulo: string; valor: string; cor?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardIcon}>{icon}</View>
      <Text style={[styles.cardTitulo, { color: colors.textMuted }]}>{titulo}</Text>
      <LiveValue value={valor} style={[styles.cardValor, { color: cor ?? colors.primary }]}>{valor}</LiveValue>
    </View>
  );
}

export function HomeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { ativo, data } = useSimulation();

  // Modo simulado: dados do motor. Modo real: valores fixos (do backend, item 3 futuro).
  const score = ativo ? data.score : 95;
  const fc = ativo ? data.fcMedia : 78;
  const passos = ativo ? data.passosHoje : 9412;
  const sono = ativo ? data.sonoHoje : 7.5;
  const progresso = ativo ? data.progresso : 95;

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + spacing.xl }]}>
      <Text style={[styles.titulo, { color: colors.primary }]}>Início</Text>
      <Text style={[styles.fonte, { color: colors.textMuted }]}>
        Fonte: backend{ativo ? " · simulado" : ""}
      </Text>
      <LiveIndicator />

      <ScoreGauge score={score} label={score >= 80 ? "Estável" : score >= 60 ? "Atenção" : "Risco"} />

      <View style={styles.grid}>
        <MetricCard icon={<Ionicons name="heart" size={26} color={colors.heart} />} titulo="FC Média" valor={`${fc} bpm`} />
        <MetricCard icon={<FontAwesome5 name="walking" size={24} color={colors.primary} />} titulo="Passos" valor={`${passos}`} />
        <MetricCard icon={<Ionicons name="moon" size={24} color={colors.primary} />} titulo="Sono" valor={`${sono} h`} />
        <MetricCard icon={<Ionicons name="bar-chart" size={24} color={colors.success} />} titulo="Progresso" valor={`${progresso}%`} cor={colors.success} />
      </View>

      <View style={[styles.bloco, { backgroundColor: colors.surface }]}>
        <Text style={[styles.blocoTitulo, { color: colors.primary }]}>Análise de Risco</Text>
        <View style={styles.riscoLinha}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.riscoTitulo, { color: colors.text }]}>Atividade Física</Text>
            <Text style={[styles.riscoSub, { color: colors.textMuted }]}>{passos} passos/dia</Text>
          </View>
          <Text style={[styles.badge, { color: passos > 7000 ? colors.success : colors.warning }]}>{passos > 7000 ? "Baixo" : "Médio"}</Text>
        </View>
        <View style={styles.riscoLinha}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.riscoTitulo, { color: colors.text }]}>Padrão de Sono</Text>
            <Text style={[styles.riscoSub, { color: colors.textMuted }]}>{sono} h/noite</Text>
          </View>
          <Text style={[styles.badge, { color: sono >= 7 ? colors.success : colors.warning }]}>{sono >= 7 ? "Baixo" : "Médio"}</Text>
        </View>
      </View>

      <View style={[styles.bloco, { backgroundColor: colors.surface }]}>
        <Text style={[styles.blocoTitulo, { color: colors.primary }]}>Recomendações</Text>
        <View style={styles.recLinha}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={[styles.recTexto, { color: colors.text }]}>Tente alcançar 10.000 passos diários.</Text>
        </View>
        <View style={styles.recLinha}>
          <Ionicons name="water" size={18} color={colors.primary} />
          <Text style={[styles.recTexto, { color: colors.text }]}>Hidrate-se ao longo do dia.</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg },
  titulo: { fontSize: font.size.xxl, fontWeight: font.weight.bold },
  fonte: { fontStyle: "italic", marginBottom: spacing.md, fontSize: font.size.sm },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginBottom: spacing.lg },
  card: { flexBasis: "47%", flexGrow: 1, borderRadius: radius.md, padding: spacing.lg, alignItems: "center" },
  cardIcon: { marginBottom: spacing.sm, height: 28, justifyContent: "center" },
  cardTitulo: { marginBottom: spacing.xs, fontSize: font.size.sm },
  cardValor: { fontSize: font.size.xl, fontWeight: font.weight.bold },
  bloco: { borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  blocoTitulo: { fontSize: font.size.lg, fontWeight: font.weight.semibold, marginBottom: spacing.md },
  riscoLinha: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm },
  riscoTitulo: { fontSize: font.size.md },
  riscoSub: { fontSize: font.size.xs, marginTop: 2 },
  badge: { fontWeight: font.weight.bold, fontSize: font.size.md },
  recLinha: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm },
  recTexto: { fontSize: font.size.md, flex: 1 },
});
