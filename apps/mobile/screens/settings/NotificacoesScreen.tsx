import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, Switch, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, font, radius } from "../../theme/tokens";
import { GlassCard } from "../../components/GlassCard";

function usePersisted(key: string, def: boolean) {
  const [v, setV] = useState(def);
  useEffect(() => { AsyncStorage.getItem(key).then(x => { if (x !== null) setV(x === "1"); }); }, []);
  return [v, (n: boolean) => { setV(n); AsyncStorage.setItem(key, n ? "1" : "0"); }] as const;
}

export function NotificacoesScreen({ onVoltar }: { onVoltar: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [push, setPush] = usePersisted("@cp/not_push", true);
  const [metas, setMetas] = usePersisted("@cp/not_metas", false);
  const [rel, setRel] = usePersisted("@cp/not_relatorios", true);

  const linhas: Array<[string, string, boolean, (v: boolean) => void]> = [
    ["Notificações push", "Alertas e lembretes no celular", push, setPush],
    ["Metas diárias",     "Quando bate ou perde a meta",     metas, setMetas],
    ["Relatórios semanais","Resumo no domingo",              rel, setRel],
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
              ? (colors.fx ? colors.surfaceAlt : colors.surfaceAlt)
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
        Notificações
      </Text>

      <GlassCard style={{ padding: 0 }}>
        {linhas.map(([t, s, val, on], i) => (
          <View key={t} style={{
            flexDirection: "row", alignItems: "center", padding: spacing.md,
            borderBottomWidth: i < linhas.length - 1 ? 1 : 0, borderBottomColor: colors.border,
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: font.size.md }}>{t}</Text>
              <Text style={{ color: colors.textMuted, fontSize: font.size.xs, marginTop: 2 }}>{s}</Text>
            </View>
            <Switch value={val} onValueChange={on}
              trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
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
