import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, Alert, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, font, radius } from "../../theme/tokens";
import { GlassCard } from "../../components/GlassCard";
import { ConectarSamsungHealth } from "../ConectarSamsungHealth";

export function PrivacidadeScreen({ onVoltar }: { onVoltar: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [mostrarSamsung, setMostrarSamsung] = useState(false);

  if (mostrarSamsung) return <ConectarSamsungHealth onVoltar={() => setMostrarSamsung(false)} />;

  const itens: Array<{ icon: any; t: string; s: string; onPress: () => void }> = [
    { icon: "watch", t: "Conectar Samsung Health", s: "Autorizar leitura de passos, FC e sono",
      onPress: () => setMostrarSamsung(true) },
    { icon: "download-outline", t: "Exportar meus dados", s: "Receba uma cópia em JSON",
      onPress: () => Alert.alert("Em breve", "Exportação de dados estará disponível em breve.") },
    { icon: "document-text", t: "Termos e consentimento", s: "Última aceitação: durante cadastro",
      onPress: () => Alert.alert("Termos", "Consulte os termos completos no site CarePlus.") },
    { icon: "trash-outline", t: "Excluir minha conta", s: "Ação permanente",
      onPress: () => Alert.alert("Excluir conta", "Para excluir sua conta, entre em contato com suporte@careplus.com.br") },
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
        style={({ pressed }) => [
          styles.btnVoltar,
          {
            backgroundColor: pressed
              ? colors.surfaceAlt
              : (colors.fx ? colors.surface : `${colors.primary}14`),
            borderColor: colors.fx ? colors.cardBorder : `${colors.primary}33`,
          },
        ]}
        hitSlop={8}
      >
        <Ionicons name="arrow-back" size={22} color={colors.primary} />
        <Text style={{ color: colors.primary, marginLeft: 8, fontSize: font.size.md, fontWeight: "600" }}>
          Voltar
        </Text>
      </Pressable>

      <Text style={{ fontSize: 26, fontWeight: "700", color: colors.text, marginVertical: spacing.md }}>
        Privacidade & Consentimento
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: font.size.sm, marginBottom: spacing.md, lineHeight: 20 }}>
        Controle seus dados de saúde e consentimentos da LGPD. Você pode revogar qualquer autorização a qualquer momento.
      </Text>

      <GlassCard style={{ padding: 0 }}>
        {itens.map((it, i) => (
          <Pressable key={it.t} onPress={it.onPress} style={{
            flexDirection: "row", alignItems: "center", padding: spacing.md,
            borderBottomWidth: i < itens.length - 1 ? 1 : 0, borderBottomColor: colors.border,
          }}>
            <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center",
              backgroundColor: colors.fx ? colors.surfaceAlt : `${colors.primary}1A` }}>
              <Ionicons name={it.icon} size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={{ color: colors.text, fontSize: font.size.md }}>{it.t}</Text>
              <Text style={{ color: colors.textMuted, fontSize: font.size.xs, marginTop: 2 }}>{it.s}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
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
