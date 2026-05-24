/**
 * Configuracoes do MEDICO — completa, fiel a V1.
 * Informacoes Profissionais + Notificacoes + Funcionalidades + Modo Simulado + Sair.
 * Switches persistem; itens sem efeito real marcados "em breve".
 */
import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../theme/ThemeProvider";
import { spacing, radius, font } from "../theme/tokens";
import { useAuth } from "../store/auth";
import { useSimulation } from "../store/simulation";

function usePersistedSwitch(key: string, inicial: boolean) {
  const [val, setVal] = useState(inicial);
  useEffect(() => { AsyncStorage.getItem(key).then((v) => { if (v !== null) setVal(v === "1"); }); }, []);
  const set = (v: boolean) => { setVal(v); AsyncStorage.setItem(key, v ? "1" : "0"); };
  return [val, set] as const;
}

function LinhaSwitch({ titulo, valor, onValor, emBreve }: { titulo: string; valor: boolean; onValor: (v: boolean) => void; emBreve?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.switchLinha}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 }}>
        <Text style={[styles.itemLabel, { color: colors.text }]}>{titulo}</Text>
        {emBreve && <Text style={[styles.emBreve, { color: colors.warning, borderColor: colors.warning }]}>em breve</Text>}
      </View>
      <Switch value={valor} onValueChange={onValor} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
    </View>
  );
}

export function MedicoConfig() {
  const { colors, isDark, toggleDark } = useTheme();
  const { logout, user } = useAuth();
  const { ativo, toggle } = useSimulation();
  const insets = useSafeAreaInsets();

  const [alertas, setAlertas] = usePersistedSwitch("@cp/med_alertas", true);
  const [notPac, setNotPac] = usePersistedSwitch("@cp/med_notpac", true);
  const [relat, setRelat] = usePersistedSwitch("@cp/med_relat", true);
  const [agenda, setAgenda] = usePersistedSwitch("@cp/med_agenda", false);
  const [tele, setTele] = usePersistedSwitch("@cp/med_tele", true);
  const [export_, setExport] = usePersistedSwitch("@cp/med_export", false);

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + spacing.xl }]}>
      <Text style={[styles.titulo, { color: colors.primary }]}>Configurações</Text>

      {/* Informacoes Profissionais */}
      <View style={[styles.bloco, { backgroundColor: colors.surface }]}>
        <View style={styles.headerLinha}><Ionicons name="person-circle-outline" size={20} color={colors.primary} /><Text style={[styles.blocoTitulo, { color: colors.primary }]}>Informações Profissionais</Text></View>
        <Text style={[styles.nome, { color: colors.text }]}>{user?.nome ?? "Dr."}</Text>
        <Text style={[styles.prof, { color: colors.textMuted }]}>{user?.especialidade ?? "Cardiologista"} | CRM {user?.crm ?? "—"}</Text>
        <Text style={[styles.prof, { color: colors.textMuted }]}>Hospital CarePlus - Unidade Paulista</Text>
        <Pressable style={styles.linkAcao}><Ionicons name="create-outline" size={16} color={colors.primary} /><Text style={[styles.linkText, { color: colors.primary }]}>Editar Informações</Text></Pressable>
      </View>

      {/* Aparencia + Modo Simulado */}
      <View style={[styles.bloco, { backgroundColor: colors.surface }]}>
        <View style={styles.headerLinha}><Ionicons name="color-palette-outline" size={18} color={colors.primary} /><Text style={[styles.blocoTitulo, { color: colors.primary }]}>Aparência</Text></View>
        <LinhaSwitch titulo="Modo Escuro" valor={isDark} onValor={toggleDark} />
        <View style={[styles.divisor, { borderTopColor: colors.border }]} />
        <LinhaSwitch titulo="Modo Simulado" valor={ativo} onValor={toggle} />
      </View>

      {/* Notificacoes */}
      <View style={[styles.bloco, { backgroundColor: colors.surface }]}>
        <View style={styles.headerLinha}><Ionicons name="notifications-outline" size={18} color={colors.primary} /><Text style={[styles.blocoTitulo, { color: colors.primary }]}>Notificações</Text></View>
        <LinhaSwitch titulo="Alertas críticos" valor={alertas} onValor={setAlertas} emBreve />
        <LinhaSwitch titulo="Notificações de pacientes" valor={notPac} onValor={setNotPac} emBreve />
        <LinhaSwitch titulo="Relatórios semanais" valor={relat} onValor={setRelat} emBreve />
      </View>

      {/* Funcionalidades */}
      <View style={[styles.bloco, { backgroundColor: colors.surface }]}>
        <View style={styles.headerLinha}><Ionicons name="construct-outline" size={18} color={colors.primary} /><Text style={[styles.blocoTitulo, { color: colors.primary }]}>Funcionalidades</Text></View>
        <LinhaSwitch titulo="Agendamento automático" valor={agenda} onValor={setAgenda} emBreve />
        <LinhaSwitch titulo="Telemedicina" valor={tele} onValor={setTele} emBreve />
        <LinhaSwitch titulo="Exportação de dados" valor={export_} onValor={setExport} emBreve />
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
  nome: { fontSize: font.size.lg, fontWeight: font.weight.bold },
  prof: { fontSize: font.size.sm, marginTop: 2 },
  itemLabel: { fontSize: font.size.md },
  segment: { flexDirection: "row", borderWidth: 1, borderRadius: radius.md, overflow: "hidden" },
  segmentItem: { flex: 1, paddingVertical: spacing.md, alignItems: "center" },
  divisor: { borderTopWidth: 1, marginVertical: spacing.md },
  switchLinha: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm },
  emBreve: { fontSize: 10, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 1, overflow: "hidden" },
  linkAcao: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingVertical: spacing.sm, marginTop: spacing.sm },
  linkText: { fontSize: font.size.md, fontWeight: font.weight.medium },
  botaoSair: { flexDirection: "row", gap: spacing.sm, borderRadius: radius.md, padding: spacing.md, alignItems: "center", justifyContent: "center" },
});
