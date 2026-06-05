/**
 * Wrapper que adapta SobreScreen como sub-tela navegada pelo Config.
 */
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing, radius, font } from "../../theme/tokens";
import { SobreScreen } from "../SobreScreen";

export function SobreWrap({ onVoltar }: { onVoltar: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{
        paddingTop: insets.top + spacing.sm,
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.sm,
        backgroundColor: colors.background,
        zIndex: 10,
      }}>
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
      </View>
      <View style={{ flex: 1 }}>
        <SobreScreen />
      </View>
    </View>
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
