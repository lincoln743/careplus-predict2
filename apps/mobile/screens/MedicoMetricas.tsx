/**
 * Metricas do MEDICO — fiel a V1 (fig 3 e 4).
 * Filtros de periodo + Pacientes + Consultas + Gestao de Alertas +
 * Evolucao da Saude (gauge) + Acoes Rapidas. Ligada ao motor onde faz sentido.
 */
import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { spacing, radius, font } from "../theme/tokens";
import { useSimulation } from "../store/simulation";
import { ScoreGauge } from "../components/ScoreGauge";

type Periodo = "7d" | "30d" | "3m" | "1a";

function Metric({ icon, valor, label, cor }: { icon: string; valor: string; label: string; cor?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.metric, { backgroundColor: colors.surfaceAlt }]}>
      <Ionicons name={icon as never} size={18} color={cor ?? colors.primary} />
      <Text style={[styles.metricValor, { color: cor ?? colors.primary }]}>{valor}</Text>
      <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

export function MedicoMetricas() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { ativo, data } = useSimulation();
  const [periodo, setPeriodo] = useState<Periodo>("7d");

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
      <Text style={[styles.titulo, { color: colors.primary }]}>Métricas</Text>
      <Text style={[styles.fonte, { color: colors.textMuted }]}>Fonte: backend{ativo ? " · simulado" : ""}</Text>

      {/* Filtros de periodo */}
      <View style={styles.periodos}>
        {(["7d", "30d", "3m", "1a"] as Periodo[]).map((p) => (
          <Pressable key={p} onPress={() => setPeriodo(p)} style={[styles.chip, { borderColor: colors.primary }, periodo === p && { backgroundColor: colors.primary }]}>
            <Text style={{ color: periodo === p ? colors.textOnPrimary : colors.primary, fontSize: font.size.sm, fontWeight: font.weight.semibold }}>{p}</Text>
          </Pressable>
        ))}
      </View>

      {/* Pacientes */}
      <View style={[styles.bloco, { backgroundColor: colors.surface }]}>
        <Text style={[styles.blocoTitulo, { color: colors.primary }]}>Pacientes</Text>
        <View style={styles.grid}>
          <Metric icon="people" valor={`${total}`} label="Total" />
          <Metric icon="person" valor={`${total - altoRisco}`} label="Ativos" />
          <Metric icon="warning" valor={`${altoRisco}`} label="Em Risco" cor={altoRisco > 0 ? colors.danger : colors.primary} />
          <Metric icon="sparkles" valor={`${total}`} label="Novos" />
        </View>
      </View>

      {/* Consultas e Agendamentos */}
      <View style={[styles.bloco, { backgroundColor: colors.surface }]}>
        <Text style={[styles.blocoTitulo, { color: colors.primary }]}>Consultas e Agendamentos</Text>
        <View style={styles.grid}>
          <Metric icon="checkmark-done" valor="9" label="Realizadas" />
          <Metric icon="calendar" valor="5" label="Agendadas" />
          <Metric icon="close-circle" valor="1" label="Cancelamentos" cor={colors.danger} />
          <Metric icon="time" valor="2.4d" label="Espera média" />
        </View>
      </View>

      {/* Gestao de Alertas */}
      <View style={[styles.bloco, { backgroundColor: colors.surface }]}>
        <Text style={[styles.blocoTitulo, { color: colors.primary }]}>Gestão de Alertas</Text>
        <View style={styles.grid}>
          <Metric icon="notifications" valor="2" label="Total" />
          <Metric icon="checkmark-circle" valor="2" label="Resolvidos" cor={colors.success} />
          <Metric icon="alert-circle" valor="0" label="Críticos" cor={colors.danger} />
          <Metric icon="time" valor="1.8h" label="Resp. média" />
        </View>
      </View>

      {/* Evolucao da Saude */}
      <View style={[styles.bloco, { backgroundColor: colors.surface }]}>
        <Text style={[styles.blocoTitulo, { color: colors.primary }]}>Evolução da Saúde</Text>
        <ScoreGauge score={scoreMedio} label="Score médio" />
        <View style={styles.legendas}>
          <View style={styles.legenda}><View style={[styles.dot, { backgroundColor: colors.success }]} /><Text style={[styles.legText, { color: colors.text }]}>Baixo {pct(baixo)}%</Text></View>
          <View style={styles.legenda}><View style={[styles.dot, { backgroundColor: colors.warning }]} /><Text style={[styles.legText, { color: colors.text }]}>Médio {pct(medio)}%</Text></View>
          <View style={styles.legenda}><View style={[styles.dot, { backgroundColor: colors.danger }]} /><Text style={[styles.legText, { color: colors.text }]}>Alto {pct(alto)}%</Text></View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg },
  titulo: { fontSize: font.size.xxl, fontWeight: font.weight.bold },
  fonte: { fontStyle: "italic", marginBottom: spacing.md, fontSize: font.size.sm },
  periodos: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  chip: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
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
});
