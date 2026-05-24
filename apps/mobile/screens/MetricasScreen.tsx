/**
 * Metricas, ligada ao motor (interligada com Home e Meus Dados).
 * (Os graficos de barras/area entram no bloco 3.)
 */
import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { spacing, radius, font } from "../theme/tokens";
import { ScoreGauge } from "../components/ScoreGauge";
import { useSimulation } from "../store/simulation";
import { BarChart } from "../components/BarChart";
import { AreaChart } from "../components/AreaChart";

function Card({ icon, valor, label }: { icon: React.ReactNode; valor: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceAlt }]}>
      <View style={styles.icon}>{icon}</View>
      <Text style={[styles.valor, { color: colors.primary }]}>{valor}</Text>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

export function MetricasScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { ativo, data } = useSimulation();

  const fc = ativo ? data.fcMedia : 71;
  const media = ativo ? data.mediaDiaria : 7203;
  const sono = ativo ? data.sonoHoje : 7.3;
  const progresso = ativo ? data.progresso : 90;
  const total = ativo ? data.totalSemanal : 28812;
  const semana = ativo ? data.semana : [
    { dia: "Seg", data: "—", passos: 7200, sono: 7.2 },
    { dia: "Ter", data: "—", passos: 6800, sono: 7.0 },
    { dia: "Qua", data: "—", passos: 5400, sono: 6.9 },
    { dia: "Qui", data: "—", passos: 9412, sono: 7.5 },
  ];

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + spacing.xl }]}>
      <Text style={[styles.titulo, { color: colors.primary }]}>Métricas de Saúde</Text>
      <Text style={[styles.fonte, { color: colors.textMuted }]}>Fonte: backend{ativo ? " · simulado" : ""}</Text>

      <View style={[styles.bloco, { backgroundColor: colors.surface }]}>
        <Text style={[styles.blocoTitulo, { color: colors.text }]}>Resumo de Saúde</Text>
        <View style={styles.grid}>
          <Card icon={<Ionicons name="heart" size={24} color={colors.heart} />} valor={`${fc}`} label="FC Média" />
          <Card icon={<FontAwesome5 name="shoe-prints" size={20} color={colors.primary} />} valor={media.toLocaleString("pt-BR")} label="Passos/Dia" />
          <Card icon={<Ionicons name="moon" size={22} color={colors.primary} />} valor={`${sono}h`} label="Sono/Dia" />
          <Card icon={<Ionicons name="trending-up" size={22} color={colors.success} />} valor={`${progresso}%`} label="Progresso" />
        </View>
      </View>

      <View style={[styles.bloco, { backgroundColor: colors.surface }]}>
        <BarChart
          titulo="Atividade Física - Última Semana"
          valores={semana.map((d) => d.passos)}
          labels={semana.map((d) => d.dia)}
        />
        <View style={styles.totais}>
          <View style={{ alignItems: "center", flex: 1 }}>
            <Text style={[styles.totalValor, { color: colors.primary }]}>{total.toLocaleString("pt-BR")}</Text>
            <Text style={[styles.totalLabel, { color: colors.textMuted }]}>Total de Passos</Text>
          </View>
          <View style={{ alignItems: "center", flex: 1 }}>
            <Text style={[styles.totalValor, { color: colors.primary }]}>{media.toLocaleString("pt-BR")}</Text>
            <Text style={[styles.totalLabel, { color: colors.textMuted }]}>Média Diária</Text>
          </View>
        </View>
      </View>

      <View style={[styles.bloco, { backgroundColor: colors.surface }]}>
        <AreaChart
          titulo="Padrão de Sono - Última Semana"
          valores={semana.map((d) => d.sono)}
          labels={semana.map((d) => d.dia)}
          formatY={(v) => v.toFixed(1)}
        />
      </View>

      <View style={[styles.bloco, { backgroundColor: colors.surface }]}>
        <Text style={[styles.blocoTitulo, { color: colors.text }]}>Progresso Semanal</Text>
        <ScoreGauge score={progresso} label={`${progresso}% da meta`} />
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
  card: { flexBasis: "47%", flexGrow: 1, borderRadius: radius.md, padding: spacing.lg, alignItems: "center" },
  icon: { height: 28, justifyContent: "center", marginBottom: spacing.sm },
  valor: { fontSize: font.size.xl, fontWeight: font.weight.bold },
  label: { fontSize: font.size.xs, marginTop: 4 },
  totais: { flexDirection: "row", marginTop: 8 },
  totalValor: { fontSize: font.size.lg, fontWeight: font.weight.bold },
  totalLabel: { fontSize: font.size.xs, marginTop: 2 },
});
