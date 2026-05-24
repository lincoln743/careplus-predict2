/**
 * IA do Medico — interface de upload de documentos + pesquisa com curadoria.
 * O backend de RAG (item 10) ainda nao existe, entao a tela mostra a interface
 * pronta mas marcada honestamente como "em breve". Nao finge resultados.
 */
import React from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { spacing, radius, font } from "../theme/tokens";

export function MedicoIA() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + spacing.xl }]}>
      <Text style={[styles.titulo, { color: colors.primary }]}>IA do Médico</Text>
      <Text style={[styles.sub, { color: colors.textMuted }]}>Pesquisa em base de conhecimento com curadoria médica</Text>

      <View style={[styles.bloco, { backgroundColor: colors.surface }]}>
        <View style={[styles.badge, { backgroundColor: colors.warning + "22" }]}>
          <Ionicons name="construct" size={16} color={colors.warning} />
          <Text style={[styles.badgeText, { color: colors.warning }]}>Em breve</Text>
        </View>
        <Text style={[styles.texto, { color: colors.text }]}>
          Esta funcionalidade permitirá enviar documentos clínicos (PDFs, diretrizes,
          protocolos) e fazer perguntas à IA com base nesse material curado por você.
          A IA responderá citando as fontes, sem inventar informação.
        </Text>
      </View>

      <View style={[styles.bloco, { backgroundColor: colors.surface, opacity: 0.6 }]}>
        <Text style={[styles.blocoTitulo, { color: colors.text }]}>Documentos</Text>
        <View style={[styles.upload, { borderColor: colors.border }]}>
          <Ionicons name="cloud-upload-outline" size={32} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, fontSize: font.size.sm, marginTop: spacing.sm }}>Enviar documento (em breve)</Text>
        </View>
      </View>

      <Pressable style={[styles.botao, { backgroundColor: colors.surfaceAlt }]} disabled>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <Text style={{ color: colors.textMuted, fontWeight: font.weight.medium }}>Pesquisar (em breve)</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg },
  titulo: { fontSize: font.size.xxl, fontWeight: font.weight.bold },
  sub: { fontSize: font.size.sm, marginBottom: spacing.lg },
  bloco: { borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  blocoTitulo: { fontSize: font.size.lg, fontWeight: font.weight.semibold, marginBottom: spacing.md },
  badge: { flexDirection: "row", alignItems: "center", gap: spacing.xs, alignSelf: "flex-start", borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginBottom: spacing.md },
  badgeText: { fontSize: font.size.xs, fontWeight: font.weight.bold },
  texto: { fontSize: font.size.md, lineHeight: 22 },
  upload: { borderWidth: 2, borderStyle: "dashed", borderRadius: radius.md, padding: spacing.xl, alignItems: "center" },
  botao: { flexDirection: "row", gap: spacing.sm, borderRadius: radius.md, padding: spacing.md, alignItems: "center", justifyContent: "center" },
});
