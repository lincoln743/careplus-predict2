/**
 * Chat com a IA (BluaDiagnostics via ai-gateway).
 * - Banner de EMERGENCIA quando red_flags vier preenchido.
 * - Indicador "analisando" (a IA pode demorar, ~1min na prescricao).
 * - CORRIGIDO: teclado nao cobre mais o input (KeyboardAvoidingView com offset
 *   por plataforma + safe area; barra de input sempre visivel acima do teclado).
 */
import React, { useState, useRef } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { spacing, radius, font } from "../theme/tokens";
import { apiRequest } from "../api/client";

interface Balao { autor: "eu" | "ia"; texto: string; }
interface ChatResp {
  resposta: string; intent: string | null;
  red_flags: Array<Record<string, unknown>>; thread_id: string;
}

export function ChatScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [baloes, setBaloes] = useState<Balao[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [emergencia, setEmergencia] = useState(false);
  const threadRef = useRef<string | undefined>(undefined);
  const scrollRef = useRef<ScrollView>(null);

  // Offset do teclado. No iOS, precisa compensar a altura da tab bar (~49pt)
  // + a safe area inferior, senao o teclado cobre o input. Android usa "height".
  const TAB_BAR = 49;
  const kbOffset = Platform.OS === "ios" ? TAB_BAR + insets.bottom : 0;

  async function enviar() {
    const msg = texto.trim();
    if (!msg || enviando) return;
    setTexto("");
    setBaloes((b) => [...b, { autor: "eu", texto: msg }]);
    setEnviando(true);
    try {
      const r = await apiRequest<ChatResp>("/ai/chat", {
        method: "POST", auth: true,
        body: { mensagem: msg, threadId: threadRef.current },
      });
      threadRef.current = r.thread_id;
      setBaloes((b) => [...b, { autor: "ia", texto: r.resposta }]);
      if (r.red_flags && r.red_flags.length > 0) setEmergencia(true);
    } catch {
      setBaloes((b) => [...b, { autor: "ia", texto: "Desculpe, houve um erro. Tente novamente." }]);
    } finally {
      setEnviando(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={kbOffset}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {emergencia && (
        <View style={[styles.emergencia, { backgroundColor: colors.danger }]}>
          <Text style={styles.emergenciaTexto}>
            ⚠️ EMERGÊNCIA DETECTADA{"\n"}SAMU 192 · CVV 188 — busque ajuda imediatamente
          </Text>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.mensagens}
        keyboardShouldPersistTaps="handled"
      >
        {baloes.length === 0 && (
          <Text style={[styles.vazio, { color: colors.textMuted }]}>
            Tire dúvidas sobre sua saúde. Este assistente é apoio à decisão, não substitui um médico.
          </Text>
        )}
        {baloes.map((b, i) => (
          <View key={i} style={[
            styles.balao,
            b.autor === "eu"
              ? { backgroundColor: colors.primary, alignSelf: "flex-end" }
              : { backgroundColor: colors.surface, alignSelf: "flex-start" },
          ]}>
            <Text style={{ color: b.autor === "eu" ? colors.textOnPrimary : colors.text, fontSize: font.size.md }}>{b.texto}</Text>
          </View>
        ))}
        {enviando && (
          <View style={[styles.balao, { backgroundColor: colors.surface, alignSelf: "flex-start" }]}>
            <ActivityIndicator color={colors.primary} />
            <Text style={{ color: colors.textMuted, fontSize: font.size.xs, marginTop: 4 }}>
              analisando... pode levar até 1 min
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.barra, { backgroundColor: colors.surface, borderColor: colors.border, paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="Digite sua mensagem..."
          placeholderTextColor={colors.textMuted}
          value={texto}
          onChangeText={setTexto}
          editable={!enviando}
          multiline
          onSubmitEditing={enviar}
          returnKeyType="send"
        />
        <Pressable style={[styles.enviar, { backgroundColor: colors.primary }]} onPress={enviar} disabled={enviando}>
          <Ionicons name="send" size={18} color={colors.textOnPrimary} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  emergencia: { padding: spacing.md },
  emergenciaTexto: { color: "#fff", fontWeight: "800", textAlign: "center", fontSize: font.size.md },
  mensagens: { padding: spacing.md, gap: spacing.sm, flexGrow: 1 },
  vazio: { textAlign: "center", marginTop: spacing.xl, paddingHorizontal: spacing.lg, fontSize: font.size.sm },
  balao: { maxWidth: "82%", padding: spacing.md, borderRadius: radius.md },
  barra: { flexDirection: "row", paddingHorizontal: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, alignItems: "flex-end", gap: spacing.sm },
  input: { flex: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: font.size.md, maxHeight: 100 },
  enviar: { width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
});
