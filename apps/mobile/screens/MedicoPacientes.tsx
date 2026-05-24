/**
 * Lista de pacientes do medico, com filtros no topo e 3 pacientes AO VIVO
 * (score/passos/sono/FC pulsam a cada 5s via motor). Fiel a V1.
 */
import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { spacing, radius, font } from "../theme/tokens";
import { useSimulation, type PacienteSim } from "../store/simulation";
import { LiveValue } from "../components/LiveValue";

type Filtro = "todos" | "alto_risco" | "com_alertas" | "acompanhamento" | "inativo";

const FILTROS: { id: Filtro; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "alto_risco", label: "Alto risco" },
  { id: "com_alertas", label: "Com alertas" },
  { id: "acompanhamento", label: "Acompanhamento" },
  { id: "inativo", label: "Inativo" },
];

function PacienteCard({ p }: { p: PacienteSim }) {
  const { colors } = useTheme();
  const scoreCor = p.score >= 70 ? colors.success : p.score >= 50 ? colors.warning : colors.danger;
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, { backgroundColor: colors.surfaceAlt }]}>
          <Text style={{ color: colors.primary, fontWeight: font.weight.bold }}>{p.nome.charAt(0)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.nome, { color: colors.text }]}>{p.nome}</Text>
          <Text style={[styles.idade, { color: colors.textMuted }]}>{p.idade} anos</Text>
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: scoreCor }]}>
          <LiveValue value={p.score} style={styles.scoreBadgeText}>{p.score}</LiveValue>
        </View>
      </View>
      <View style={styles.metricasLinha}>
        <View style={styles.metricaItem}>
          <Ionicons name="walk" size={16} color={colors.primary} />
          <LiveValue value={p.passos} style={[styles.metricaVal, { color: colors.text }]}>{p.passos.toLocaleString("pt-BR")}</LiveValue>
        </View>
        <View style={styles.metricaItem}>
          <Ionicons name="moon" size={16} color={colors.primary} />
          <LiveValue value={p.sono} style={[styles.metricaVal, { color: colors.text }]}>{p.sono}h</LiveValue>
        </View>
        <View style={styles.metricaItem}>
          <Ionicons name="heart" size={16} color={colors.heart} />
          <LiveValue value={p.fc} style={[styles.metricaVal, { color: colors.text }]}>{p.fc} bpm</LiveValue>
        </View>
      </View>
    </View>
  );
}

export function MedicoPacientes() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { ativo, data } = useSimulation();
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const pacientes = ativo ? data.pacientes : [];
  const filtrados = filtro === "todos"
    ? pacientes
    : pacientes.filter((p) => p.status === filtro);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: spacing.md }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtros}>
          {FILTROS.map((f) => (
            <Pressable key={f.id} onPress={() => setFiltro(f.id)} style={[styles.chip, { borderColor: colors.primary }, filtro === f.id && { backgroundColor: colors.primary }]}>
              <Text style={{ color: filtro === f.id ? colors.textOnPrimary : colors.primary, fontSize: font.size.sm, fontWeight: font.weight.medium }}>{f.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={[styles.lista, { paddingBottom: insets.bottom + spacing.xl }]}>
        {!ativo && (
          <Text style={[styles.aviso, { color: colors.textMuted }]}>
            Ative o Modo Simulado nas Configurações para ver pacientes ao vivo.
          </Text>
        )}
        {ativo && filtrados.length === 0 && (
          <Text style={[styles.aviso, { color: colors.textMuted }]}>Nenhum paciente neste filtro.</Text>
        )}
        {filtrados.map((p) => <PacienteCard key={p.id} p={p} />)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  filtros: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  chip: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  lista: { padding: spacing.lg, gap: spacing.md },
  aviso: { textAlign: "center", marginTop: spacing.xl, paddingHorizontal: spacing.lg, fontSize: font.size.sm },
  card: { borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  nome: { fontSize: font.size.md, fontWeight: font.weight.semibold },
  idade: { fontSize: font.size.xs },
  scoreBadge: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  scoreBadgeText: { color: "#fff", fontWeight: font.weight.bold, fontSize: font.size.md },
  metricasLinha: { flexDirection: "row", justifyContent: "space-around", borderTopWidth: 1, borderTopColor: "rgba(127,127,127,0.15)", paddingTop: spacing.md },
  metricaItem: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  metricaVal: { fontSize: font.size.sm, fontWeight: font.weight.medium },
});
