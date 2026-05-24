/**
 * Modal de anamnese: busca o questionario do backend (/anamnese/schema),
 * pre-preenche com as respostas salvas (/anamnese/me), renderiza os campos
 * dinamicamente (com campos condicionais via 'depende') e salva (POST /anamnese).
 */
import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable, TextInput, Modal,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { spacing, radius, font } from "../theme/tokens";
import { apiRequest } from "../api/client";

interface Campo {
  id: string;
  rotulo: string;
  tipo: "texto" | "booleano" | "selecao" | "multipla" | "numero";
  opcoes?: string[];
  obrigatorio?: boolean;
  depende?: { campo: string; valor: boolean };
  placeholder?: string;
}
interface Secao { id: string; titulo: string; campos: Campo[]; }
type Respostas = Record<string, unknown>;

export function AnamneseModal({ visivel, aoFechar }: { visivel: boolean; aoFechar: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [secoes, setSecoes] = useState<Secao[]>([]);
  const [respostas, setRespostas] = useState<Respostas>({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!visivel) return;
    setCarregando(true);
    Promise.all([
      apiRequest<{ versao: string; secoes: Secao[] }>("/anamnese/schema", { auth: true }),
      apiRequest<{ anamnese: { respostas: Respostas } | null }>("/anamnese/me", { auth: true }).catch(() => ({ anamnese: null })),
    ])
      .then(([schema, me]) => {
        setSecoes(schema.secoes);
        setRespostas(me.anamnese?.respostas ?? {});
      })
      .catch(() => Alert.alert("Erro", "Não foi possível carregar o questionário."))
      .finally(() => setCarregando(false));
  }, [visivel]);

  function setResposta(id: string, valor: unknown) {
    setRespostas((r) => ({ ...r, [id]: valor }));
  }

  function campoVisivel(campo: Campo): boolean {
    if (!campo.depende) return true;
    return respostas[campo.depende.campo] === campo.depende.valor;
  }

  async function salvar() {
    setSalvando(true);
    try {
      await apiRequest("/anamnese", { method: "POST", auth: true, body: { respostas } });
      Alert.alert("Pronto", "Sua anamnese foi salva.");
      aoFechar();
    } catch {
      Alert.alert("Erro", "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal visible={visivel} animationType="slide" onRequestClose={aoFechar}>
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        {/* Cabecalho */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitulo, { color: colors.text }]}>Anamnese</Text>
          <Pressable onPress={aoFechar} hitSlop={12}><Ionicons name="close" size={26} color={colors.textMuted} /></Pressable>
        </View>

        {carregando ? (
          <View style={{ flex: 1, justifyContent: "center" }}><ActivityIndicator color={colors.primary} size="large" /></View>
        ) : (
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }} keyboardVerticalOffset={insets.top + 50}>
            <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 100 }} keyboardShouldPersistTaps="handled">
              <Text style={[styles.intro, { color: colors.textMuted }]}>
                Preencha seu histórico clínico. Essas informações ajudam no seu acompanhamento.
              </Text>
              {secoes.map((secao) => (
                <View key={secao.id} style={[styles.secao, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.secaoTitulo, { color: colors.primary }]}>{secao.titulo}</Text>
                  {secao.campos.filter(campoVisivel).map((campo) => (
                    <CampoRender key={campo.id} campo={campo} valor={respostas[campo.id]} onChange={(v) => setResposta(campo.id, v)} colors={colors} />
                  ))}
                </View>
              ))}
            </ScrollView>

            {/* Botao salvar fixo no rodape */}
            <View style={[styles.rodape, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insets.bottom + spacing.sm }]}>
              <Pressable style={[styles.btnSalvar, { backgroundColor: colors.primary }]} onPress={salvar} disabled={salvando}>
                {salvando ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnSalvarTexto}>Salvar anamnese</Text>}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        )}
      </View>
    </Modal>
  );
}

function CampoRender({ campo, valor, onChange, colors }: { campo: Campo; valor: unknown; onChange: (v: unknown) => void; colors: any }) {
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={[styles.rotulo, { color: colors.text }]}>{campo.rotulo}</Text>

      {campo.tipo === "texto" && (
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
          placeholder={campo.placeholder} placeholderTextColor={colors.textMuted}
          value={(valor as string) ?? ""} onChangeText={onChange} multiline
        />
      )}

      {campo.tipo === "numero" && (
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
          placeholder={campo.placeholder} placeholderTextColor={colors.textMuted}
          value={valor != null ? String(valor) : ""} onChangeText={(t) => onChange(t ? Number(t.replace(/[^0-9.]/g, "")) : null)}
          keyboardType="numeric"
        />
      )}

      {campo.tipo === "booleano" && (
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {[["Sim", true], ["Não", false]].map(([txt, val]) => (
            <Pressable key={String(val)} onPress={() => onChange(val)}
              style={[styles.opcao, { borderColor: colors.border }, valor === val && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
              <Text style={{ color: valor === val ? "#fff" : colors.text, fontWeight: font.weight.medium }}>{txt as string}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {campo.tipo === "selecao" && (
        <View style={{ gap: spacing.xs }}>
          {campo.opcoes?.map((op) => (
            <Pressable key={op} onPress={() => onChange(op)}
              style={[styles.opcaoLinha, { borderColor: colors.border }, valor === op && { backgroundColor: colors.surfaceAlt, borderColor: colors.primary }]}>
              <Ionicons name={valor === op ? "radio-button-on" : "radio-button-off"} size={18} color={valor === op ? colors.primary : colors.textMuted} />
              <Text style={{ color: colors.text }}>{op}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {campo.tipo === "multipla" && (
        <View style={{ gap: spacing.xs }}>
          {campo.opcoes?.map((op) => {
            const arr = Array.isArray(valor) ? (valor as string[]) : [];
            const marcado = arr.includes(op);
            return (
              <Pressable key={op} onPress={() => onChange(marcado ? arr.filter((x) => x !== op) : [...arr, op])}
                style={[styles.opcaoLinha, { borderColor: colors.border }, marcado && { backgroundColor: colors.surfaceAlt, borderColor: colors.primary }]}>
                <Ionicons name={marcado ? "checkbox" : "square-outline"} size={18} color={marcado ? colors.primary : colors.textMuted} />
                <Text style={{ color: colors.text }}>{op}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1 },
  headerTitulo: { fontSize: font.size.xl, fontWeight: font.weight.bold },
  intro: { fontSize: font.size.sm, marginBottom: spacing.lg, lineHeight: 20 },
  secao: { borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  secaoTitulo: { fontSize: font.size.lg, fontWeight: font.weight.semibold, marginBottom: spacing.md },
  rotulo: { fontSize: font.size.md, fontWeight: font.weight.medium, marginBottom: spacing.sm },
  input: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, fontSize: font.size.md, minHeight: 44 },
  opcao: { flex: 1, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, alignItems: "center" },
  opcaoLinha: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderWidth: 1, borderRadius: radius.md, padding: spacing.md },
  rodape: { borderTopWidth: 1, padding: spacing.lg },
  btnSalvar: { borderRadius: radius.md, padding: spacing.md, alignItems: "center" },
  btnSalvarTexto: { color: "#fff", fontSize: font.size.md, fontWeight: font.weight.semibold },
});
