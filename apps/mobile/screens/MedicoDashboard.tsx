/**
 * Dashboard do medico, fiel a V1: cards de metricas, evolucao da saude,
 * acoes rapidas. Score medio derivado dos pacientes do motor (interligado).
 */
import React from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { spacing, radius, font } from "../theme/tokens";
import { useSimulation } from "../store/simulation";
import { ScoreGauge } from "../components/ScoreGauge";
import { LiveIndicator } from "../components/LiveIndicator";

function Metric({ icon, valor, label, cor }: { icon: string; valor: string; label: string; cor?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.metric, { backgroundColor: colors.surfaceAlt }]}>
      <Ionicons name={icon as never} size={20} color={cor ?? colors.primary} />
      <Text style={[styles.metricValor, { color: cor ?? colors.primary }]}>{valor}</Text>
      <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

export function MedicoDashboard({ navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { ativo, data } = useSimulation();

  const pacientes = ativo ? data.pacientes : [];
  const total = pacientes.length || 3;
  const altoRisco = pacientes.filter((p) => p.status === "alto_risco").length;
  const scoreMedio = pacientes.length ? Math.round(pacientes.reduce((a, p) => a + p.score, 0) / pacientes.length) : 90;
  const baixo = pacientes.filter((p) => p.score >= 70).length;
  const medio = pacientes.filter((p) => p.score >= 50 && p.score < 70).length;
  const alto = pacientes.filter((p) => p.score < 50).length;
  const pct = (n: number) => (pacientes.length ? Math.round((n / pacientes.length) * 100) : 0);

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + spacing.xl }]}>
      <Text style={[styles.titulo, { color: colors.primary }]}>Dashboard</Text>
      <Text style={[styles.fonte, { color: colors.textMuted }]}>Fonte: backend{ativo ? " · simulado" : ""}</Text>
      <LiveIndicator />

      <View style={[styles.bloco, { backgroundColor: colors.surface }]}>
        <Text style={[styles.blocoTitulo, { color: colors.primary }]}>Pacientes</Text>
        <View style={styles.grid}>
          <Metric icon="people" valor={`${total}`} label="Total" />
          <Metric icon="person" valor={`${total - altoRisco}`} label="Estáveis" />
          <Metric icon="warning" valor={`${altoRisco}`} label="Em Risco" cor={altoRisco > 0 ? colors.danger : colors.primary} />
          <Metric icon="sparkles" valor={`${total}`} label="Ativos" />
        </View>
      </View>

      <View style={[styles.bloco, { backgroundColor: colors.surface }]}>
        <Text style={[styles.blocoTitulo, { color: colors.primary }]}>Evolução da Saúde</Text>
        <ScoreGauge score={scoreMedio} label="Score médio" />
        <View style={styles.legendas}>
          <View style={styles.legenda}><View style={[styles.dot, { backgroundColor: colors.success }]} /><Text style={[styles.legText, { color: colors.text }]}>Baixo {pct(baixo)}%</Text></View>
          <View style={styles.legenda}><View style={[styles.dot, { backgroundColor: colors.warning }]} /><Text style={[styles.legText, { color: colors.text }]}>Médio {pct(medio)}%</Text></View>
          <View style={styles.legenda}><View style={[styles.dot, { backgroundColor: colors.danger }]} /><Text style={[styles.legText, { color: colors.text }]}>Alto {pct(alto)}%</Text></View>
        </View>
      </View>

      <View style={[styles.bloco, { backgroundColor: colors.surface }]}>
        <Text style={[styles.blocoTitulo, { color: colors.primary }]}>Ações Rápidas</Text>
        <View style={styles.grid}>
{([
            ["document-text", "Relatório Mensal", "em-breve"],
            ["alert-circle", "Pacientes Críticos", "navega"],
            ["calendar", "Agenda", "em-breve"],
            ["download", "Exportar Dados", "em-breve"],
          ] as const).map(([ic, t, acao], i) => (
            <Pressable
              key={i}
              style={[styles.acao, { backgroundColor: colors.surfaceAlt }]}
              onPress={() => {
                if (acao === "navega") navigation.navigate("Pacientes");
                else Alert.alert(t, "Funcionalidade em breve.");
              }}
            >
              <Ionicons name={ic as never} size={20} color={colors.primary} />
              <Text style={[styles.acaoText, { color: colors.text }]}>{t}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg },
  titulo: { fontSize: font.size.xxl, fontWeight: font.weight.bold },
  fonte: { fontStyle: "italic", marginBottom: spacing.md, fontSize: font.size.sm },
  bloco: { borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  blocoTitulo: { fontSize: font.size.lg, fontWeight: font.weight.semibold, marginBottom: spacing.md },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  metric: { flexBasis: "47%", flexGrow: 1, borderRadius: radius.md, padding: spacing.lg },
  metricValor: { fontSize: font.size.xl, fontWeight: font.weight.bold, marginTop: spacing.sm },
  metricLabel: { fontSize: font.size.xs, marginTop: 2 },
  legendas: { marginTop: spacing.md, gap: spacing.sm },
  legenda: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legText: { fontSize: font.size.sm },
  acao: { flexBasis: "47%", flexGrow: 1, borderRadius: radius.md, padding: spacing.lg, gap: spacing.sm },
  acaoText: { fontSize: font.size.sm, fontWeight: font.weight.medium },
});
