/**
 * Configuracoes do PACIENTE — completa, fiel a V1.
 * Tema + Notificacoes + Integracoes + Modo Simulado + Acoes + Sair.
 * Switches persistem o estado (AsyncStorage). Itens sem efeito real no backend
 * sao marcados "em breve" (honesto — nada de enfeite).
 */
import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Switch, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../theme/ThemeProvider";
import { spacing, radius, font } from "../theme/tokens";
import { useAuth } from "../store/auth";
import { useSimulation } from "../store/simulation";

// Hook simples: switch que persiste no AsyncStorage.
function usePersistedSwitch(key: string, inicial: boolean) {
  const [val, setVal] = useState(inicial);
  useEffect(() => { AsyncStorage.getItem(key).then((v) => { if (v !== null) setVal(v === "1"); }); }, []);
  const set = (v: boolean) => { setVal(v); AsyncStorage.setItem(key, v ? "1" : "0"); };
  return [val, set] as const;
}

function LinhaSwitch({ titulo, sub, valor, onValor, emBreve }: { titulo: string; sub?: string; valor: boolean; onValor: (v: boolean) => void; emBreve?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.switchLinha}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <Text style={[styles.itemLabel, { color: colors.text }]}>{titulo}</Text>
          {emBreve && <Text style={[styles.emBreve, { color: colors.warning, borderColor: colors.warning }]}>em breve</Text>}
        </View>
        {sub ? <Text style={[styles.hint, { color: colors.textMuted }]}>{sub}</Text> : null}
      </View>
      <Switch value={valor} onValueChange={onValor} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
    </View>
  );
}

export function SettingsScreen() {
  const { colors, isDark, toggleDark } = useTheme();
  const { logout, user } = useAuth();
  const { ativo, toggle } = useSimulation();
  const insets = useSafeAreaInsets();

  const [push, setPush] = usePersistedSwitch("@cp/not_push", true);
  const [metas, setMetas] = usePersistedSwitch("@cp/not_metas", false);
  const [relatorios, setRelatorios] = usePersistedSwitch("@cp/not_relatorios", true);
  const [healthkit, setHealthkit] = usePersistedSwitch("@cp/int_healthkit", true);
  const [samsung, setSamsung] = usePersistedSwitch("@cp/int_samsung", false);

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + spacing.xl }]}>
      <Text style={[styles.titulo, { color: colors.primary }]}>Configurações</Text>

      {/* Aparencia */}
      <View style={[styles.bloco, { backgroundColor: colors.surface }]}>
        <View style={styles.headerLinha}><Ionicons name="color-palette-outline" size={18} color={colors.primary} /><Text style={[styles.blocoTitulo, { color: colors.primary }]}>Aparência</Text></View>
        <LinhaSwitch titulo="Modo Escuro" valor={isDark} onValor={toggleDark} />
        <View style={[styles.divisor, { borderTopColor: colors.border }]} />
        <LinhaSwitch titulo="Modo Simulado" sub={ativo ? "Dados de demonstração ao vivo (5s)" : "Usar dados reais do backend"} valor={ativo} onValor={toggle} />
      </View>

      {/* Notificacoes */}
      <View style={[styles.bloco, { backgroundColor: colors.surface }]}>
        <View style={styles.headerLinha}><Ionicons name="notifications-outline" size={18} color={colors.primary} /><Text style={[styles.blocoTitulo, { color: colors.primary }]}>Notificações</Text></View>
        <LinhaSwitch titulo="Notificações Push" valor={push} onValor={setPush} emBreve />
        <LinhaSwitch titulo="Lembretes de Metas" valor={metas} onValor={setMetas} emBreve />
        <LinhaSwitch titulo="Relatórios Semanais" valor={relatorios} onValor={setRelatorios} emBreve />
      </View>

      {/* Integracoes */}
      <View style={[styles.bloco, { backgroundColor: colors.surface }]}>
        <View style={styles.headerLinha}><Ionicons name="link-outline" size={18} color={colors.primary} /><Text style={[styles.blocoTitulo, { color: colors.primary }]}>Integrações</Text></View>
        <LinhaSwitch titulo="Apple HealthKit" valor={healthkit} onValor={setHealthkit} emBreve />
        <LinhaSwitch titulo="Samsung Health" valor={samsung} onValor={setSamsung} emBreve />
        <Pressable style={styles.linkAcao} onPress={() => Alert.alert("Adicionar Integração", "Funcionalidade em breve.")}><Ionicons name="add" size={18} color={colors.primary} /><Text style={[styles.linkText, { color: colors.primary }]}>Adicionar Integração</Text></Pressable>
      </View>

      {/* Conta */}
      <View style={[styles.bloco, { backgroundColor: colors.surface }]}>
        <View style={styles.headerLinha}><Ionicons name="person-outline" size={18} color={colors.primary} /><Text style={[styles.blocoTitulo, { color: colors.primary }]}>Conta</Text></View>
        <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>{user?.nome} · {user?.email}</Text>
      </View>

      <Pressable style={[styles.botaoSair, { backgroundColor: colors.danger }]} onPress={logout}>
        <Ionicons name="log-out-outline" size={18} color="#fff" />
        <Text style={{ color: "#fff", fontWeight: font.weight.semibold, fontSize: font.size.md }}>Sair da conta</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg },
  titulo: { fontSize: font.size.xxl, fontWeight: font.weight.bold, marginBottom: spacing.lg },
  bloco: { borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  headerLinha: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  blocoTitulo: { fontSize: font.size.lg, fontWeight: font.weight.semibold },
  itemLabel: { fontSize: font.size.md },
  hint: { fontSize: font.size.xs, marginTop: 2 },
  segment: { flexDirection: "row", borderWidth: 1, borderRadius: radius.md, overflow: "hidden" },
  segmentItem: { flex: 1, paddingVertical: spacing.md, alignItems: "center" },
  divisor: { borderTopWidth: 1, marginVertical: spacing.md },
  switchLinha: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm },
  emBreve: { fontSize: 10, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 1, overflow: "hidden" },
  linkAcao: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingVertical: spacing.md },
  linkText: { fontSize: font.size.md, fontWeight: font.weight.medium },
  botaoSair: { flexDirection: "row", gap: spacing.sm, borderRadius: radius.md, padding: spacing.md, alignItems: "center", justifyContent: "center" },
});
