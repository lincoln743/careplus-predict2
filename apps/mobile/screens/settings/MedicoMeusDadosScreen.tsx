/**
 * Meus Dados (medico) - perfil profissional, CRM, especialidade.
 * Tela navegada pelo MedicoConfig com botao Voltar pill.
 */
import React from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { useAuth } from "../../store/auth";
import { spacing, font, radius } from "../../theme/tokens";
import { GlassCard } from "../../components/GlassCard";

export function MedicoMeusDadosScreen({ onVoltar }: { onVoltar: () => void }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const campos: Array<[string, string]> = [
    ["Nome",          user?.nome ?? "—"],
    ["E-mail",        user?.email ?? "—"],
    ["CRM",           (user as any)?.crm ?? "—"],
    ["Especialidade", (user as any)?.especialidade ?? "—"],
    ["Perfil",        user?.role === "ADMIN" ? "Administrador" : "Médico"],
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        padding: spacing.md,
        paddingTop: insets.top + spacing.sm,
        paddingBottom: insets.bottom + spacing.xl,
      }}
    >
      <Pressable
        onPress={onVoltar}
        style={({ pressed }) => [styles.btnVoltar, {
          backgroundColor: pressed
            ? colors.surfaceAlt
            : (colors.fx ? colors.surface : `${colors.primary}14`),
          borderColor: colors.fx ? colors.cardBorder : `${colors.primary}33`,
        }]}
        hitSlop={8}
      >
        <Ionicons name="arrow-back" size={22} color={colors.primary} />
        <Text style={{ color: colors.primary, marginLeft: 8, fontSize: font.size.md, fontWeight: "600" }}>
          Voltar
        </Text>
      </Pressable>

      <Text style={{ fontSize: 26, fontWeight: "700", color: colors.text, marginVertical: spacing.md }}>
        Meus Dados
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: font.size.sm, marginBottom: spacing.md, lineHeight: 20 }}>
        Informações profissionais cadastradas. Para alterações, entre em contato com o suporte.
      </Text>

      <GlassCard style={{ padding: spacing.lg }}>
        {campos.map(([k, v], i) => (
          <View key={k} style={{
            paddingVertical: spacing.sm,
            borderBottomWidth: i < campos.length - 1 ? 1 : 0,
            borderBottomColor: colors.border,
          }}>
            <Text style={{ color: colors.textMuted, fontSize: font.size.xs, textTransform: "uppercase", letterSpacing: 0.8 }}>
              {k}
            </Text>
            <Text style={{ color: colors.text, fontSize: font.size.md, marginTop: 4 }}>{v}</Text>
          </View>
        ))}
      </GlassCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  btnVoltar: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
});
