/**
 * Lista de pacientes do medico, com filtros e 3 pacientes AO VIVO (5s).
 * Tocar num card abre um MODAL com o detalhe do paciente (gauge + metricas).
 */
import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { spacing, radius, font } from "../theme/tokens";
import { useSimulation, type PacienteSim } from "../store/simulation";
import { LiveValue } from "../components/LiveValue";
import { ScoreGauge } from "../components/ScoreGauge";

type Filtro = "todos" | "alto_risco" | "com_alertas" | "acompanhamento" | "inativo";

const FILTROS: { id: Filtro; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "alto_risco", label: "Alto risco" },
  { id: "com_alertas", label: "Com alertas" },
  { id: "acompanhamento", label: "Acompanhamento" },
  { id: "inativo", label: "Inativo" },
];

const STATUS_LABEL: Record<string, string> = {
  acompanhamento: "Em acompanhamento",
  alto_risco: "Alto risco",
  com_alertas: "Com alertas",
  inativo: "Inativo",
};

function PacienteCard({ p, onPress }: { p: PacienteSim; onPress: () => void }) {
  const { colors } = useTheme();
  const scoreCor = p.score >= 70 ? colors.success : p.score >= 50 ? colors.warning : colors.danger;
  return (
    <Pressable style={[styles.card, { backgroundColor: colors.surface }]} onPress={onPress}>
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
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={{ marginLeft: 4 }} />
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
    </Pressable>
  );
}

function DetalheModal({ p, onClose }: { p: PacienteSim | null; onClose: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  if (!p) return null;
  return (
    <Modal visible={!!p} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.background, paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitulo, { color: colors.primary }]}>{p.nome}</Text>
            <Pressable onPress={onClose} hitSlop={12}><Ionicons name="close" size={26} color={colors.textMuted} /></Pressable>
          </View>
          <Text style={[styles.modalSub, { color: colors.textMuted }]}>{p.idade} anos · {STATUS_LABEL[p.status]}</Text>

          <ScoreGauge score={p.score} label={p.score >= 70 ? "Estável" : p.score >= 50 ? "Atenção" : "Risco"} />

          <View style={styles.detGrid}>
            <View style={[styles.detCard, { backgroundColor: colors.surface }]}>
              <Ionicons name="walk" size={22} color={colors.primary} />
              <LiveValue value={p.passos} style={[styles.detVal, { color: colors.primary }]}>{p.passos.toLocaleString("pt-BR")}</LiveValue>
              <Text style={[styles.detLabel, { color: colors.textMuted }]}>Passos hoje</Text>
            </View>
            <View style={[styles.detCard, { backgroundColor: colors.surface }]}>
              <Ionicons name="moon" size={22} color={colors.primary} />
              <LiveValue value={p.sono} style={[styles.detVal, { color: colors.primary }]}>{p.sono}h</LiveValue>
              <Text style={[styles.detLabel, { color: colors.textMuted }]}>Sono</Text>
            </View>
            <View style={[styles.detCard, { backgroundColor: colors.surface }]}>
              <Ionicons name="heart" size={22} color={colors.heart} />
              <LiveValue value={p.fc} style={[styles.detVal, { color: colors.heart }]}>{p.fc} bpm</LiveValue>
              <Text style={[styles.detLabel, { color: colors.textMuted }]}>Freq. cardíaca</Text>
            </View>
            <View style={[styles.detCard, { backgroundColor: colors.surface }]}>
              <Ionicons name="pulse" size={22} color={colors.success} />
              <LiveValue value={p.score} style={[styles.detVal, { color: colors.success }]}>{p.score}</LiveValue>
              <Text style={[styles.detLabel, { color: colors.textMuted }]}>Score saúde</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function MedicoPacientes() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { ativo, data } = useSimulation();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [selecionado, setSelecionado] = useState<PacienteSim | null>(null);

  const pacientes = ativo ? data.pacientes : [];
  const filtrados = filtro === "todos" ? pacientes : pacientes.filter((p) => p.status === filtro);
  // Mantem o paciente selecionado atualizado com os dados ao vivo.
  const selAtual = selecionado ? pacientes.find((p) => p.id === selecionado.id) ?? selecionado : null;

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
        {!ativo && <Text style={[styles.aviso, { color: colors.textMuted }]}>Ative o Modo Simulado nas Configurações para ver pacientes ao vivo.</Text>}
        {ativo && filtrados.length === 0 && <Text style={[styles.aviso, { color: colors.textMuted }]}>Nenhum paciente neste filtro.</Text>}
        {filtrados.map((p) => <PacienteCard key={p.id} p={p} onPress={() => setSelecionado(p)} />)}
      </ScrollView>

      <DetalheModal p={selAtual} onClose={() => setSelecionado(null)} />
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
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalCard: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: "88%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitulo: { fontSize: font.size.xl, fontWeight: font.weight.bold },
  modalSub: { fontSize: font.size.sm, marginBottom: spacing.md },
  detGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.md },
  detCard: { flexBasis: "47%", flexGrow: 1, borderRadius: radius.md, padding: spacing.lg, alignItems: "center" },
  detVal: { fontSize: font.size.xl, fontWeight: font.weight.bold, marginTop: spacing.sm },
  detLabel: { fontSize: font.size.xs, marginTop: 2 },
});
