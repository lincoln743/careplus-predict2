/**
 * Tela de login. Seletor Paciente/Medico. Credenciais PRE-PREENCHIDAS por perfil
 * (facilita demo). Respeita safe area (notch). Tipografia delicada estilo iOS.
 */
import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { spacing, radius, font } from "../theme/tokens";
import { useAuth } from "../store/auth";

// Credenciais de demo pre-preenchidas por perfil.
const DEMO = {
  paciente: { email: "paciente@careplus.com", senha: "senha123" },
  medico: { email: "medico@careplus.com", senha: "senha123" },
};

export function LoginScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { login, carregando, erro } = useAuth();
  const [perfil, setPerfil] = useState<"paciente" | "medico">("paciente");
  const [email, setEmail] = useState(DEMO.paciente.email);
  const [senha, setSenha] = useState(DEMO.paciente.senha);

  // Ao trocar de perfil, pre-preenche as credenciais correspondentes.
  useEffect(() => {
    setEmail(DEMO[perfil].email);
    setSenha(DEMO[perfil].senha);
  }, [perfil]);

  async function entrar() {
    try { await login(email.trim(), senha); } catch { /* erro no store */ }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg }]}
    >
      <View style={styles.logoBox}>
        <View style={[styles.logoSquare, { backgroundColor: colors.primary }]}>
          <Text style={styles.logoText}>Care{"\n"}Plus</Text>
        </View>
        <Text style={[styles.welcome, { color: colors.primary }]}>Bem-vindo ao CarePlus Predict</Text>
      </View>

      <View style={[styles.segment, { borderColor: colors.primary }]}>
        <Pressable style={[styles.segmentItem, perfil === "paciente" && { backgroundColor: colors.primary }]} onPress={() => setPerfil("paciente")}>
          <Text style={[styles.segmentText, { color: perfil === "paciente" ? colors.textOnPrimary : colors.primary }]}>Paciente</Text>
        </Pressable>
        <Pressable style={[styles.segmentItem, perfil === "medico" && { backgroundColor: colors.primary }]} onPress={() => setPerfil("medico")}>
          <Text style={[styles.segmentText, { color: perfil === "medico" ? colors.textOnPrimary : colors.primary }]}>Médico</Text>
        </Pressable>
      </View>

      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        placeholder="email" placeholderTextColor={colors.textMuted}
        autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail}
      />
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        placeholder="Senha" placeholderTextColor={colors.textMuted}
        secureTextEntry value={senha} onChangeText={setSenha}
      />

      {erro ? <Text style={[styles.erro, { color: colors.danger }]}>{erro}</Text> : null}

      <Pressable style={[styles.botao, { backgroundColor: colors.primary }]} onPress={entrar} disabled={carregando}>
        {carregando ? <ActivityIndicator color={colors.textOnPrimary} /> : (
          <Text style={[styles.botaoText, { color: colors.textOnPrimary }]}>
            {perfil === "medico" ? "Entrar como Médico" : "Entrar"}
          </Text>
        )}
      </Pressable>

      <Text style={[styles.link, { color: colors.primary }]}>Esqueceu sua senha?</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, justifyContent: "center" },
  logoBox: { alignItems: "center", marginBottom: spacing.xl },
  logoSquare: { width: 80, height: 80, borderRadius: radius.md, alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  logoText: { color: "#fff", fontWeight: font.weight.bold, fontSize: font.size.lg, textAlign: "center" },
  welcome: { fontSize: font.size.xl, fontWeight: font.weight.semibold, textAlign: "center" },
  segment: { flexDirection: "row", borderWidth: 1, borderRadius: radius.md, overflow: "hidden", marginBottom: spacing.lg },
  segmentItem: { flex: 1, paddingVertical: spacing.md, alignItems: "center" },
  segmentText: { fontWeight: font.weight.semibold, fontSize: font.size.md },
  input: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, fontSize: font.size.md, marginBottom: spacing.md },
  erro: { marginBottom: spacing.md, textAlign: "center", fontSize: font.size.sm },
  botao: { borderRadius: radius.md, padding: spacing.md, alignItems: "center", marginTop: spacing.sm },
  botaoText: { fontWeight: font.weight.semibold, fontSize: font.size.md },
  link: { textAlign: "center", marginTop: spacing.lg, fontSize: font.size.sm },
});
