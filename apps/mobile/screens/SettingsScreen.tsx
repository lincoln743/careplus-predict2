/**
 * Config (paciente) - hub com 3 chips de tema + 4 cards + footer.
 * Cards: Meus Dados, Notificacoes, Privacidade & Consentimento, Sobre.
 */
import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, type ThemeName } from "../theme/ThemeProvider";
import { spacing, radius, font } from "../theme/tokens";
import { GlassCard } from "../components/GlassCard";
import { MeusDadosWrap } from "./settings/MeusDadosWrap";
import { NotificacoesScreen } from "./settings/NotificacoesScreen";
import { PrivacidadeScreen } from "./settings/PrivacidadeScreen";
import { SobreWrap } from "./settings/SobreWrap";
import { useAuth } from "../store/auth";
import { useSimulation } from "../store/simulation";

type Sub = null | "meusdados" | "notificacoes" | "privacidade" | "sobre";

const TEMAS: Array<{ id: ThemeName; label: string; icon: any }> = [
  { id: "escuro",    label: "Escuro",    icon: "moon" },
  { id: "claro",     label: "Claro",     icon: "sunny" },
  { id: "futurista", label: "Futurista", icon: "planet" },
];

export function SettingsScreen() {
  const { colors, theme, setTheme } = useTheme();
  const { logout } = useAuth();
  const { ativo: simAtivo, toggle: simToggle } = useSimulation();
  const insets = useSafeAreaInsets();
  const [sub, setSub] = useState<Sub>(null);

  if (sub === "meusdados")    return <MeusDadosWrap onVoltar={() => setSub(null)} />;
  if (sub === "notificacoes") return <NotificacoesScreen onVoltar={() => setSub(null)} />;
  if (sub === "privacidade")  return <PrivacidadeScreen onVoltar={() => setSub(null)} />;
  if (sub === "sobre")        return <SobreWrap onVoltar={() => setSub(null)} />;

  const itens: Array<{ id: Exclude<Sub, null>; label: string; icon: any; sub: string }> = [
    { id: "meusdados",    icon: "person-circle",      label: "Meus Dados",                    sub: "Perfil, anamnese e estatisticas" },
    { id: "notificacoes", icon: "notifications",      label: "Notificações",                  sub: "Push, metas, relatórios" },
    { id: "privacidade",  icon: "lock-closed",        label: "Privacidade & Consentimento",   sub: "LGPD, Samsung Health, exportar" },
    { id: "sobre",        icon: "information-circle", label: "Sobre o CarePlus Predict",      sub: "Versão, equipe, suporte" },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        padding: spacing.md,
        paddingTop: insets.top + spacing.md,
        paddingBottom: insets.bottom + spacing.xl,
      }}
    >
      <Text style={[styles.tituloPagina, { color: colors.primary }]}>Config</Text>

      <GlassCard style={styles.card}>
        <Text style={[styles.bloqueTitulo, { color: colors.text }]}>Aparência</Text>
        <View style={styles.tabsRow}>
          {TEMAS.map((t) => {
            const on = theme === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => setTheme(t.id)}
                style={[styles.temaBtn, {
                  backgroundColor: on ? colors.surfaceAlt : "transparent",
                  borderColor: on ? colors.primary : (colors.cardBorder ?? colors.border),
                  shadowColor: on && colors.fx ? colors.glowColor : "transparent",
                  shadowOpacity: on && colors.fx ? 0.6 : 0,
                  shadowRadius: on && colors.fx ? 12 : 0,
                  shadowOffset: { width: 0, height: 0 },
                  elevation: on && colors.fx ? 6 : 0,
                }]}
              >
                <Ionicons name={t.icon} size={22} color={on ? colors.primary : colors.textMuted} />
                <Text style={{ fontSize: font.size.xs, fontWeight: "600", color: on ? colors.text : colors.textMuted, marginTop: 6 }}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={{ color: colors.textMuted, fontSize: font.size.xs, marginTop: spacing.md, lineHeight: 18 }}>
          {theme === "futurista"
            ? "Tema neon experimental — vidro, grade HUD e brilho."
            : "Escolha a aparência do app. Futurista traz visual neon/HUD."}
        </Text>
      </GlassCard>

      <GlassCard style={styles.card}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.bloqueTitulo, { color: colors.text, marginBottom: 4 }]}>Modo Demo</Text>
            <Text style={{ color: colors.textMuted, fontSize: font.size.xs, lineHeight: 18 }}>
              Dados simulados pulsando em tempo real (5s). Quando desligado, usa dados reais do backend.
            </Text>
          </View>
          <Switch
            value={simAtivo}
            onValueChange={simToggle}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#fff"
          />
        </View>
      </GlassCard>

      <GlassCard style={{ ...styles.card, padding: 0 }}>
        {itens.map((it, i) => (
          <Pressable
            key={it.id}
            onPress={() => setSub(it.id)}
            style={[styles.linha, i < itens.length - 1 ? { borderBottomWidth: 1, borderBottomColor: colors.border } : null]}
          >
            <View style={[styles.icoBg, { backgroundColor: colors.fx ? colors.surfaceAlt : `${colors.primary}1A` }]}>
              <Ionicons name={it.icon} size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={{ fontSize: font.size.md, color: colors.text }}>{it.label}</Text>
              <Text style={{ fontSize: font.size.xs, color: colors.textMuted, marginTop: 2 }}>{it.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        ))}
      </GlassCard>

      <Pressable
        onPress={() => logout()}
        style={({ pressed }) => [styles.sairBtn, {
          backgroundColor: pressed ? `${colors.danger}22` : "transparent",
          borderColor: colors.danger,
        }]}
        hitSlop={8}
      >
        <Ionicons name="log-out-outline" size={20} color={colors.danger} />
        <Text style={{ color: colors.danger, fontSize: font.size.md, fontWeight: "600", marginLeft: 8 }}>
          Sair
        </Text>
      </Pressable>

      <Text style={[styles.footer, { color: colors.textMuted }]}>
        CarePlus Predict · Part of Bupa · v2.0
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tituloPagina: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5, marginBottom: spacing.md, marginTop: spacing.md },
  card: { padding: spacing.lg, marginBottom: spacing.md },
  bloqueTitulo: { fontSize: font.size.lg, fontWeight: "600", marginBottom: spacing.md },
  tabsRow: { flexDirection: "row", gap: spacing.sm },
  temaBtn: { flex: 1, alignItems: "center", paddingVertical: 16, paddingHorizontal: 8, borderRadius: radius.lg, borderWidth: 1.5 },
  linha: { flexDirection: "row", alignItems: "center", padding: spacing.md },
  icoBg: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  footer: { textAlign: "center", fontSize: font.size.xs, marginTop: spacing.md },
  sairBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    marginTop: spacing.lg,
  },
});
