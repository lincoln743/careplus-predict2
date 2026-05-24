/**
 * Meus Dados, ligada ao motor. Com simulado ON, os dados pulsam a cada 5s,
 * interligados com a Home (mesma fonte). Mostra estatisticas + dados diarios.
 * (O grafico de passos semanais entra no bloco 3 — graficos animados.)
 */
import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { spacing, radius, font } from "../theme/tokens";
import { useSimulation, type DiaPassos } from "../store/simulation";
import { AreaChart } from "../components/AreaChart";
import { AnamneseModal } from "../components/AnamneseModal";
import { buscarMinhaSerie } from "../api/client";

function Stat({ valor, label }: { valor: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: colors.surfaceAlt }]}>
      <Text style={[styles.statValor, { color: colors.primary }]}>{valor}</Text>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

// Dados estaticos (modo real) usados quando simulado esta OFF.
const SEMANA_REAL = [
  { dia: "Sex", data: "—", passos: 7200, sono: 7.2 },
  { dia: "Qui", data: "—", passos: 6800, sono: 7.0 },
  { dia: "Qua", data: "—", passos: 5400, sono: 6.9 },
  { dia: "Ter", data: "—", passos: 9412, sono: 7.5 },
];

export function MeusDadosScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { ativo, data } = useSimulation();
  const [anamneseAberta, setAnamneseAberta] = useState(false);

  const [serieBackend, setSerieBackend] = useState<DiaPassos[] | null>(null);
  const [carregandoSerie, setCarregandoSerie] = useState(false);

  // Modo simulado OFF: busca o historico real do backend (/health/me/series).
  useEffect(() => {
    if (ativo) return; // modo ON usa o motor local
    setCarregandoSerie(true);
    buscarMinhaSerie("7d")
      .then((s) => {
        const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
        const convertido: DiaPassos[] = s.pontos.map((p) => {
          const d = new Date(p.data + "T00:00:00");
          return {
            dia: dias[d.getDay()],
            data: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
            passos: p.passos,
            sono: p.sono_horas,
          };
        });
        setSerieBackend(convertido);
      })
      .catch(() => setSerieBackend(null))
      .finally(() => setCarregandoSerie(false));
  }, [ativo]);

  // Fonte dos dados: ON = motor local; OFF = backend (se carregou) ou fallback estatico.
  const semana = ativo ? data.semana : (serieBackend ?? SEMANA_REAL);
  const passosArr = semana.map((d) => d.passos);
  const media = ativo ? data.mediaDiaria : (passosArr.length ? Math.round(passosArr.reduce((a, b) => a + b, 0) / passosArr.length) : 7203);
  const max = ativo ? data.maximo : (passosArr.length ? Math.max(...passosArr) : 9412);
  const min = ativo ? data.minimo : (passosArr.length ? Math.min(...passosArr) : 5400);
  const total = ativo ? data.totalSemanal : (passosArr.reduce((a, b) => a + b, 0) || 28812);

  return (
    <>
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + spacing.xl }]}>
      <Text style={[styles.titulo, { color: colors.primary }]}>Meus Dados de Saúde</Text>
      <Text style={[styles.fonte, { color: colors.textMuted }]}>
        Fonte: {ativo ? "motor de simulação · ao vivo" : carregandoSerie ? "carregando do backend..." : serieBackend ? "backend · histórico" : "backend"}
      </Text>

      <Pressable onPress={() => setAnamneseAberta(true)} style={[styles.btnAnamnese, { backgroundColor: colors.primary }]}>
        <Ionicons name="clipboard-outline" size={18} color="#fff" />
        <Text style={styles.btnAnamneseTexto}>Preencher anamnese</Text>
        <Ionicons name="chevron-forward" size={18} color="#fff" style={{ marginLeft: "auto" }} />
      </Pressable>

      <View style={[styles.bloco, { backgroundColor: colors.surface }]}>
        <Text style={[styles.blocoTitulo, { color: colors.text }]}>Estatísticas da Semana</Text>
        <View style={styles.grid}>
          <Stat valor={media.toLocaleString("pt-BR")} label="Média Diária" />
          <Stat valor={max.toLocaleString("pt-BR")} label="Máximo" />
          <Stat valor={min.toLocaleString("pt-BR")} label="Mínimo" />
          <Stat valor={total.toLocaleString("pt-BR")} label="Total Semanal" />
        </View>
      </View>

      <View style={[styles.bloco, { backgroundColor: colors.surface }]}>
        <Text style={[styles.blocoTitulo, { color: colors.text }]}>Dados Diários</Text>
        {semana.slice(-4).reverse().map((d, i, arr) => (
          <View key={i} style={[styles.diaLinha, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.diaNome, { color: colors.text }]}>{d.dia}</Text>
              <Text style={[styles.diaData, { color: colors.textMuted }]}>{d.data}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[styles.diaPassos, { color: colors.primary }]}>{d.passos.toLocaleString("pt-BR")}</Text>
              <Text style={[styles.diaData, { color: colors.textMuted }]}>passos</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={[styles.bloco, { backgroundColor: colors.surface }]}>
        <AreaChart
          titulo="Passos Semanais"
          valores={semana.map((d) => d.passos)}
          labels={semana.map((d) => d.dia)}
        />
      </View>

      <View style={[styles.bloco, { backgroundColor: colors.surface }]}>
        <Text style={[styles.blocoTitulo, { color: colors.text }]}>Recomendações</Text>
        <View style={styles.rec}><Ionicons name="walk" size={18} color={colors.primary} /><Text style={[styles.recT, { color: colors.text }]}>Tente alcançar 10.000 passos diários</Text></View>
        <View style={styles.rec}><Ionicons name="stats-chart" size={18} color={colors.primary} /><Text style={[styles.recT, { color: colors.text }]}>Sua média: {media.toLocaleString("pt-BR")} passos</Text></View>
        <View style={styles.rec}><Ionicons name="barbell" size={18} color={colors.success} /><Text style={[styles.recT, { color: colors.text }]}>Você está no caminho certo!</Text></View>
      </View>
    </ScrollView>
    <AnamneseModal visivel={anamneseAberta} aoFechar={() => setAnamneseAberta(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg },
  titulo: { fontSize: font.size.xxl, fontWeight: font.weight.bold },
  fonte: { fontStyle: "italic", marginBottom: spacing.md, fontSize: font.size.sm },
  btnAnamnese: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.lg },
  btnAnamneseTexto: { color: "#fff", fontSize: font.size.md, fontWeight: font.weight.semibold },
  bloco: { borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  blocoTitulo: { fontSize: font.size.lg, fontWeight: font.weight.semibold, marginBottom: spacing.md },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  stat: { flexBasis: "47%", flexGrow: 1, borderRadius: radius.md, padding: spacing.lg, alignItems: "center" },
  statValor: { fontSize: font.size.xl, fontWeight: font.weight.bold },
  statLabel: { fontSize: font.size.xs, marginTop: 4 },
  diaLinha: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.md },
  diaNome: { fontSize: font.size.md, fontWeight: font.weight.semibold },
  diaData: { fontSize: font.size.xs },
  diaPassos: { fontSize: font.size.lg, fontWeight: font.weight.bold },
  rec: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm },
  recT: { fontSize: font.size.md, flex: 1 },
});
